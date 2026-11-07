import {
  CreateGraphEntityDto,
  CreateGraphEntitySchema,
  CreateGraphClaimDto,
  CreateGraphClaimSchema,
  EntityType,
  ClaimStatus,
  GraphEntity,
  GraphClaim,
  GraphEdgeWithNames,
  NeighborhoodGraphView,
  FullGraphView,
} from "@/contracts/graph.contract";
import { DatabaseExecutor, WorkspaceService } from "./workspace.service";
import { assertPermission } from "./permissions";

export class GraphService {
  private workspaceService: WorkspaceService;

  constructor(private db: DatabaseExecutor) {
    this.workspaceService = new WorkspaceService(db);
  }

  /**
   * Tạo nút thực thể mới (người, địa điểm, sự kiện, kỹ năng)
   */
  async createEntity(
    userId: string,
    workspaceId: string,
    input: CreateGraphEntityDto
  ): Promise<GraphEntity> {
    const validated = CreateGraphEntitySchema.parse(input);
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "graph:create");

    const res = await this.db.query<GraphEntity>(
      `INSERT INTO graph_entities (
        workspace_id, entity_type, name, aliases, description, metadata, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        workspaceId,
        validated.entity_type,
        validated.name,
        validated.aliases || [],
        validated.description || null,
        JSON.stringify(validated.metadata || {}),
        userId,
      ]
    );

    const entity = res.rows[0];

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'GRAPH_ENTITY_CREATED', 'graph_entity', $3, $4)`,
      [workspaceId, userId, entity.id, JSON.stringify({ name: entity.name, type: entity.entity_type })]
    );

