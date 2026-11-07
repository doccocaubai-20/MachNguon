import {
  CreatePersonInput,
  UpdatePersonInput,
  AddRelationshipInput,
  Person,
  RelationshipType,
} from "@/contracts/person.contract";
import { DatabaseExecutor, WorkspaceService } from "./workspace.service";
import { assertPermission } from "./permissions";

export interface RelatedPersonView {
  relationshipId: string;
  relationshipType: RelationshipType;
  notes: string | null;
  relatedPersonId: string;
  fullName: string;
  nickName: string | null;
  gender: string | null;
  birthDate: string | null;
  avatarUrl: string | null;
}

export class PersonService {
  private workspaceService: WorkspaceService;

  constructor(private db: DatabaseExecutor) {
    this.workspaceService = new WorkspaceService(db);
  }

  /**
   * Tạo hồ sơ người thân trong kho gia đình
   */
  async createPerson(userId: string, input: CreatePersonInput): Promise<Person> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, input.workspace_id);
    assertPermission(currentMember.role, "story:propose");

    const res = await this.db.query<Person>(
      `INSERT INTO persons (
        workspace_id, full_name, nick_name, gender, birth_date, death_date, bio, avatar_url, linked_user_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.workspace_id,
        input.full_name,
        input.nick_name || null,
        input.gender || null,
        input.birth_date || null,
        input.death_date || null,
        input.bio || null,
        input.avatar_url || null,
        input.linked_user_id || null,
      ]
    );

    const person = res.rows[0];

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'PERSON_CREATED', 'person', $3, $4)`,
      [input.workspace_id, userId, person.id, JSON.stringify({ full_name: person.full_name })]
    );

    return person;
  }

  /**
   * Lấy chi tiết hồ sơ người thân kèm các mối quan hệ gia đình
   */
  async getPerson(
    userId: string,
    workspaceId: string,
    personId: string
  ): Promise<{ person: Person; relationships: RelatedPersonView[] }> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    const personRes = await this.db.query<Person>(
      `SELECT * FROM persons WHERE id = $1 AND workspace_id = $2`,
      [personId, workspaceId]
    );

    if (personRes.rows.length === 0) {
      throw new Error("Không tìm thấy hồ sơ người thân.");
    }

    const relRes = await this.db.query<{
      relationship_id: string;
      relationship_type: RelationshipType;
      notes: string | null;
      related_person_id: string;
      full_name: string;
      nick_name: string | null;
      gender: string | null;
      birth_date: string | null;
      avatar_url: string | null;
    }>(
      `SELECT 
        r.id AS relationship_id,
        r.relationship_type,
        r.notes,
        p.id AS related_person_id,
        p.full_name,
        p.nick_name,
        p.gender,
        p.birth_date,
        p.avatar_url
       FROM person_relationships r
       JOIN persons p ON p.id = r.related_person_id
       WHERE r.person_id = $1 AND r.workspace_id = $2
       ORDER BY r.created_at ASC`,
      [personId, workspaceId]
    );

    const relationships: RelatedPersonView[] = relRes.rows.map((r) => ({
      relationshipId: r.relationship_id,
      relationshipType: r.relationship_type,
      notes: r.notes,
      relatedPersonId: r.related_person_id,
      fullName: r.full_name,
      nickName: r.nick_name,
      gender: r.gender,
      birthDate: r.birth_date,
      avatarUrl: r.avatar_url,
    }));

    return { person: personRes.rows[0], relationships };
  }

  /**
   * Lấy toàn bộ ngữ cảnh tri thức gắn liền với người thân:
   * - Tư liệu gốc (ghi âm, ảnh)
   * - Câu chuyện có nguồn
   * - Sự kiện dòng thời gian
   * - Kỹ năng & Cẩm nang thực hành thực tế
   */
  async getPersonKnowledgeContext(
    userId: string,
    workspaceId: string,
    personId: string
  ): Promise<{
    person: Person;
    relationships: RelatedPersonView[];
    assets: Array<{ id: string; title: string; asset_type: string; duration_seconds: number | null }>;
    stories: Array<{ id: string; title: string; status: string; summary: string | null }>;
    events: Array<{ id: string; title: string; year: number; date_display: string; role_description: string | null }>;
    skills: Array<{ id: string; name: string; description: string | null }>;
    manuals: Array<{ id: string; title: string; summary: string | null; status: string }>;
    stats: {
      assetsCount: number;
      storiesCount: number;
      eventsCount: number;
      skillsCount: number;
      manualsCount: number;
    };
  }> {
    const { person, relationships } = await this.getPerson(userId, workspaceId, personId);

    // 1. Tư liệu do người này kể/gắn liền
    const assetsRes = await this.db.query<any>(
      `SELECT id, title, asset_type, duration_seconds
       FROM assets
       WHERE narrator_id = $1 AND workspace_id = $2 AND status = 'ready'
         AND (shared_with_family OR uploaded_by = $3)
       ORDER BY created_at DESC`,
      [personId, workspaceId, userId]
    );

    // 2. Câu chuyện do người này kể
    const storiesRes = await this.db.query<any>(
      `SELECT id, title, status, summary
       FROM stories
       WHERE narrator_id = $1 AND workspace_id = $2
       ORDER BY created_at DESC`,
      [personId, workspaceId]
    );

    // 3. Sự kiện dòng thời gian có mặt người này
    const eventsRes = await this.db.query<any>(
      `SELECT e.id, e.title, e.year, e.date_display, ep.role_description
       FROM timeline_events e
       JOIN timeline_event_persons ep ON e.id = ep.event_id
       WHERE ep.person_id = $1 AND e.workspace_id = $2
       ORDER BY e.year ASC`,
      [personId, workspaceId]
    );

    // 4. Kỹ năng được xác nhận gắn liền trong bản đồ tri thức
    const skillsRes = await this.db.query<any>(
      `SELECT DISTINCT ge.id, ge.name, ge.description
       FROM graph_entities ge
       JOIN graph_claims gc ON gc.target_entity_id = ge.id
       JOIN graph_entities pe ON gc.source_entity_id = pe.id
       JOIN persons p ON p.workspace_id = pe.workspace_id AND LOWER(p.full_name) = LOWER(pe.name)
       WHERE p.id = $1 AND pe.workspace_id = $2 AND ge.entity_type = 'skill' AND gc.status = 'confirmed'`,
      [personId, workspaceId]
    );

    // 5. Cẩm nang liên quan
    const manualsRes = await this.db.query<any>(
      `SELECT m.id, m.title, m.summary, m.status
       FROM practice_manuals m
       WHERE m.workspace_id = $2
         AND (
           m.skill_entity_id IN (
             SELECT ge.id FROM graph_entities ge
             JOIN graph_claims gc ON gc.target_entity_id = ge.id
             JOIN graph_entities pe ON gc.source_entity_id = pe.id
             JOIN persons p ON p.workspace_id = pe.workspace_id AND LOWER(p.full_name) = LOWER(pe.name)
             WHERE p.id = $1 AND gc.status = 'confirmed'
           )
         )
       ORDER BY m.created_at DESC`,
      [personId, workspaceId]
    );

    return {
      person,
      relationships,
      assets: assetsRes.rows,
      stories: storiesRes.rows,
      events: eventsRes.rows,
      skills: skillsRes.rows,
      manuals: manualsRes.rows,
      stats: {
        assetsCount: assetsRes.rows.length,
        storiesCount: storiesRes.rows.length,
        eventsCount: eventsRes.rows.length,
        skillsCount: skillsRes.rows.length,
        manualsCount: manualsRes.rows.length,
      },
    };
  }

  /**
   * Danh sách tất cả người thân trong kho gia đình
   */
  async listPersons(userId: string, workspaceId: string): Promise<Person[]> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    const res = await this.db.query<Person>(
      `SELECT * FROM persons
       WHERE workspace_id = $1
       ORDER BY created_at ASC`,
      [workspaceId]
    );

    return res.rows;
  }

  /**
   * Cập nhật thông tin hồ sơ người thân
   */
  async updatePerson(userId: string, input: UpdatePersonInput): Promise<Person> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, input.workspace_id);
    assertPermission(currentMember.role, "story:propose");

    const existingRes = await this.db.query<Person>(
      `SELECT * FROM persons WHERE id = $1 AND workspace_id = $2`,
      [input.person_id, input.workspace_id]
    );
    if (existingRes.rows.length === 0) {
      throw new Error("Không tìm thấy hồ sơ để cập nhật.");
    }

    const current = existingRes.rows[0];

    const res = await this.db.query<Person>(
      `UPDATE persons
       SET full_name = COALESCE($1, full_name),
           nick_name = COALESCE($2, nick_name),
           gender = COALESCE($3, gender),
           birth_date = COALESCE($4, birth_date),
           death_date = COALESCE($5, death_date),
           bio = COALESCE($6, bio),
           avatar_url = COALESCE($7, avatar_url),
           linked_user_id = COALESCE($8, linked_user_id),
           updated_at = NOW()
       WHERE id = $9 AND workspace_id = $10
       RETURNING *`,
      [
        input.full_name ?? null,
        input.nick_name ?? null,
        input.gender ?? null,
        input.birth_date ?? null,
        input.death_date ?? null,
        input.bio ?? null,
        input.avatar_url ?? null,
        input.linked_user_id ?? null,
        input.person_id,
        input.workspace_id,
      ]
    );

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'PERSON_UPDATED', 'person', $3, $4)`,
      [input.workspace_id, userId, input.person_id, JSON.stringify({ old_name: current.full_name })]
    );

    return res.rows[0];
  }

  /**
   * Xóa hồ sơ người thân (Chỉ Admin mới có quyền)
   */
  async deletePerson(userId: string, workspaceId: string, personId: string): Promise<void> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "member:revoke");

    await this.db.query(
      `DELETE FROM persons WHERE id = $1 AND workspace_id = $2`,
      [personId, workspaceId]
    );

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'PERSON_DELETED', 'person', $3, '{}'::jsonb)`,
      [workspaceId, userId, personId]
    );
  }

  /**
   * Thiết lập quan hệ gia đình 2 chiều giữa 2 người thân trong cùng một kho
   */
  async addRelationship(userId: string, input: AddRelationshipInput): Promise<void> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, input.workspace_id);
    assertPermission(currentMember.role, "story:propose");

    if (input.person_id === input.related_person_id) {
      throw new Error("Không thể tạo quan hệ gia đình với chính mình.");
    }

    // Xác nhận cả 2 người đều thuộc cùng workspace
    const checkRes = await this.db.query<{ id: string }>(
      `SELECT id FROM persons WHERE workspace_id = $1 AND id IN ($2, $3)`,
      [input.workspace_id, input.person_id, input.related_person_id]
    );
    if (checkRes.rows.length < 2) {
      throw new Error("Người thân không thuộc cùng kho gia đình.");
    }

    // 1. Thêm chiều thuận: person_id -> related_person_id
    await this.db.query(
      `INSERT INTO person_relationships (workspace_id, person_id, related_person_id, relationship_type, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (person_id, related_person_id, relationship_type)
       DO UPDATE SET notes = EXCLUDED.notes`,
      [input.workspace_id, input.person_id, input.related_person_id, input.relationship_type, input.notes || null]
    );

    // 2. Thêm chiều nghịch tương ứng
    const reciprocalType = this.getReciprocalType(input.relationship_type);
    if (reciprocalType) {
      await this.db.query(
        `INSERT INTO person_relationships (workspace_id, person_id, related_person_id, relationship_type, notes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (person_id, related_person_id, relationship_type)
         DO UPDATE SET notes = EXCLUDED.notes`,
        [input.workspace_id, input.related_person_id, input.person_id, reciprocalType, input.notes || null]
      );
    }

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'RELATIONSHIP_ADDED', 'person_relationship', $3, $4)`,
      [
        input.workspace_id,
        userId,
        input.person_id,
        JSON.stringify({
          related_person_id: input.related_person_id,
          relationship_type: input.relationship_type,
        }),
      ]
    );
  }

  /**
   * Xóa quan hệ gia đình
   */
  async deleteRelationship(userId: string, workspaceId: string, relationshipId: string): Promise<void> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "story:propose");

    // Lấy thông tin quan hệ để xóa cả 2 chiều
    const relRes = await this.db.query<{
      person_id: string;
      related_person_id: string;
      relationship_type: RelationshipType;
    }>(
      `SELECT person_id, related_person_id, relationship_type
       FROM person_relationships WHERE id = $1 AND workspace_id = $2`,
      [relationshipId, workspaceId]
    );

    if (relRes.rows.length === 0) {
      return;
    }

    const { person_id, related_person_id, relationship_type } = relRes.rows[0];
    const reciprocalType = this.getReciprocalType(relationship_type);

    await this.db.query(
      `DELETE FROM person_relationships WHERE id = $1 AND workspace_id = $2`,
      [relationshipId, workspaceId]
    );

    if (reciprocalType) {
      await this.db.query(
        `DELETE FROM person_relationships
         WHERE workspace_id = $1 AND person_id = $2 AND related_person_id = $3 AND relationship_type = $4`,
        [workspaceId, related_person_id, person_id, reciprocalType]
      );
    }
  }

  private getReciprocalType(type: RelationshipType): RelationshipType | null {
    switch (type) {
      case "parent":
        return "child";
      case "child":
        return "parent";
      case "spouse":
        return "spouse";
      case "sibling":
        return "sibling";
      case "grandparent":
        return "grandchild";
      case "grandchild":
        return "grandparent";
      case "relative":
        return "relative";
      default:
        return null;
    }
  }
}
