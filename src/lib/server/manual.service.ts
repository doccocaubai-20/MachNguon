import {
  CreatePracticeManualDto,
  CreatePracticeManualSchema,
  AddPracticeNoteDto,
  AddPracticeNoteSchema,
  AnswerPracticeNoteDto,
  AnswerPracticeNoteSchema,
  ManualStatus,
  PracticeManual,
  PracticeNote,
} from "@/contracts/manual.contract";
import { DatabaseExecutor, WorkspaceService } from "./workspace.service";
import { assertPermission } from "./permissions";

export interface PracticeManualDetail extends PracticeManual {
  author_name?: string;
  approver_name?: string | null;
  cover_file_path?: string | null;
  skill_name?: string | null;
}

export class ManualService {
  private workspaceService: WorkspaceService;

  constructor(private db: DatabaseExecutor) {
    this.workspaceService = new WorkspaceService(db);
  }

  /**
   * Tạo cẩm nang thực hành mới
   */
  async createManual(
    userId: string,
    workspaceId: string,
    input: CreatePracticeManualDto
  ): Promise<PracticeManualDetail> {
    const validated = CreatePracticeManualSchema.parse(input);
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "manual:create");

    // Xác minh skill_entity_id thuộc cùng kho
    if (validated.skill_entity_id) {
      const sCheck = await this.db.query(
        `SELECT id FROM graph_entities WHERE id = $1 AND workspace_id = $2`,
        [validated.skill_entity_id, workspaceId]
      );
      if (sCheck.rows.length === 0) {
        throw new Error("Kỹ năng liên kết không thuộc kho gia đình này hoặc không tồn tại.");
      }
    }

    // Xác minh cover_asset_id thuộc cùng kho
    if (validated.cover_asset_id) {
      const cCheck = await this.db.query(
        `SELECT id FROM assets WHERE id = $1 AND workspace_id = $2 AND status = 'ready' AND shared_with_family`,
        [validated.cover_asset_id, workspaceId]
      );
      if (cCheck.rows.length === 0) {
        throw new Error("Ảnh bìa tư liệu không thuộc kho gia đình này hoặc không tồn tại.");
      }
    }

    // Xác minh bằng chứng trong từng bước thuộc cùng kho
    for (const step of validated.steps) {
      if (step.evidence_asset_id) {
        const eCheck = await this.db.query(
          `SELECT id FROM assets WHERE id = $1 AND workspace_id = $2 AND status = 'ready' AND shared_with_family`,
          [step.evidence_asset_id, workspaceId]
        );
        if (eCheck.rows.length === 0) {
          throw new Error(`Tư liệu bằng chứng ở bước ${step.step_number} không thuộc kho gia đình này hoặc không tồn tại.`);
        }
      }
    }

    // Khóa cứng trạng thái khởi tạo luôn là pending_approval, không tin client
    const res = await this.db.query<any>(
      `INSERT INTO practice_manuals (
        workspace_id, skill_entity_id, title, summary, cover_asset_id,
        status, version_number, ingredients, steps, created_by
       ) VALUES ($1, $2, $3, $4, $5, 'pending_approval', 1, $6, $7, $8)
       RETURNING *`,
      [
        workspaceId,
        validated.skill_entity_id || null,
        validated.title,
        validated.summary || null,
        validated.cover_asset_id || null,
        JSON.stringify(validated.ingredients || []),
        JSON.stringify(validated.steps || []),
        userId,
      ]
    );

