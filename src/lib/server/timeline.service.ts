import {
  CreateTimelineEventDto,
  CreateTimelineEventSchema,
  UpdateTimelineEventDto,
  UpdateTimelineEventSchema,
  TimelineFilterDto,
  TimelineEvent,
  TimelineEventPerson,
  TimelineEventAsset,
} from "@/contracts/timeline.contract";
import { DatabaseExecutor, WorkspaceService } from "./workspace.service";
import { assertPermission } from "./permissions";

export interface TimelineEventDetail extends TimelineEvent {
  creator_name?: string;
}

export class TimelineService {
  private workspaceService: WorkspaceService;

  constructor(private db: DatabaseExecutor) {
    this.workspaceService = new WorkspaceService(db);
  }

  /**
   * Tạo sự kiện dòng thời gian mới
   */
  async createEvent(
    userId: string,
    workspaceId: string,
    input: CreateTimelineEventDto
  ): Promise<TimelineEventDetail> {
    const validated = CreateTimelineEventSchema.parse(input);
    if (validated.year_end != null && validated.year_end < validated.year) {
      throw new Error("Năm kết thúc phải từ năm bắt đầu trở đi.");
    }
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "timeline:create");

    // Xác minh người thân và tư liệu tham chiếu phải thuộc cùng kho (chống rò rỉ ID chéo kho)
    if (validated.person_ids && validated.person_ids.length > 0) {
      for (const personId of validated.person_ids) {
        const check = await this.db.query(
          `SELECT id FROM persons WHERE id = $1 AND workspace_id = $2`,
          [personId, workspaceId]
        );
        if (check.rows.length === 0) {
          throw new Error("Người thân được chọn không thuộc kho gia đình này hoặc không tồn tại.");
        }
      }
    }

    if (validated.asset_ids && validated.asset_ids.length > 0) {
      for (const assetId of validated.asset_ids) {
        const check = await this.db.query(
          `SELECT id FROM assets WHERE id = $1 AND workspace_id = $2 AND shared_with_family`,
          [assetId, workspaceId]
        );
        if (check.rows.length === 0) {
          throw new Error("Tư liệu được chọn không thuộc kho gia đình này hoặc không tồn tại.");
        }
      }
    }

