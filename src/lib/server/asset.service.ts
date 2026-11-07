import {
  CreateAssetInput,
  UpdateAssetInput,
  Asset,
  AssetType,
  AssetDetailView,
} from "@/contracts/asset.contract";
import { DatabaseExecutor, WorkspaceService } from "./workspace.service";
import { assertPermission } from "./permissions";

export type { AssetDetailView };

export class AssetService {
  private workspaceService: WorkspaceService;

  constructor(private db: DatabaseExecutor) {
    this.workspaceService = new WorkspaceService(db);
  }

  /**
   * Lưu thông tin tư liệu vào kho gia đình
   */
  async createAsset(userId: string, input: CreateAssetInput): Promise<Asset> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, input.workspace_id);
    assertPermission(currentMember.role, "asset:upload");
    if (input.narrator_id) {
      const { rows } = await this.db.query(
        "SELECT id FROM persons WHERE id = $1 AND workspace_id = $2",
        [input.narrator_id, input.workspace_id]
      );
      if (!rows.length) throw new Error("Người kể không thuộc kho này.");
    }

    const res = await this.db.query<Asset>(
      `INSERT INTO assets (
        workspace_id, asset_type, file_name, file_path, mime_type, byte_size,
        checksum, duration_seconds, uploaded_by, narrator_id, title, description, status, shared_with_family
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ready', $13)
       RETURNING *`,
      [
        input.workspace_id,
        input.asset_type,
        input.file_name,
        input.file_path,
        input.mime_type,
        input.byte_size,
        input.checksum || null,
        input.duration_seconds || null,
        userId,
        input.narrator_id || null,
        input.title,
        input.description || null,
        input.shared_with_family ?? true,
      ]
    );

    const asset = res.rows[0];

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'ASSET_UPLOADED', 'asset', $3, $4)`,
      [
        input.workspace_id,
        userId,
        asset.id,
        JSON.stringify({ title: asset.title, asset_type: asset.asset_type }),
      ]
    );

    return asset;
  }

  /**
   * Lấy chi tiết một tư liệu trong kho
   */
  async getAsset(userId: string, workspaceId: string, assetId: string): Promise<AssetDetailView> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    const res = await this.db.query<AssetDetailView>(
      `SELECT a.*, p.full_name AS narrator_name, up.full_name AS uploader_name
       FROM assets a
       LEFT JOIN persons p ON p.id = a.narrator_id
       JOIN profiles up ON up.id = a.uploaded_by
       WHERE a.id = $1 AND a.workspace_id = $2
         AND (a.shared_with_family OR a.uploaded_by = $3)`,
      [assetId, workspaceId, userId]
    );

    if (res.rows.length === 0) {
      throw new Error("Không tìm thấy tư liệu trong kho.");
    }

    return res.rows[0];
  }

  /**
   * Danh sách tư liệu trong kho (hỗ trợ lọc theo loại, người kể, từ khóa)
   */
  async listAssets(
    userId: string,
    workspaceId: string,
    filter?: { assetType?: AssetType; narratorId?: string; keyword?: string; familyOnly?: boolean }
  ): Promise<AssetDetailView[]> {
    await this.workspaceService.getWorkspace(userId, workspaceId);

    let query = `
      SELECT a.*, p.full_name AS narrator_name, up.full_name AS uploader_name
      FROM assets a
      LEFT JOIN persons p ON p.id = a.narrator_id
      JOIN profiles up ON up.id = a.uploaded_by
      WHERE a.workspace_id = $1 AND (a.shared_with_family OR a.uploaded_by = $2)
    `;
    const params: any[] = [workspaceId, userId];
    let paramIndex = 3;
    if (filter?.familyOnly) query += " AND a.shared_with_family";

    if (filter?.assetType) {
      query += ` AND a.asset_type = $${paramIndex++}`;
      params.push(filter.assetType);
    }

    if (filter?.narratorId) {
      query += ` AND a.narrator_id = $${paramIndex++}`;
      params.push(filter.narratorId);
    }

    if (filter?.keyword) {
      query += ` AND (LOWER(a.title) LIKE $${paramIndex} OR LOWER(COALESCE(a.description, '')) LIKE $${paramIndex})`;
      params.push(`%${filter.keyword.toLowerCase()}%`);
      paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC`;

    const res = await this.db.query<AssetDetailView>(query, params);
    return res.rows;
  }

  /**
   * Xóa tư liệu (Chỉ Quản trị viên kho hoặc chính người đã tải lên mới được xóa)
   */
  async deleteAsset(userId: string, workspaceId: string, assetId: string): Promise<{ deletedFilePath: string }> {
    const { currentMember } = await this.workspaceService.getWorkspace(userId, workspaceId);

    const checkRes = await this.db.query<Asset>(
      `SELECT * FROM assets WHERE id = $1 AND workspace_id = $2`,
      [assetId, workspaceId]
    );

    if (checkRes.rows.length === 0) {
      throw new Error("Không tìm thấy tư liệu cần xóa.");
    }

    const asset = checkRes.rows[0];

    // Kiểm tra quyền: Admin HOẶC chính người tải lên
    const isOwner = asset.uploaded_by === userId;
    const isAdmin = currentMember.role === "admin" && asset.shared_with_family;

    if (!isAdmin && !isOwner) {
      throw new Error("Từ chối quyền: Bạn chỉ có thể xóa tư liệu do chính bạn tải lên.");
    }

    await this.db.query(`DELETE FROM assets WHERE id = $1 AND workspace_id = $2`, [assetId, workspaceId]);

    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'ASSET_DELETED', 'asset', $3, $4)`,
      [workspaceId, userId, assetId, JSON.stringify({ title: asset.title })]
    );

    return { deletedFilePath: asset.file_path };
  }
}