    const manual = res.rows[0];

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'MANUAL_CREATED', 'practice_manual', $3, $4)`,
      [workspaceId, userId, manual.id, JSON.stringify({ title: manual.title })]
    );

    const detail = await this.getManual(userId, workspaceId, manual.id);
    return detail!;
  }

  /**
   * Cập nhật cẩm nang: nếu đã duyệt thì tạo phiên bản mới chờ duyệt lại
   */
  async updateManual(
    userId: string,
    workspaceId: string,
    manualId: string,
    input: Partial<CreatePracticeManualDto>
  ): Promise<PracticeManualDetail> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "manual:create");

    const existingRes = await this.db.query<any>(
      `SELECT * FROM practice_manuals WHERE id = $1 AND workspace_id = $2`,
      [manualId, workspaceId]
    );

    if (existingRes.rows.length === 0) {
      throw new Error("Không tìm thấy cẩm nang cần cập nhật.");
    }

    const existing = existingRes.rows[0];
    if (currentMember.role !== "admin" && existing.created_by !== userId) {
      throw new Error("Từ chối quyền: Bạn chỉ có thể sửa cẩm nang do chính mình tạo.");
    }

    const sourceIds = [input.cover_asset_id, ...(input.steps ?? []).map((step) => step.evidence_asset_id)];
    for (const assetId of new Set(sourceIds.filter(Boolean))) {
      const { rows } = await this.db.query(
        "SELECT id FROM assets WHERE id = $1 AND workspace_id = $2 AND status = 'ready' AND shared_with_family",
        [assetId, workspaceId]
      );
      if (!rows.length) throw new Error("Chọn tư liệu đã chia sẻ trong kho này.");
    }
    if (input.skill_entity_id) {
      const { rows } = await this.db.query(
        "SELECT id FROM graph_entities WHERE id = $1 AND workspace_id = $2",
        [input.skill_entity_id, workspaceId]
      );
      if (!rows.length) throw new Error("Kỹ năng không thuộc kho này.");
    }

    const wasApproved = existing.status === "approved";
    const newVersion = wasApproved ? existing.version_number + 1 : existing.version_number;
    const newStatus = wasApproved ? "pending_approval" : existing.status;

    await this.db.query(
      `UPDATE practice_manuals
       SET title = COALESCE($1, title),
           summary = COALESCE($2, summary),
           ingredients = COALESCE($3, ingredients),
           steps = COALESCE($4, steps),
           skill_entity_id = COALESCE($5, skill_entity_id),
           cover_asset_id = COALESCE($6, cover_asset_id),
           version_number = $7,
           status = $8,
           approved_by = CASE WHEN $8 = 'approved' THEN approved_by ELSE NULL END,
           approved_at = CASE WHEN $8 = 'approved' THEN approved_at ELSE NULL END,
           updated_at = NOW()
       WHERE id = $9 AND workspace_id = $10`,
      [
        input.title ?? null,
        input.summary ?? null,
        input.ingredients ? JSON.stringify(input.ingredients) : null,
        input.steps ? JSON.stringify(input.steps) : null,
        input.skill_entity_id ?? null,
        input.cover_asset_id ?? null,
        newVersion,
        newStatus,
        manualId,
        workspaceId,
      ]
    );

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'MANUAL_UPDATED', 'practice_manual', $3, $4)`,
      [workspaceId, userId, manualId, JSON.stringify({ version: newVersion, status: newStatus })]
    );

    const detail = await this.getManual(userId, workspaceId, manualId);
    return detail!;
  }

  /**
   * Phê duyệt cẩm nang thực hành (Chỉ Người kể hoặc Admin)
   * Đồng thời lưu bản sao snapshot vào bảng practice_manual_versions
   */
  async approveManual(
    userId: string,
    workspaceId: string,
    manualId: string
  ): Promise<PracticeManualDetail> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "manual:approve");

    const res = await this.db.query<any>(
      `UPDATE practice_manuals
       SET status = 'approved',
           approved_by = $1,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND workspace_id = $3
       RETURNING *`,
      [userId, manualId, workspaceId]
    );

    if (res.rows.length === 0) {
      throw new Error("Cẩm nang thực hành không tồn tại trong kho.");
    }

    const manual = res.rows[0];

    // Lưu snapshot vào practice_manual_versions
    await this.db.query(
      `INSERT INTO practice_manual_versions (
        manual_id, version_number, title, summary, ingredients, steps, approved_by, approved_at, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
       ON CONFLICT (manual_id, version_number)
       DO UPDATE SET
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         ingredients = EXCLUDED.ingredients,
         steps = EXCLUDED.steps,
         approved_by = EXCLUDED.approved_by,
         approved_at = EXCLUDED.approved_at`,
      [
        manualId,
        manual.version_number,
        manual.title,
        manual.summary,
        JSON.stringify(manual.ingredients),
        JSON.stringify(manual.steps),
        userId,
        manual.created_by,
      ]
    );

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'MANUAL_APPROVED', 'practice_manual', $3, $4)`,
      [workspaceId, userId, manualId, JSON.stringify({ title: res.rows[0].title, version: manual.version_number })]
    );

    const detail = await this.getManual(userId, workspaceId, manualId);
    return detail!;
  }

  /**
   * Lấy chi tiết cẩm nang kèm các ghi chú / câu hỏi thực hành
   */
  async getManual(
    userId: string,
    workspaceId: string,
    manualId: string
  ): Promise<PracticeManualDetail | null> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);

    const res = await this.db.query<any>(
      `SELECT m.*,
              p.full_name as author_name,
              appr.full_name as approver_name,
              a.file_path as cover_file_path,
              ge.name as skill_name
       FROM practice_manuals m
       LEFT JOIN profiles p ON m.created_by = p.id
       LEFT JOIN profiles appr ON m.approved_by = appr.id
       LEFT JOIN assets a ON m.cover_asset_id = a.id
       LEFT JOIN graph_entities ge ON m.skill_entity_id = ge.id
       WHERE m.id = $1 AND m.workspace_id = $2`,
      [manualId, workspaceId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    let manual = res.rows[0];

    // Đối với người xem (viewer), nếu cẩm nang đang chờ duyệt bản mới nhưng có bản cũ đã duyệt
    if (currentMember.role === "viewer" && manual.status !== "approved") {
      const verRes = await this.db.query<any>(
        `SELECT * FROM practice_manual_versions WHERE manual_id = $1 ORDER BY version_number DESC LIMIT 1`,
        [manualId]
      );
      if (verRes.rows.length === 0) {
        throw new Error("Truy cập bị từ chối: Cẩm nang thực hành đang chờ phê duyệt.");
      }
      const prev = verRes.rows[0];
      manual = {
        ...manual,
        title: prev.title,
        summary: prev.summary,
        ingredients: typeof prev.ingredients === "string" ? JSON.parse(prev.ingredients) : prev.ingredients,
        steps: typeof prev.steps === "string" ? JSON.parse(prev.steps) : prev.steps,
        version_number: prev.version_number,
        status: "approved",
      };
    }

    // Lấy danh sách ghi chú / câu hỏi thực hành
    const notesRes = await this.db.query<any>(
      `SELECT n.*,
              u.full_name as author_name,
              ans.full_name as answered_by_name
       FROM manual_practice_notes n
       JOIN profiles u ON n.user_id = u.id
       LEFT JOIN profiles ans ON n.answered_by = ans.id
       WHERE n.manual_id = $1 AND n.workspace_id = $2
       ORDER BY n.created_at ASC`,
      [manualId, workspaceId]
    );

    return {
      ...manual,
      version_number: Number(manual.version_number),
      ingredients: typeof manual.ingredients === "string" ? JSON.parse(manual.ingredients) : manual.ingredients,
      steps: typeof manual.steps === "string" ? JSON.parse(manual.steps) : manual.steps,
      notes: notesRes.rows,
    };
  }

  /**
   * Danh sách cẩm nang trong kho
   */
  async listManuals(
    userId: string,
    workspaceId: string,
    statusFilter?: ManualStatus
  ): Promise<PracticeManualDetail[]> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);

    const conditions: string[] = ["m.workspace_id = $1"];
    if (currentMember.role === "viewer") conditions.push("m.status = 'approved'");
    const params: any[] = [workspaceId];

    if (statusFilter) {
      params.push(statusFilter);
      conditions.push(`m.status = $${params.length}`);
    }

    const res = await this.db.query<any>(
      `SELECT m.*,
              p.full_name as author_name,
              appr.full_name as approver_name,
              a.file_path as cover_file_path,
              ge.name as skill_name
       FROM practice_manuals m
       LEFT JOIN profiles p ON m.created_by = p.id
       LEFT JOIN profiles appr ON m.approved_by = appr.id
       LEFT JOIN assets a ON m.cover_asset_id = a.id
       LEFT JOIN graph_entities ge ON m.skill_entity_id = ge.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY m.created_at DESC`,
      params
    );

    return res.rows.map((manual) => ({
      ...manual,
      version_number: Number(manual.version_number),
      ingredients: typeof manual.ingredients === "string" ? JSON.parse(manual.ingredients) : manual.ingredients,
      steps: typeof manual.steps === "string" ? JSON.parse(manual.steps) : manual.steps,
    }));
  }

  /**
   * Gửi thắc mắc / câu hỏi khi thực hành (Viewer, Contributor đều gửi được)
   */
  async addPracticeNote(
    userId: string,
    workspaceId: string,
    input: AddPracticeNoteDto
  ): Promise<PracticeNote> {
    const validated = AddPracticeNoteSchema.parse(input);
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "manual:note");
    if (!(await this.getManual(userId, workspaceId, validated.manual_id))) {
      throw new Error("Không tìm thấy cẩm nang trong kho.");
    }

    const res = await this.db.query<any>(
      `INSERT INTO manual_practice_notes (workspace_id, manual_id, user_id, question)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [workspaceId, validated.manual_id, userId, validated.question]
    );

    const note = res.rows[0];

    const userRes = await this.db.query<any>(`SELECT full_name FROM profiles WHERE id = $1`, [userId]);
    const authorName = userRes.rows[0]?.full_name || "Thành viên";

    return {
      ...note,
      author_name: authorName,
      answered_by_name: null,
    };
  }

  /**
   * Trả lời thắc mắc thực hành (Chỉ Narrator hoặc Admin)
   */
  async answerPracticeNote(
    userId: string,
    workspaceId: string,
    input: AnswerPracticeNoteDto
  ): Promise<PracticeNote> {
    const validated = AnswerPracticeNoteSchema.parse(input);
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "manual:answer");

    const res = await this.db.query<any>(
      `UPDATE manual_practice_notes
       SET answer = $1,
           answered_by = $2,
           answered_at = NOW()
       WHERE id = $3 AND workspace_id = $4
       RETURNING *`,
      [validated.answer, userId, validated.note_id, workspaceId]
    );

    if (res.rows.length === 0) {
      throw new Error("Câu hỏi thực hành không tồn tại trong kho.");
    }

    const note = res.rows[0];
    const userRes = await this.db.query<any>(`SELECT full_name FROM profiles WHERE id = $1`, [note.user_id]);
    const ansRes = await this.db.query<any>(`SELECT full_name FROM profiles WHERE id = $1`, [userId]);

    return {
      ...note,
      author_name: userRes.rows[0]?.full_name || "Người hỏi",
      answered_by_name: ansRes.rows[0]?.full_name || "Người giải đáp",
    };
  }

  /**
   * Xóa cẩm nang thực hành
   */
  async deleteManual(userId: string, workspaceId: string, manualId: string): Promise<void> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);

    const existingRes = await this.db.query<any>(
      `SELECT * FROM practice_manuals WHERE id = $1 AND workspace_id = $2`,
      [manualId, workspaceId]
    );

    if (existingRes.rows.length === 0) {
      throw new Error("Cẩm nang thực hành không tồn tại.");
    }

    const existing = existingRes.rows[0];
    if (currentMember.role !== "admin" && existing.created_by !== userId) {
      throw new Error("Từ chối quyền: Bạn không có quyền xóa cẩm nang này.");
    }

    await this.db.query(`DELETE FROM practice_manuals WHERE id = $1 AND workspace_id = $2`, [
      manualId,
      workspaceId,
    ]);

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'MANUAL_DELETED', 'practice_manual', $3, $4)`,
      [workspaceId, userId, manualId, JSON.stringify({ title: existing.title })]
    );
  }
}