    const eventRes = await this.db.query<any>(
      `INSERT INTO timeline_events (
        workspace_id, title, description, event_date, year,
        date_display, date_precision, location, importance, created_by, year_end
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        workspaceId,
        validated.title,
        validated.description || null,
        validated.event_date || null,
        validated.year,
        validated.date_display,
        validated.date_precision,
        validated.location || null,
        validated.importance,
        userId,
        validated.year_end ?? null,
      ]
    );

    const event = eventRes.rows[0];

    // Gắn người thân
    if (validated.person_ids && validated.person_ids.length > 0) {
      for (const personId of validated.person_ids) {
        await this.db.query(
          `INSERT INTO timeline_event_persons (event_id, person_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [event.id, personId]
        );
      }
    }

    // Gắn tư liệu
    if (validated.asset_ids && validated.asset_ids.length > 0) {
      for (const assetId of validated.asset_ids) {
        await this.db.query(
          `INSERT INTO timeline_event_assets (event_id, asset_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [event.id, assetId]
        );
      }
    }

    // Audit log
    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'TIMELINE_EVENT_CREATED', 'timeline_event', $3, $4)`,
      [workspaceId, userId, event.id, JSON.stringify({ title: event.title, year: event.year })]
    );

    const detail = await this.getEventById(userId, workspaceId, event.id);
    if (!detail) {
      throw new Error("Không thể tải thông tin sự kiện vừa tạo.");
    }
    return detail;
  }

  /**
   * Cập nhật sự kiện dòng thời gian
   */
  async updateEvent(
    userId: string,
    workspaceId: string,
    eventId: string,
    input: UpdateTimelineEventDto
  ): Promise<TimelineEventDetail> {
    const validated = UpdateTimelineEventSchema.parse(input);
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "timeline:edit");

    const existingRes = await this.db.query<any>(
      `SELECT * FROM timeline_events WHERE id = $1 AND workspace_id = $2`,
      [eventId, workspaceId]
    );

    if (existingRes.rows.length === 0) {
      throw new Error("Sự kiện dòng thời gian không tồn tại.");
    }

    const existing = existingRes.rows[0];
    if (currentMember.role !== "admin" && existing.created_by !== userId) {
      throw new Error("Từ chối quyền: Bạn chỉ có thể sửa sự kiện do chính mình tạo.");
    }
    const yearEnd = validated.year_end === undefined ? existing.year_end : validated.year_end;
    if (yearEnd != null && yearEnd < (validated.year ?? existing.year)) {
      throw new Error("Năm kết thúc phải từ năm bắt đầu trở đi.");
    }

    await this.db.query(
      `UPDATE timeline_events
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           event_date = COALESCE($3, event_date),
           year = COALESCE($4, year),
           date_display = COALESCE($5, date_display),
           date_precision = COALESCE($6, date_precision),
           location = COALESCE($7, location),
           importance = COALESCE($8, importance),
           year_end = $11,
           updated_at = NOW()
       WHERE id = $9 AND workspace_id = $10`,
      [
        validated.title ?? null,
        validated.description ?? null,
        validated.event_date ?? null,
        validated.year ?? null,
        validated.date_display ?? null,
        validated.date_precision ?? null,
        validated.location ?? null,
        validated.importance ?? null,
        eventId,
        workspaceId,
        yearEnd ?? null,
      ]
    );

    // Cập nhật người liên quan nếu có truyền mảng (xác minh thuộc cùng kho)
    if (validated.person_ids !== undefined) {
      for (const personId of validated.person_ids) {
        const check = await this.db.query(
          `SELECT id FROM persons WHERE id = $1 AND workspace_id = $2`,
          [personId, workspaceId]
        );
        if (check.rows.length === 0) {
          throw new Error("Người thân được chọn không thuộc kho gia đình này hoặc không tồn tại.");
        }
      }
      await this.db.query(`DELETE FROM timeline_event_persons WHERE event_id = $1`, [eventId]);
      for (const personId of validated.person_ids) {
        await this.db.query(
          `INSERT INTO timeline_event_persons (event_id, person_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [eventId, personId]
        );
      }
    }

    // Cập nhật tư liệu nếu có truyền mảng (xác minh thuộc cùng kho)
    if (validated.asset_ids !== undefined) {
      for (const assetId of validated.asset_ids) {
        const check = await this.db.query(
          `SELECT id FROM assets WHERE id = $1 AND workspace_id = $2 AND shared_with_family`,
          [assetId, workspaceId]
        );
        if (check.rows.length === 0) {
          throw new Error("Tư liệu được chọn không thuộc kho gia đình này hoặc không tồn tại.");
        }
      }
      await this.db.query(`DELETE FROM timeline_event_assets WHERE event_id = $1`, [eventId]);
      for (const assetId of validated.asset_ids) {
        await this.db.query(
          `INSERT INTO timeline_event_assets (event_id, asset_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [eventId, assetId]
        );
      }
    }

    // Audit log
    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'TIMELINE_EVENT_UPDATED', 'timeline_event', $3, $4)`,
      [workspaceId, userId, eventId, JSON.stringify({ title: validated.title })]
    );

    const detail = await this.getEventById(userId, workspaceId, eventId);
    if (!detail) {
      throw new Error("Không thể tải thông tin sự kiện vừa cập nhật.");
    }
    return detail;
  }

  /**
   * Xóa sự kiện dòng thời gian
   */
  async deleteEvent(userId: string, workspaceId: string, eventId: string): Promise<void> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);

    const existingRes = await this.db.query<any>(
      `SELECT * FROM timeline_events WHERE id = $1 AND workspace_id = $2`,
      [eventId, workspaceId]
    );

    if (existingRes.rows.length === 0) {
      throw new Error("Sự kiện dòng thời gian không tồn tại.");
    }

    const existing = existingRes.rows[0];
    if (currentMember.role !== "admin" && existing.created_by !== userId) {
      throw new Error("Từ chối quyền: Bạn không có quyền xóa sự kiện này.");
    }

    await this.db.query(`DELETE FROM timeline_events WHERE id = $1 AND workspace_id = $2`, [
      eventId,
      workspaceId,
    ]);

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'TIMELINE_EVENT_DELETED', 'timeline_event', $3, $4)`,
      [workspaceId, userId, eventId, JSON.stringify({ title: existing.title })]
    );
  }

  /**
   * Lấy chi tiết một sự kiện dòng thời gian
   */
  async getEventById(
    userId: string,
    workspaceId: string,
    eventId: string
  ): Promise<TimelineEventDetail | null> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    const eventRes = await this.db.query<any>(
      `SELECT te.*, p.full_name as creator_name
       FROM timeline_events te
       LEFT JOIN profiles p ON te.created_by = p.id
       WHERE te.id = $1 AND te.workspace_id = $2`,
      [eventId, workspaceId]
    );

    if (eventRes.rows.length === 0) {
      return null;
    }

    const event = eventRes.rows[0];

    // Lấy danh sách người liên quan
    const personsRes = await this.db.query<TimelineEventPerson>(
      `SELECT tep.event_id, tep.person_id, tep.role_description,
              p.full_name, p.nick_name
       FROM timeline_event_persons tep
       JOIN persons p ON tep.person_id = p.id
       WHERE tep.event_id = $1
       ORDER BY p.full_name ASC`,
      [eventId]
    );

    // Lấy danh sách tư liệu liên quan
    const assetsRes = await this.db.query<TimelineEventAsset>(
      `SELECT tea.event_id, tea.asset_id, tea.caption,
              a.asset_type, a.file_name, a.title
       FROM timeline_event_assets tea
       JOIN assets a ON tea.asset_id = a.id
       WHERE tea.event_id = $1
       ORDER BY a.created_at ASC`,
      [eventId]
    );

    return {
      ...event,
      year: Number(event.year),
      persons: personsRes.rows,
      assets: assetsRes.rows,
    };
  }

  /**
   * Danh sách sự kiện dòng thời gian (theo năm và bộ lọc)
   */
  async listEvents(
    userId: string,
    workspaceId: string,
    filters?: TimelineFilterDto
  ): Promise<TimelineEventDetail[]> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    const conditions: string[] = ["te.workspace_id = $1"];
    const params: any[] = [workspaceId];

    if (filters?.query) {
      params.push(`%${filters.query}%`);
      conditions.push(
        `(te.title ILIKE $${params.length} OR te.description ILIKE $${params.length} OR te.location ILIKE $${params.length})`
      );
    }

    if (filters?.importance) {
      params.push(filters.importance);
      conditions.push(`te.importance = $${params.length}`);
    }

    if (filters?.year_from !== undefined) {
      params.push(filters.year_from);
      conditions.push(`COALESCE(te.year_end, te.year) >= $${params.length}`);
    }

    if (filters?.year_to !== undefined) {
      params.push(filters.year_to);
      conditions.push(`te.year <= $${params.length}`);
    }

    if (filters?.person_id) {
      params.push(filters.person_id);
      conditions.push(
        `EXISTS (SELECT 1 FROM timeline_event_persons tep WHERE tep.event_id = te.id AND tep.person_id = $${params.length})`
      );
    }

    const query = `
      SELECT te.*, p.full_name as creator_name
      FROM timeline_events te
      LEFT JOIN profiles p ON te.created_by = p.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY te.year ASC, te.event_date ASC NULLS LAST, te.created_at ASC
    `;

    const eventsRes = await this.db.query<any>(query, params);

    if (eventsRes.rows.length === 0) {
      return [];
    }

    const eventIds = eventsRes.rows.map((r) => r.id);

    // Batch load persons
    const personsRes = await this.db.query<TimelineEventPerson>(
      `SELECT tep.event_id, tep.person_id, tep.role_description,
              p.full_name, p.nick_name
       FROM timeline_event_persons tep
       JOIN persons p ON tep.person_id = p.id
       WHERE tep.event_id = ANY($1)
       ORDER BY p.full_name ASC`,
      [eventIds]
    );

    // Batch load assets
    const assetsRes = await this.db.query<TimelineEventAsset>(
      `SELECT tea.event_id, tea.asset_id, tea.caption,
              a.asset_type, a.file_name, a.title
       FROM timeline_event_assets tea
       JOIN assets a ON tea.asset_id = a.id
       WHERE tea.event_id = ANY($1)
       ORDER BY a.created_at ASC`,
      [eventIds]
    );

    const personsMap = new Map<string, TimelineEventPerson[]>();
    for (const p of personsRes.rows) {
      const list = personsMap.get(p.event_id) || [];
      list.push(p);
      personsMap.set(p.event_id, list);
    }

    const assetsMap = new Map<string, TimelineEventAsset[]>();
    for (const a of assetsRes.rows) {
      const list = assetsMap.get(a.event_id) || [];
      list.push(a);
      assetsMap.set(a.event_id, list);
    }

    return eventsRes.rows.map((event) => ({
      ...event,
      year: Number(event.year),
      persons: personsMap.get(event.id) || [],
      assets: assetsMap.get(event.id) || [],
    }));
  }
}
