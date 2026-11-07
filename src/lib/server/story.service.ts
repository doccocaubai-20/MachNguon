import {
  CreateStoryInput,
  AddEvidenceRefInput,
  Story,
  StoryStatus,
  TranscriptSegment,
  StoryEvidenceRef,
  StoryDetailView,
} from "@/contracts/story.contract";
import { DatabaseExecutor, WorkspaceService } from "./workspace.service";
import { assertPermission } from "./permissions";

export type { StoryDetailView };

export class StoryService {
  private workspaceService: WorkspaceService;

  constructor(private db: DatabaseExecutor) {
    this.workspaceService = new WorkspaceService(db);
  }

  /**
   * Tạo câu chuyện có nguồn
   */
  async createStory(userId: string, input: CreateStoryInput): Promise<Story> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, input.workspace_id);
    assertPermission(currentMember.role, "story:propose");

    // Xác minh người kể chuyện thuộc cùng kho
    if (input.narrator_id) {
      const pCheck = await this.db.query(
        `SELECT id FROM persons WHERE id = $1 AND workspace_id = $2`,
        [input.narrator_id, input.workspace_id]
      );
      if (pCheck.rows.length === 0) {
        throw new Error("Người kể chuyện được chọn không thuộc kho gia đình này hoặc không tồn tại.");
      }
    }

    // Xác minh tư liệu gốc thuộc cùng kho
    if (input.primary_asset_id) {
      const aCheck = await this.db.query(
        `SELECT id FROM assets WHERE id = $1 AND workspace_id = $2 AND status = 'ready' AND shared_with_family`,
        [input.primary_asset_id, input.workspace_id]
      );
      if (aCheck.rows.length === 0) {
        throw new Error("Tư liệu gốc được chọn không thuộc kho gia đình này hoặc không tồn tại.");
      }
    }

    const res = await this.db.query<Story>(
      `INSERT INTO stories (
        workspace_id, narrator_id, primary_asset_id, title, summary,
        content, category, status, version_number, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9)
       RETURNING *`,
      [
        input.workspace_id,
        input.narrator_id || null,
        input.primary_asset_id || null,
        input.title,
        input.summary || null,
        input.content,
        input.category || "general",
        input.status || "pending_approval",
        userId,
      ]
    );

    const story = res.rows[0];

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'STORY_CREATED', 'story', $3, $4)`,
      [input.workspace_id, userId, story.id, JSON.stringify({ title: story.title })]
    );

    return story;
  }

  /**
   * Lấy chi tiết câu chuyện kèm các đoạn bằng chứng và trích dẫn gốc
   */
  async getStory(userId: string, workspaceId: string, storyId: string): Promise<StoryDetailView> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);

    const storyRes = await this.db.query<any>(
      `SELECT s.*, p.full_name AS narrator_name, up.full_name AS author_name,
              a.title AS primary_asset_title, a.file_path AS primary_asset_path
       FROM stories s
       LEFT JOIN persons p ON p.id = s.narrator_id
       LEFT JOIN assets a ON a.id = s.primary_asset_id AND a.workspace_id = s.workspace_id AND a.shared_with_family
       JOIN profiles up ON up.id = s.created_by
       WHERE s.id = $1 AND s.workspace_id = $2`,
      [storyId, workspaceId]
    );

    if (storyRes.rows.length === 0) {
      throw new Error("Không tìm thấy câu chuyện.");
    }

    let story = storyRes.rows[0];
    let snapshotEvidenceIds: string[] | null = null;

    // Đối với người xem (viewer), nếu câu chuyện đang chờ duyệt bản mới nhưng có bản cũ đã duyệt
    if (currentMember.role === "viewer" && story.status !== "approved") {
      const verRes = await this.db.query<any>(
        `SELECT * FROM story_versions WHERE story_id = $1 ORDER BY version_number DESC LIMIT 1`,
        [storyId]
      );
      if (verRes.rows.length === 0) {
        throw new Error("Truy cập bị từ chối: Bản thảo câu chuyện đang chờ phê duyệt.");
      }
      const prev = verRes.rows[0];
      const refs = typeof prev.evidence_refs === "string" ? JSON.parse(prev.evidence_refs) : prev.evidence_refs;
      snapshotEvidenceIds = Array.isArray(refs) ? refs.map((ref) => ref.id) : [];
      story = {
        ...story,
        title: prev.title,
        summary: prev.summary,
        content: prev.content,
        version_number: prev.version_number,
        status: "approved",
      };
    }

    // Lấy danh sách bằng chứng liên kết (chỉ lấy tài liệu còn tồn tại và ready)
    const evidenceRes = await this.db.query<any>(
      `SELECT e.*, a.title AS asset_title, a.file_path AS asset_path
       FROM story_evidence_refs e
       JOIN assets a ON a.id = e.asset_id
       WHERE e.story_id = $1 AND a.status = 'ready' AND a.workspace_id = $2 AND a.shared_with_family
         AND ($3::uuid[] IS NULL OR e.id = ANY($3::uuid[]))
       ORDER BY e.start_time_seconds ASC NULLS LAST`,
      [storyId, workspaceId, snapshotEvidenceIds]
    );

    return {
      ...story,
      evidence_refs: evidenceRes.rows,
    };
  }

  /**
   * Danh sách câu chuyện trong kho
   */
  async listStories(
    userId: string,
    workspaceId: string,
    filter?: { category?: string; status?: StoryStatus }
  ): Promise<StoryDetailView[]> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);

    let query = `
      SELECT s.*, p.full_name AS narrator_name, up.full_name AS author_name,
             a.title AS primary_asset_title, a.file_path AS primary_asset_path,
             COALESCE(
               (SELECT json_agg(e.*) FROM story_evidence_refs e WHERE e.story_id = s.id),
               '[]'::json
             ) AS evidence_refs
      FROM stories s
      LEFT JOIN persons p ON p.id = s.narrator_id
      LEFT JOIN assets a ON a.id = s.primary_asset_id AND a.workspace_id = s.workspace_id AND a.shared_with_family
      JOIN profiles up ON up.id = s.created_by
      WHERE s.workspace_id = $1
    `;
    const params: any[] = [workspaceId];
    let paramIndex = 2;
    if (currentMember.role === "viewer") query += " AND s.status = 'approved'";

    if (filter?.category) {
      query += ` AND s.category = $${paramIndex++}`;
      params.push(filter.category);
    }

    if (filter?.status) {
      query += ` AND s.status = $${paramIndex++}`;
      params.push(filter.status);
    }

    query += ` ORDER BY s.created_at DESC`;

    const res = await this.db.query<StoryDetailView>(query, params);
    return res.rows;
  }

  /**
   * Chỉnh sửa câu chuyện: nếu câu chuyện đã từng duyệt thì tạo bản nháp mới (version + 1, pending_approval)
   */
  async updateStory(
    userId: string,
    workspaceId: string,
    storyId: string,
    input: {
      title?: string;
      summary?: string | null;
      content?: string;
      category?: string;
      narrator_id?: string | null;
      primary_asset_id?: string | null;
    }
  ): Promise<Story> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "story:edit");

    const existingRes = await this.db.query<Story>(
      `SELECT * FROM stories WHERE id = $1 AND workspace_id = $2`,
      [storyId, workspaceId]
    );

    if (existingRes.rows.length === 0) {
      throw new Error("Không tìm thấy câu chuyện.");
    }

    const existing = existingRes.rows[0];
    if (currentMember.role !== "admin" && existing.created_by !== userId) {
      throw new Error("Từ chối quyền: Bạn chỉ có thể sửa câu chuyện do chính mình tạo.");
    }

    if (input.narrator_id) {
      const { rows } = await this.db.query("SELECT id FROM persons WHERE id = $1 AND workspace_id = $2", [input.narrator_id, workspaceId]);
      if (!rows.length) throw new Error("Người kể không thuộc kho này.");
    }
    if (input.primary_asset_id) {
      const { rows } = await this.db.query(
        "SELECT id FROM assets WHERE id = $1 AND workspace_id = $2 AND status = 'ready' AND shared_with_family",
        [input.primary_asset_id, workspaceId]
      );
      if (!rows.length) throw new Error("Chọn tư liệu đã chia sẻ trong kho này.");
    }

    // Nếu sửa sau khi đã duyệt: tạo version mới và đưa về pending_approval
    const wasApproved = existing.status === "approved";
    const newVersion = wasApproved ? existing.version_number + 1 : existing.version_number;
    const newStatus = wasApproved ? "pending_approval" : existing.status;

    const res = await this.db.query<Story>(
      `UPDATE stories
       SET title = COALESCE($1, title),
           summary = COALESCE($2, summary),
           content = COALESCE($3, content),
           category = COALESCE($4, category),
           narrator_id = COALESCE($5, narrator_id),
           primary_asset_id = COALESCE($6, primary_asset_id),
           version_number = $7,
           status = $8,
           approved_by = CASE WHEN $8 = 'approved' THEN approved_by ELSE NULL END,
           approved_at = CASE WHEN $8 = 'approved' THEN approved_at ELSE NULL END,
           updated_at = NOW()
       WHERE id = $9 AND workspace_id = $10
       RETURNING *`,
      [
        input.title ?? null,
        input.summary ?? null,
        input.content ?? null,
        input.category ?? null,
        input.narrator_id ?? null,
        input.primary_asset_id ?? null,
        newVersion,
        newStatus,
        storyId,
        workspaceId,
      ]
    );

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'STORY_UPDATED', 'story', $3, $4)`,
      [workspaceId, userId, storyId, JSON.stringify({ version: newVersion, status: newStatus })]
    );

    return res.rows[0];
  }

  /**
   * Phê duyệt câu chuyện (Quyền thuộc Người kể chuyện hoặc Admin)
   * Đồng thời lưu bản sao phiên bản đã duyệt vào bảng story_versions
   */
  async approveStory(userId: string, workspaceId: string, storyId: string): Promise<Story> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "story:approve");

    const res = await this.db.query<Story>(
      `UPDATE stories
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND workspace_id = $3
         AND NOT EXISTS (
           SELECT 1 FROM persons p WHERE p.id = stories.narrator_id AND p.workspace_id = stories.workspace_id
             AND p.linked_user_id IS NOT NULL AND p.linked_user_id <> $1
         )
       RETURNING *`,
      [userId, storyId, workspaceId]
    );

    if (res.rows.length === 0) {
      throw new Error("Không tìm thấy câu chuyện để duyệt.");
    }

    const story = res.rows[0];

    // Lấy bằng chứng hiện tại để lưu snapshot version
    const evidences = await this.db.query(
      `SELECT * FROM story_evidence_refs WHERE story_id = $1`,
      [storyId]
    );

    // Lưu snapshot vào story_versions
    await this.db.query(
      `INSERT INTO story_versions (
        story_id, version_number, title, summary, content, evidence_refs, approved_by, approved_at, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
       ON CONFLICT (story_id, version_number)
       DO UPDATE SET
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         content = EXCLUDED.content,
         evidence_refs = EXCLUDED.evidence_refs,
         approved_by = EXCLUDED.approved_by,
         approved_at = EXCLUDED.approved_at`,
      [
        storyId,
        story.version_number,
        story.title,
        story.summary,
        story.content,
        JSON.stringify(evidences.rows),
        userId,
        story.created_by,
      ]
    );

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'STORY_APPROVED', 'story', $3, $4)`,
      [workspaceId, userId, storyId, JSON.stringify({ version: story.version_number })]
    );

    return story;
  }

  /**
   * Thêm trích dẫn bằng chứng gốc gắn mốc âm thanh
   */
  async addEvidenceRef(userId: string, workspaceId: string, input: AddEvidenceRefInput): Promise<StoryEvidenceRef> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "story:propose");
    const { rows } = await this.db.query<{ status: StoryStatus; created_by: string }>(
      "SELECT status, created_by FROM stories WHERE id = $1 AND workspace_id = $2",
      [input.story_id, workspaceId]
    );
    const story = rows[0];
    if (!story || story.status === "approved" || (story.created_by !== userId && currentMember.role !== "admin")) {
      throw new Error("Chỉ có thể gắn nguồn vào bản nháp của mình hoặc do quản trị viên quản lý.");
    }

    // Xác minh tư liệu thuộc cùng kho gia đình
    const aCheck = await this.db.query(
      `SELECT id FROM assets WHERE id = $1 AND workspace_id = $2 AND status = 'ready' AND shared_with_family`,
      [input.asset_id, workspaceId]
    );
    if (aCheck.rows.length === 0) {
      throw new Error("Tư liệu trích dẫn không thuộc kho gia đình này hoặc không tồn tại.");
    }

    const res = await this.db.query<StoryEvidenceRef>(
      `INSERT INTO story_evidence_refs (story_id, asset_id, start_time_seconds, end_time_seconds, quote_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.story_id,
        input.asset_id,
        input.start_time_seconds ?? null,
        input.end_time_seconds ?? null,
        input.quote_text,
      ]
    );

    return res.rows[0];
  }

  /**
   * Lưu các đoạn gỡ băng âm thanh theo mốc thời gian (Transcript Segments)
   */
  async saveTranscriptSegments(
    userId: string,
    workspaceId: string,
    assetId: string,
    segments: Array<{
      order: number;
      startTime: number;
      endTime: number;
      speaker?: string;
      text: string;
      needsReview?: boolean;
    }>
  ): Promise<void> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "story:propose");
    const { rows } = await this.db.query<{ duration_seconds: number | null }>(
      `SELECT duration_seconds FROM assets
       WHERE id = $1 AND workspace_id = $2 AND asset_type = 'audio' AND status = 'ready'
         AND (shared_with_family OR uploaded_by = $3)`,
      [assetId, workspaceId, userId]
    );
    const source = rows[0];
    if (!source) throw new Error("Không tìm thấy bản ghi âm được phép sử dụng.");
    for (const seg of segments) {
      if (
        !Number.isInteger(seg.order) || seg.order < 0 ||
        !Number.isFinite(seg.startTime) || !Number.isFinite(seg.endTime) ||
        seg.startTime < 0 || seg.endTime <= seg.startTime ||
        (source.duration_seconds != null && seg.endTime > Number(source.duration_seconds)) ||
        !seg.text.trim() || seg.text.length > 4000
      ) {
        throw new Error("Đoạn chép lời hoặc mốc thời gian không hợp lệ.");
      }
    }

    for (const seg of segments) {
      await this.db.query(
        `INSERT INTO transcript_segments (
          workspace_id, asset_id, segment_order, start_time_seconds, end_time_seconds, speaker, text, needs_review
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          workspaceId,
          assetId,
          seg.order,
          seg.startTime,
          seg.endTime,
          seg.speaker || null,
          seg.text,
          seg.needsReview || false,
        ]
      );
    }
  }

  /**
   * Lấy danh sách đoạn gỡ băng của một tệp âm thanh
   */
  async getTranscript(userId: string, workspaceId: string, assetId: string): Promise<TranscriptSegment[]> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    const res = await this.db.query<TranscriptSegment>(
      `SELECT t.* FROM transcript_segments t JOIN assets a ON a.id = t.asset_id AND a.workspace_id = t.workspace_id
       WHERE t.asset_id = $1 AND t.workspace_id = $2 AND (a.shared_with_family OR a.uploaded_by = $3)
       ORDER BY segment_order ASC`,
      [assetId, workspaceId, userId]
    );

    return res.rows;
  }
}