    return entity;
  }

  /**
   * Tạo cạnh / lời khẳng định liên kết có nguồn (Claim)
   */
  async createClaim(
    userId: string,
    workspaceId: string,
    input: CreateGraphClaimDto
  ): Promise<GraphClaim> {
    const validated = CreateGraphClaimSchema.parse(input);
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "graph:create");

    if (validated.source_entity_id === validated.target_entity_id) {
      throw new Error("Nút nguồn và nút đích của liên kết không được trùng nhau.");
    }

    // Xác nhận cả 2 thực thể thuộc workspace
    const checkRes = await this.db.query(
      `SELECT id FROM graph_entities WHERE id IN ($1, $2) AND workspace_id = $3`,
      [validated.source_entity_id, validated.target_entity_id, workspaceId]
    );
    if (checkRes.rows.length < 2) {
      throw new Error("Một hoặc cả hai nút tri thức không tồn tại trong kho này.");
    }

    // Nếu có gắn tư liệu bằng chứng, kiểm tra tư liệu thuộc cùng kho và sẵn sàng
    if (validated.evidence_asset_id) {
      const aCheck = await this.db.query(
        `SELECT id FROM assets WHERE id = $1 AND workspace_id = $2 AND status = 'ready' AND shared_with_family`,
        [validated.evidence_asset_id, workspaceId]
      );
      if (aCheck.rows.length === 0) {
        throw new Error("Tư liệu trích dẫn không thuộc kho gia đình này hoặc không tồn tại.");
      }
    }

    // Mọi liên kết mới luôn bắt đầu ở trạng thái proposed, không tin client
    const res = await this.db.query<GraphClaim>(
      `INSERT INTO graph_claims (
        workspace_id, source_entity_id, target_entity_id, relation_type,
        statement, status, evidence_asset_id, evidence_quote,
        start_time_seconds, end_time_seconds, created_by
       ) VALUES ($1, $2, $3, $4, $5, 'proposed', $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        workspaceId,
        validated.source_entity_id,
        validated.target_entity_id,
        validated.relation_type,
        validated.statement,
        validated.evidence_asset_id || null,
        validated.evidence_quote || null,
        validated.start_time_seconds ?? null,
        validated.end_time_seconds ?? null,
        userId,
      ]
    );

    const claim = res.rows[0];

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'GRAPH_CLAIM_CREATED', 'graph_claim', $3, $4)`,
      [workspaceId, userId, claim.id, JSON.stringify({ statement: claim.statement })]
    );

    return {
      ...claim,
      start_time_seconds: claim.start_time_seconds != null ? Number(claim.start_time_seconds) : null,
      end_time_seconds: claim.end_time_seconds != null ? Number(claim.end_time_seconds) : null,
    };
  }

  /**
   * Xác nhận liên kết đề xuất (Chỉ Người kể hoặc Admin)
   */
  async confirmClaim(userId: string, workspaceId: string, claimId: string): Promise<GraphClaim> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "graph:confirm");

    const res = await this.db.query<GraphClaim>(
      `UPDATE graph_claims
       SET status = 'confirmed',
           confirmed_by = $1,
           confirmed_at = NOW()
       WHERE id = $2 AND workspace_id = $3
       RETURNING *`,
      [userId, claimId, workspaceId]
    );

    if (res.rows.length === 0) {
      throw new Error("Liên kết không tồn tại trong kho.");
    }

    const claim = res.rows[0];

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'GRAPH_CLAIM_CONFIRMED', 'graph_claim', $3, $4)`,
      [workspaceId, userId, claimId, JSON.stringify({ statement: claim.statement })]
    );

    return {
      ...claim,
      start_time_seconds: claim.start_time_seconds != null ? Number(claim.start_time_seconds) : null,
      end_time_seconds: claim.end_time_seconds != null ? Number(claim.end_time_seconds) : null,
    };
  }

  /**
   * Từ chối liên kết đề xuất
   */
  async rejectClaim(userId: string, workspaceId: string, claimId: string): Promise<GraphClaim> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);
    assertPermission(currentMember.role, "graph:confirm");

    const res = await this.db.query<GraphClaim>(
      `UPDATE graph_claims
       SET status = 'rejected',
           confirmed_by = $1,
           confirmed_at = NOW()
       WHERE id = $2 AND workspace_id = $3
       RETURNING *`,
      [userId, claimId, workspaceId]
    );

    if (res.rows.length === 0) {
      throw new Error("Liên kết không tồn tại trong kho.");
    }

    const claim = res.rows[0];

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'GRAPH_CLAIM_REJECTED', 'graph_claim', $3, $4)`,
      [workspaceId, userId, claimId, JSON.stringify({ statement: claim.statement })]
    );

    return {
      ...claim,
      start_time_seconds: claim.start_time_seconds != null ? Number(claim.start_time_seconds) : null,
      end_time_seconds: claim.end_time_seconds != null ? Number(claim.end_time_seconds) : null,
    };
  }

  /**
   * Lấy chi tiết một nút thực thể
   */
  async getEntity(userId: string, workspaceId: string, entityId: string): Promise<GraphEntity | null> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    const res = await this.db.query<GraphEntity>(
      `SELECT * FROM graph_entities WHERE id = $1 AND workspace_id = $2`,
      [entityId, workspaceId]
    );
    return res.rows[0] || null;
  }

  /**
   * Danh sách các nút thực thể
   */
  async listEntities(
    userId: string,
    workspaceId: string,
    type?: EntityType,
    query?: string
  ): Promise<GraphEntity[]> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    const conditions: string[] = ["workspace_id = $1"];
    const params: any[] = [workspaceId];

    if (type) {
      params.push(type);
      conditions.push(`entity_type = $${params.length}`);
    }

    if (query) {
      params.push(`%${query}%`);
      conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    const res = await this.db.query<GraphEntity>(
      `SELECT * FROM graph_entities WHERE ${conditions.join(" AND ")} ORDER BY name ASC`,
      params
    );
    return res.rows;
  }

  /**
   * Danh sách liên kết đang chờ duyệt (Màn hình duyệt đề xuất - P06)
   */
  async listPendingClaims(userId: string, workspaceId: string): Promise<GraphEdgeWithNames[]> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    const res = await this.db.query<any>(
      `SELECT c.*,
              s.name as source_name, s.entity_type as source_type,
              t.name as target_name, t.entity_type as target_type,
              a.title as evidence_asset_title, a.file_name as evidence_asset_file
       FROM graph_claims c
       JOIN graph_entities s ON c.source_entity_id = s.id
       JOIN graph_entities t ON c.target_entity_id = t.id
       LEFT JOIN assets a ON c.evidence_asset_id = a.id
       WHERE c.workspace_id = $1 AND c.status IN ('proposed', 'unverified')
       ORDER BY c.created_at DESC`,
      [workspaceId]
    );

    return res.rows.map((r) => ({
      ...r,
      start_time_seconds: r.start_time_seconds != null ? Number(r.start_time_seconds) : null,
      end_time_seconds: r.end_time_seconds != null ? Number(r.end_time_seconds) : null,
    }));
  }

  /**
   * Khám phá lân cận (Neighborhood Exploration - P06)
   */
  async getNeighborhood(
    userId: string,
    workspaceId: string,
    centerEntityId: string
  ): Promise<NeighborhoodGraphView> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    const center = await this.getEntity(userId, workspaceId, centerEntityId);
    if (!center) {
      throw new Error("Nút thực thể trung tâm không tồn tại.");
    }

    const edgesRes = await this.db.query<any>(
      `SELECT c.*,
              s.name as source_name, s.entity_type as source_type,
              t.name as target_name, t.entity_type as target_type,
              a.title as evidence_asset_title, a.file_name as evidence_asset_file
       FROM graph_claims c
       JOIN graph_entities s ON c.source_entity_id = s.id
       JOIN graph_entities t ON c.target_entity_id = t.id
       LEFT JOIN assets a ON c.evidence_asset_id = a.id
       WHERE c.workspace_id = $1
         AND (c.source_entity_id = $2 OR c.target_entity_id = $2)
         AND c.status IN ('confirmed', 'unverified')
       ORDER BY c.created_at ASC`,
      [workspaceId, centerEntityId]
    );

    const edges: GraphEdgeWithNames[] = edgesRes.rows.map((r) => ({
      ...r,
      start_time_seconds: r.start_time_seconds != null ? Number(r.start_time_seconds) : null,
      end_time_seconds: r.end_time_seconds != null ? Number(r.end_time_seconds) : null,
    }));

    const connectedIds = new Set<string>();
    for (const e of edges) {
      connectedIds.add(e.source_entity_id);
      connectedIds.add(e.target_entity_id);
    }
    connectedIds.delete(centerEntityId);

    let connectedNodes: GraphEntity[] = [];
    if (connectedIds.size > 0) {
      const nodesRes = await this.db.query<GraphEntity>(
        `SELECT * FROM graph_entities WHERE id = ANY($1) AND workspace_id = $2 ORDER BY name ASC`,
        [Array.from(connectedIds), workspaceId]
      );
      connectedNodes = nodesRes.rows;
    }

    return {
      center_node: center,
      nodes: [center, ...connectedNodes],
      edges,
    };
  }

  /**
   * Lấy toàn bộ đồ thị tri thức
   */
  async getFullGraph(
    userId: string,
    workspaceId: string,
    statusFilter: ClaimStatus[] = ["confirmed", "unverified"]
  ): Promise<FullGraphView> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    const nodesRes = await this.db.query<GraphEntity>(
      `SELECT * FROM graph_entities WHERE workspace_id = $1 ORDER BY entity_type ASC, name ASC`,
      [workspaceId]
    );

    const edgesRes = await this.db.query<any>(
      `SELECT c.*,
              s.name as source_name, s.entity_type as source_type,
              t.name as target_name, t.entity_type as target_type,
              a.title as evidence_asset_title, a.file_name as evidence_asset_file
       FROM graph_claims c
       JOIN graph_entities s ON c.source_entity_id = s.id
       JOIN graph_entities t ON c.target_entity_id = t.id
       LEFT JOIN assets a ON c.evidence_asset_id = a.id
       WHERE c.workspace_id = $1
         AND c.status = ANY($2)
       ORDER BY c.created_at ASC`,
      [workspaceId, statusFilter]
    );

    const edges: GraphEdgeWithNames[] = edgesRes.rows.map((r) => ({
      ...r,
      start_time_seconds: r.start_time_seconds != null ? Number(r.start_time_seconds) : null,
      end_time_seconds: r.end_time_seconds != null ? Number(r.end_time_seconds) : null,
    }));

    return {
      nodes: nodesRes.rows,
      edges,
    };
  }
}
