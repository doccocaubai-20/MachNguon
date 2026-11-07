import { DatabaseExecutor } from "./workspace.service";
import { DEMO_USERS } from "@/lib/auth/mock-users";
import { enrichFullFamilyData } from "./seed-rich";

export async function seedDemoData(db: DatabaseExecutor): Promise<void> {
  // 1. Khởi tạo danh sách người dùng mẫu (Profiles)
  for (const u of DEMO_USERS) {
    await db.query(
      `INSERT INTO profiles (id, email, full_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         full_name = EXCLUDED.full_name,
         avatar_url = EXCLUDED.avatar_url`,
      [u.id, u.email, u.fullName, u.avatarUrl || null]
    );
  }

  // 2. Khởi tạo kho gia đình mẫu Họ Nguyễn
  const wsId = "a0000000-0000-0000-0000-000000000001";
  const adminId = DEMO_USERS[0].id; // Bác An

  const wsCheck = await db.query(`SELECT id FROM workspaces WHERE id = $1`, [wsId]);
  if (wsCheck.rows.length === 0) {
    await db.query(
      `INSERT INTO workspaces (id, name, description, created_by)
       VALUES ($1, $2, $3, $4)`,
      [
        wsId,
        "Kho Ký Ức Gia Đình Họ Nguyễn",
        "Nơi lưu giữ tiếng nói, món ăn truyền thống và kinh nghiệm sống qua các thế hệ.",
        adminId,
      ]
    );

    // Thêm Admin (Bác An)
    await db.query(
      `INSERT INTO memberships (workspace_id, user_id, role, status)
       VALUES ($1, $2, 'admin', 'active')
       ON CONFLICT (workspace_id, user_id) DO NOTHING`,
      [wsId, adminId]
    );

    // Thêm Contributor (Nguyễn Thanh Bình)
    await db.query(
      `INSERT INTO memberships (workspace_id, user_id, role, status, invited_by)
       VALUES ($1, $2, 'contributor', 'active', $3)
       ON CONFLICT (workspace_id, user_id) DO NOTHING`,
      [wsId, DEMO_USERS[1].id, adminId]
    );

    // Thêm Viewer (Nguyễn Mai Châu)
    await db.query(
      `INSERT INTO memberships (workspace_id, user_id, role, status, invited_by)
       VALUES ($1, $2, 'viewer', 'active', $3)
       ON CONFLICT (workspace_id, user_id) DO NOTHING`,
      [wsId, DEMO_USERS[2].id, adminId]
    );

    // Ghi audit log
    await db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [wsId, adminId, "WORKSPACE_INITIALIZED", "workspace", wsId, JSON.stringify({ seed: true })]
    );

    // 4. Khởi tạo hồ sơ người thân mẫu cho kịch bản "Học món bánh của bà"
    const p1 = await db.query<{ id: string }>(
      `INSERT INTO persons (id, workspace_id, full_name, nick_name, gender, birth_date, bio)
       VALUES (
         'c0000000-0000-0000-0000-000000000001',
         $1,
         'Bà Lê Thị Mai',
         'Bà Nội',
         'female',
         '1936',
         'Gốc làng bánh gối Hà Nội xưa. Nắm giữ bí quyết pha bột giòn xốp và làm nhân truyền thống.'
       )
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [wsId]
    );
    const baMaiId = p1.rows[0]?.id || "c0000000-0000-0000-0000-000000000001";

    const p2 = await db.query<{ id: string }>(
      `INSERT INTO persons (id, workspace_id, full_name, nick_name, gender, birth_date, bio, linked_user_id)
       VALUES (
         'c0000000-0000-0000-0000-000000000002',
         $1,
         'Bác Nguyễn Văn An',
         'Bác Cả',
         'male',
         '1960',
         'Con trai cả của bà Mai. Người ghi âm và lưu giữ ký ức gia đình.',
         $2
       )
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [wsId, adminId]
    );
    const bacAnId = p2.rows[0]?.id || "c0000000-0000-0000-0000-000000000002";

    const p3 = await db.query<{ id: string }>(
      `INSERT INTO persons (id, workspace_id, full_name, nick_name, gender, birth_date, bio, linked_user_id)
       VALUES (
         'c0000000-0000-0000-0000-000000000003',
         $1,
         'Nguyễn Mai Châu',
         'Bé Châu',
         'female',
         '2002',
         'Cháu gái bà Mai, sinh viên đại học thích học làm món ăn gia truyền của bà.',
         $2
       )
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [wsId, DEMO_USERS[2].id]
    );
    const maiChauId = p3.rows[0]?.id || "c0000000-0000-0000-0000-000000000003";

    // Thiết lập quan hệ
    await db.query(
      `INSERT INTO person_relationships (workspace_id, person_id, related_person_id, relationship_type, notes)
       VALUES 
        ($1, $2, $3, 'parent', 'Mẹ ruột'),
        ($1, $3, $2, 'child', 'Con trai cả'),
        ($1, $2, $4, 'grandparent', 'Bà nội'),
        ($1, $4, $2, 'grandchild', 'Cháu gái nội'),
        ($1, $3, $4, 'parent', 'Bố ruột'),
        ($1, $4, $3, 'child', 'Con gái')
       ON CONFLICT DO NOTHING`,
      [wsId, baMaiId, bacAnId, maiChauId]
    );

    // 5. Khởi tạo tư liệu mẫu cho P03
    await db.query(
      `INSERT INTO assets (
        id, workspace_id, asset_type, file_name, file_path, mime_type, byte_size,
        duration_seconds, uploaded_by, narrator_id, title, description, status
       ) VALUES
       (
         'd0000000-0000-0000-0000-000000000001',
         $1,
         'audio',
         'ba_mai_ke_chuyen_banh_goi.mp3',
         '/samples/ba_mai_ke_chuyen_banh_goi.mp3',
         'audio/mpeg',
         4120000,
         255,
         $2,
         $3,
         'Bà kể về xuất xứ món bánh gối phố cổ và bí quyết ủ bột xốp',
         'Ghi âm trực tiếp tại nhà bà Mai vào sáng Chủ nhật. Bà nhắc kỹ tỷ lệ nước ấm và bột mì.',
         'ready'
       ),
       (
         'd0000000-0000-0000-0000-000000000002',
         $1,
         'audio',
         'ba_mai_can_lua_dau.mp3',
         '/samples/ba_mai_can_lua_dau.mp3',
         'audio/mpeg',
         3250000,
         200,
         $2,
         $3,
         'Bí quyết căn lửa dầu và dấu hiệu mép bánh vàng giòn',
         'Bà dặn thử đầu đũa sủi tăm tăm mới thả bánh, không để dầu bốc khói.',
         'ready'
       ),
       (
         'd0000000-0000-0000-0000-000000000003',
         $1,
         'image',
         'banh_goi_thanh_pham.jpg',
         '/samples/banh_goi_thanh_pham.jpg',
         'image/jpeg',
         1540000,
         null,
         $2,
         $3,
         'Đĩa bánh gối vàng ruộm vừa vớt ra khỏi chảo của bà',
         'Chụp góc cận cảnh vỏ bánh phồng xốp xếp cùng đĩa rau sống và bát nước chấm đu đủ xanh.',
         'ready'
       ),
       (
         'd0000000-0000-0000-0000-000000000004',
         $1,
         'document',
         'so_tay_cong_thuc_1980.pdf',
         '/samples/so_tay_cong_thuc_1980.pdf',
         'application/pdf',
         2800000,
         null,
         $2,
         $3,
         'Sổ tay ghi chép công thức làm bánh chép tay năm 1980',
         'Bản scan sổ tay màu giấy ngả vàng của bà, ghi chép định lượng các loại gia vị.',
         'ready'
       )
       ON CONFLICT (id) DO NOTHING`,
      [wsId, adminId, baMaiId]
    );

    // 6. Khởi tạo câu chuyện có nguồn mẫu cho P04
    const storyRes = await db.query<{ id: string }>(
      `INSERT INTO stories (
        id, workspace_id, narrator_id, primary_asset_id, title, summary,
        content, category, status, version_number, approved_by, approved_at, created_by
       ) VALUES (
         'e0000000-0000-0000-0000-000000000001',
         $1,
         $2,
         'd0000000-0000-0000-0000-000000000001',
         'Ký ức gánh bánh gối phố cổ và bí quyết ủ bột của bà Mai',
         'Câu chuyện về những năm tháng gánh bánh rong quanh phố cổ Hà Nội và bí quyết làm vỏ bánh phồng xốp truyền qua ba thế hệ.',
         'Năm 1965, khi phố cổ Hà Nội còn nhiều tiếng tàu điện leng keng, bà bắt đầu gánh hàng bánh gối từ ngõ nhỏ Hàng Chiếu ra bán ở góc chợ.\n\nMỗi buổi sáng bà dậy từ 4 giờ để nhào bột. Thời ấy không có máy móc, mọi công đoạn đều dùng đôi bàn tay. Bà dặn: bí quyết vỏ bánh giòn tan không ngấm dầu nằm ở chỗ pha nước ấm vừa đủ và để bột nghỉ đúng một canh giờ.\n\nKhi thả vào chảo mỡ, phải căn lúc mỡ vừa sôi tăm tăm, nghe tiếng xèo xèo reo vui thì vỏ bánh mới phồng đều thành màu vàng hổ phách. Đó không chỉ là món ăn nuôi sống cả nhà qua năm tháng gian khó, mà còn là tình cảm bà gửi gắm cho con cháu mai sau.',
         'ẩm thực & ký ức',
         'approved',
         1,
         $3,
         NOW(),
         $3
       )
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [wsId, baMaiId, adminId]
    );
    const storyId = storyRes.rows[0]?.id || "e0000000-0000-0000-0000-000000000001";

    // Thêm trích dẫn bằng chứng gốc gắn mốc âm thanh (Evidence Ref)
    await db.query(
      `INSERT INTO story_evidence_refs (
        story_id, asset_id, start_time_seconds, end_time_seconds, quote_text
       ) VALUES
       (
         $1,
         'd0000000-0000-0000-0000-000000000001',
         30,
         75,
         'Bột mì thì phải chọn loại mịn, hòa nước ấm vừa tay, nhào đều rồi ủ lại cho bột thở đúng một canh giờ.'
       ),
       (
         $1,
         'd0000000-0000-0000-0000-000000000002',
         15,
         55,
         'Thử đầu đũa tre vào chảo mỡ thấy sủi bọt tăm tăm thì mới thả bánh, không để mỡ quá già sẽ khét vỏ mà sống nhân.'
       )
       ON CONFLICT DO NOTHING`,
      [storyId]
    );

    // Thêm các đoạn gỡ băng âm thanh (Transcript Segments)
    await db.query(
      `INSERT INTO transcript_segments (
        workspace_id, asset_id, segment_order, start_time_seconds, end_time_seconds, speaker, text
       ) VALUES
       (
         $1,
         'd0000000-0000-0000-0000-000000000001',
         1,
         0,
         30,
         'Bà Lê Thị Mai',
         'Năm ấy là độ sáu mươi lăm, phố cổ còn vắng lắm, sáng sớm tinh mơ chỉ nghe thấy tiếng bánh sắt tàu điện chạy trên đường ray.'
       ),
       (
         $1,
         'd0000000-0000-0000-0000-000000000001',
         2,
         30,
         75,
         'Bà Lê Thị Mai',
         'Mỗi sáng bà phải thức từ bốn giờ. Bột mì thì phải chọn loại mịn, hòa nước ấm vừa tay, nhào đều rồi ủ lại cho bột thở.'
       ),
       (
         $1,
         'd0000000-0000-0000-0000-000000000001',
         3,
         75,
         130,
         'Bà Lê Thị Mai',
         'Nhân bánh thì có miến dong, mộc nhĩ, thịt nạc dăm và chút hạt tiêu bắc. Gói phải khéo mép gấp nếp hình vỏ sò.'
       )
       ON CONFLICT DO NOTHING`,
      [wsId]
    );

    // 7. Khởi tạo Dòng thời gian gia đình mẫu cho P05
    const ev1 = await db.query<{ id: string }>(
      `INSERT INTO timeline_events (
        id, workspace_id, title, description, year, date_display, date_precision, location, importance, created_by
       ) VALUES (
        'f0000000-0000-0000-0000-000000000001',
        $1,
        'Bà Lê Thị Mai sinh ra tại ngoại thành Hà Nội',
        'Bà Mai sinh ra trong một gia đình làm bột và bánh truyền thống.',
        1936,
        'Năm 1936',
        'year',
        'Hà Nội',
        'normal',
        $2
       )
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [wsId, adminId]
    );
    const ev1Id = ev1.rows[0]?.id || "f0000000-0000-0000-0000-000000000001";
    await db.query(
      `INSERT INTO timeline_event_persons (event_id, person_id, role_description) 
       VALUES ($1, $2, 'Nhân vật chính') ON CONFLICT DO NOTHING`,
      [ev1Id, baMaiId]
    );

    const ev2 = await db.query<{ id: string }>(
      `INSERT INTO timeline_events (
        id, workspace_id, title, description, year, date_display, date_precision, location, importance, created_by
       ) VALUES (
        'f0000000-0000-0000-0000-000000000002',
        $1,
        'Gánh hàng bánh gối đầu tiên ở ngõ Hàng Chiếu - phố cổ',
        'Bà Mai gánh đôi quang gánh từ sáng sớm ra góc chợ Đồng Xuân bán bánh gối nóng hổi phục vụ người dân phố cổ.',
        1965,
        'Mùa thu năm 1965',
        'approximate',
        'Ngõ Hàng Chiếu, Hoàn Kiếm, Hà Nội',
        'milestone',
        $2
       )
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [wsId, adminId]
    );
    const ev2Id = ev2.rows[0]?.id || "f0000000-0000-0000-0000-000000000002";
    await db.query(
      `INSERT INTO timeline_event_persons (event_id, person_id, role_description) 
       VALUES ($1, $2, 'Người gánh hàng') ON CONFLICT DO NOTHING`,
      [ev2Id, baMaiId]
    );
    await db.query(
      `INSERT INTO timeline_event_assets (event_id, asset_id, caption) 
       VALUES ($1, 'd0000000-0000-0000-0000-000000000001', 'Bản ghi âm bà Mai kể chuyện gánh bánh') 
       ON CONFLICT DO NOTHING`,
      [ev2Id]
    );

    const ev3 = await db.query<{ id: string }>(
      `INSERT INTO timeline_events (
        id, workspace_id, title, description, year, date_display, date_precision, location, importance, created_by
       ) VALUES (
        'f0000000-0000-0000-0000-000000000003',
        $1,
        'Hoàn thành sổ tay chép tay công thức gia truyền',
        'Bà đúc kết định lượng gia vị ướp nhân thịt và công thức pha nước chấm chua ngọt đu đủ xanh vào cuốn sổ tay bìa cứng.',
        1980,
        'Khoảng năm 1980',
        'decade',
        'Hà Nội',
        'normal',
        $2
       )
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [wsId, adminId]
    );
    const ev3Id = ev3.rows[0]?.id || "f0000000-0000-0000-0000-000000000003";
    await db.query(
      `INSERT INTO timeline_event_persons (event_id, person_id, role_description) 
       VALUES ($1, $2, 'Tác giả sổ tay') ON CONFLICT DO NOTHING`,
      [ev3Id, baMaiId]
    );
    await db.query(
      `INSERT INTO timeline_event_assets (event_id, asset_id, caption) 
       VALUES ($1, 'd0000000-0000-0000-0000-000000000004', 'Bản scan sổ tay công thức năm 1980') 
       ON CONFLICT DO NOTHING`,
      [ev3Id]
    );

    const ev4 = await db.query<{ id: string }>(
      `INSERT INTO timeline_events (
        id, workspace_id, title, description, year, date_display, date_precision, location, importance, created_by
       ) VALUES (
        'f0000000-0000-0000-0000-000000000004',
        $1,
        'Bà Mai truyền dạy bí quyết căn lửa chảo dầu cho Bác An',
        'Bác An được bà dạy trực tiếp cách thử tăm tre sủi bọt và kỹ thuật trở bánh hai lần để vỏ phồng giòn không ngấm dầu.',
        1995,
        'Tháng 8/1995',
        'month',
        'Bếp gia đình - Hà Nội',
        'normal',
        $2
       )
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [wsId, adminId]
    );
    const ev4Id = ev4.rows[0]?.id || "f0000000-0000-0000-0000-000000000004";
    await db.query(
      `INSERT INTO timeline_event_persons (event_id, person_id, role_description) 
       VALUES 
        ($1, $2, 'Người truyền dạy'),
        ($1, $3, 'Người học') 
       ON CONFLICT DO NOTHING`,
      [ev4Id, baMaiId, bacAnId]
    );
    await db.query(
      `INSERT INTO timeline_event_assets (event_id, asset_id, caption) 
       VALUES ($1, 'd0000000-0000-0000-0000-000000000002', 'Bản ghi âm bà dặn căn lửa chảo dầu') 
       ON CONFLICT DO NOTHING`,
      [ev4Id]
    );

    const ev5 = await db.query<{ id: string }>(
      `INSERT INTO timeline_events (
        id, workspace_id, title, description, year, date_display, date_precision, location, importance, created_by
       ) VALUES (
        'f0000000-0000-0000-0000-000000000005',
        $1,
        'Kỷ niệm đại gia đình: Bé Châu học làm món bánh của bà',
        'Cháu gái Nguyễn Mai Châu thực hành gói bánh theo lời bà kể và hướng dẫn của Bác An. Cả nhà cùng thưởng thức mẻ bánh giòn rụm.',
        2026,
        'Đầu năm 2026',
        'approximate',
        'Nhà Bác An - Hà Nội',
        'milestone',
        $2
       )
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [wsId, adminId]
    );
    const ev5Id = ev5.rows[0]?.id || "f0000000-0000-0000-0000-000000000005";
    await db.query(
      `INSERT INTO timeline_event_persons (event_id, person_id, role_description) 
       VALUES 
        ($1, $2, 'Bà nội'),
        ($1, $3, 'Bác Cả'),
        ($1, $4, 'Cháu gái học nghề') 
       ON CONFLICT DO NOTHING`,
      [ev5Id, baMaiId, bacAnId, maiChauId]
    );
    await db.query(
      `INSERT INTO timeline_event_assets (event_id, asset_id, caption) 
       VALUES ($1, 'd0000000-0000-0000-0000-000000000003', 'Đĩa bánh gối thành phẩm vàng ruộm') 
       ON CONFLICT DO NOTHING`,
      [ev5Id]
    );

    // 8. Khởi tạo Bản đồ tri thức mẫu cho P06 (Entities & Claims)
    await db.query(
      `INSERT INTO graph_entities (id, workspace_id, entity_type, name, aliases, description, created_by)
       VALUES
       ('70000000-0000-0000-0000-000000000001', $1, 'person', 'Bà Lê Thị Mai', ARRAY['Bà Nội', 'Bà Mai Bánh Gối'], 'Gốc làng nghề bánh gối phố cổ Hà Nội, người khởi nguồn công thức.', $2),
       ('70000000-0000-0000-0000-000000000002', $1, 'person', 'Bác Nguyễn Văn An', ARRAY['Bác Cả', 'Anh An'], 'Con trai cả bà Mai, người được bà truyền dạy bí quyết căn lửa dầu.', $2),
       ('70000000-0000-0000-0000-000000000003', $1, 'person', 'Nguyễn Mai Châu', ARRAY['Bé Châu'], 'Cháu gái thế hệ thứ 3, thực hành làm món bánh gia truyền.', $2),
       ('70000000-0000-0000-0000-000000000004', $1, 'place', 'Ngõ Hàng Chiếu - Phố Cổ', ARRAY['Góc chợ Đồng Xuân'], 'Nơi bà Mai gánh hàng bánh gối bán từ sáng sớm những năm 1965.', $2),
       ('70000000-0000-0000-0000-000000000005', $1, 'place', 'Gian bếp gia đình', ARRAY['Bếp nhà Bác An'], 'Không gian ấm cúng nơi con cháu quây quần học làm bánh cùng bà.', $2),
       ('70000000-0000-0000-0000-000000000006', $1, 'event', 'Gánh bánh rong 1965', ARRAY['Mùa thu 1965'], 'Mốc son bà bắt đầu mưu sinh nuôi gia đình bằng gánh bánh phố cổ.', $2),
       ('70000000-0000-0000-0000-000000000007', $1, 'skill', 'Bí quyết ủ bột xốp giòn', ARRAY['Pha bột bánh gối'], 'Tỷ lệ nước ấm vừa đủ và thời gian bột nghỉ một canh giờ để vỏ bánh phồng xốp không ngấm dầu.', $2),
       ('70000000-0000-0000-0000-000000000008', $1, 'skill', 'Kỹ năng căn nhiệt độ chảo dầu', ARRAY['Căn lửa chảo mỡ'], 'Thử đầu đũa tre sủi bọt tăm tăm, giữ lửa vừa để vỏ vàng đều không cháy mép.', $2),
       ('70000000-0000-0000-0000-000000000009', $1, 'skill', 'Công thức nước chấm đu đủ xanh', ARRAY['Nước mắm chua ngọt'], 'Định lượng giấm tỏi, đường và đu đủ xanh giòn ngâm chua truyền thống.', $2)
       ON CONFLICT (id) DO NOTHING`,
      [wsId, adminId]
    );

    await db.query(
      `INSERT INTO graph_claims (
        workspace_id, source_entity_id, target_entity_id, relation_type,
        statement, status, evidence_asset_id, evidence_quote, start_time_seconds, end_time_seconds, created_by, confirmed_by, confirmed_at
       ) VALUES
       (
         $1,
         '70000000-0000-0000-0000-000000000001',
         '70000000-0000-0000-0000-000000000007',
         'mastered',
         'Bà Mai nắm giữ bí quyết ủ bột xốp giòn gia truyền',
         'confirmed',
         'd0000000-0000-0000-0000-000000000001',
         'Bột mì thì phải chọn loại mịn, hòa nước ấm vừa tay, nhào đều rồi ủ lại cho bột thở.',
         30, 75,
         $2, $2, NOW()
       ),
       (
         $1,
         '70000000-0000-0000-0000-000000000001',
         '70000000-0000-0000-0000-000000000004',
         'sold_at',
         'Bà Mai bán gánh bánh gối ở Ngõ Hàng Chiếu phố cổ',
         'confirmed',
         'd0000000-0000-0000-0000-000000000001',
         'Năm ấy là độ sáu mươi lăm, bà bắt đầu gánh hàng bánh gối từ ngõ nhỏ Hàng Chiếu ra bán ở góc chợ.',
         0, 30,
         $2, $2, NOW()
       ),
       (
         $1,
         '70000000-0000-0000-0000-000000000001',
         '70000000-0000-0000-0000-000000000002',
         'taught',
         'Bà Mai truyền dạy kỹ năng căn nhiệt chảo dầu cho Bác An',
         'confirmed',
         'd0000000-0000-0000-0000-000000000002',
         'Thử đầu đũa tre vào chảo mỡ thấy sủi bọt tăm tăm thì mới thả bánh, không để mỡ quá già.',
         15, 55,
         $2, $2, NOW()
       ),
       (
         $1,
         '70000000-0000-0000-0000-000000000002',
         '70000000-0000-0000-0000-000000000008',
         'mastered',
         'Bác An thành thạo kỹ năng căn nhiệt độ chảo mỡ theo lời bà dặn',
         'confirmed',
         'd0000000-0000-0000-0000-000000000002',
         'Bác dặn Châu: chảo mỡ sủi tăm đều thì cho bánh vào, nghe xèo reo vui tai.',
         15, 55,
         $2, $2, NOW()
       ),
       (
         $1,
         '70000000-0000-0000-0000-000000000002',
         '70000000-0000-0000-0000-000000000003',
         'guided',
         'Bác An trực tiếp hướng dẫn Bé Châu thực hành làm bánh gối',
         'confirmed',
         'd0000000-0000-0000-0000-000000000003',
         'Hai bác cháu cùng đứng bếp gói từng chiếc bánh nếp gấp hình vỏ sò.',
         null, null,
         $2, $2, NOW()
       ),
       (
         $1,
         '70000000-0000-0000-0000-000000000001',
         '70000000-0000-0000-0000-000000000009',
         'created',
         'Bà Mai ghi chép công thức nước chấm đu đủ xanh vào sổ tay năm 1980',
         'confirmed',
         'd0000000-0000-0000-0000-000000000004',
         'Sổ tay ghi chép định lượng giấm tỏi ớt ngâm đu đủ xanh chua ngọt.',
         null, null,
         $2, $2, NOW()
       ),
       (
         $1,
         '70000000-0000-0000-0000-000000000003',
         '70000000-0000-0000-0000-000000000007',
         'interested_in',
         'AI đề xuất: Bé Châu quan tâm học bí quyết ủ bột xốp giòn của bà Mai',
         'proposed',
         'd0000000-0000-0000-0000-000000000001',
         'Cháu rất thích ăn vỏ bánh giòn của bà và muốn học cách ủ bột cho xốp.',
         200, 240,
         $2, null, null
       ),
       (
         $1,
         '70000000-0000-0000-0000-000000000006',
         '70000000-0000-0000-0000-000000000004',
         'occurred_at',
         'AI đề xuất: Sự kiện gánh bánh rong 1965 diễn ra tại ngõ Hàng Chiếu',
         'unverified',
         'd0000000-0000-0000-0000-000000000001',
         'Từ ngõ nhỏ Hàng Chiếu ra bán ở góc chợ Đồng Xuân.',
         10, 30,
         $2, null, null
       )
       ON CONFLICT DO NOTHING`,
      [wsId, adminId]
    );

    // 9. Khởi tạo Cẩm nang Tủ kinh nghiệm mẫu cho P07
    const manualRes = await db.query<{ id: string }>(
      `INSERT INTO practice_manuals (
        id, workspace_id, skill_entity_id, title, summary, cover_asset_id,
        status, version_number, ingredients, steps, approved_by, approved_at, created_by
       ) VALUES (
        '80000000-0000-0000-0000-000000000001',
        $1,
        '70000000-0000-0000-0000-000000000007',
        'Bí quyết làm bánh gối giòn xốp gia truyền của bà Mai',
        'Cẩm nang hướng dẫn đầy đủ cách làm vỏ bánh giòn tan không ngấm mỡ, ướp nhân thịt mộc nhĩ chuẩn vị phố cổ và kỹ thuật căn lửa chảo dầu truyền qua ba thế hệ.',
        'd0000000-0000-0000-0000-000000000003',
        'approved',
        1,
        $2,
        $3,
        $4,
        NOW(),
        $4
       )
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [
        wsId,
        JSON.stringify([
          { name: "Đũa tre già", amount: "1 đôi", category: "tool", notes: "Dùng để thử độ sôi tăm tăm của chảo mỡ" },
          { name: "Chảo gang sâu lòng", amount: "1 chiếc", category: "tool", notes: "Giúp giữ nhiệt dầu ổn định" },
          { name: "Khăn xô ẩm", amount: "1 chiếc", category: "tool", notes: "Dùng đậy âu bột khi ủ nghỉ 1 canh giờ" },
          { name: "Bột mì hoa ngọc lan", amount: "500g", category: "ingredient", notes: "Bột loại mịn, mới mở túi" },
          { name: "Nước ấm khoảng 40°C", amount: "220ml", category: "ingredient", notes: "Không dùng nước sôi sẽ chín bột, không dùng nước lạnh bột sẽ chai" },
          { name: "Trứng gà ta", amount: "1 quả", category: "ingredient", notes: "Giúp vỏ vàng óng và phồng xốp" },
          { name: "Thịt nạc vai dăm băm", amount: "350g", category: "ingredient", notes: "Chọn thịt có chút mỡ để nhân mềm ngọt" },
          { name: "Miến dong, mộc nhĩ, nấm hương", amount: "100g", category: "ingredient", notes: "Ngâm nở, vắt ráo kiệt nước trước khi thái" },
          { name: "Trứng cút luộc", amount: "15 quả", category: "ingredient" },
          { name: "Hạt tiêu sọ xay", amount: "2 thìa cà phê", category: "seasoning", notes: "Dậy mùi thơm đặc trưng truyền thống" }
        ]),
        JSON.stringify([
          {
            step_number: 1,
            title: "Pha và nhào ủ bột",
            instructions: "Đổ bột mì ra âu sạch, khoét lỗ ở giữa rồi cho trứng, dầu ăn và nước ấm pha muối vào. Nhào đều tay từ trong ra ngoài đến khi khối bột mềm dẻo. Dùng khăn ẩm bọc kín ủ nghỉ đúng 60 phút.",
            success_signs: "Khối bột mịn màng, không dính tay, ấn nhẹ ngón tay vào thấy bột từ từ đàn hồi trở lại.",
            evidence_asset_id: "d0000000-0000-0000-0000-000000000001",
            evidence_quote: "Bột mì thì phải chọn loại mịn, hòa nước ấm vừa tay, nhào đều rồi ủ lại cho bột thở.",
            start_time_seconds: 30,
            end_time_seconds: 75
          },
          {
            step_number: 2,
            title: "Trộn và ướp nhân bánh truyền thống",
            instructions: "Miến dong ngâm mềm cắt vụn 1cm, mộc nhĩ nấm hương băm nhỏ. Trộn đều cùng thịt nạc dăm, nêm nước mắm cốt ngon, một thìa hạt tiêu bắc sọ xay và hành khô băm.",
            success_signs: "Nhân bánh dẻo quyện, dậy mùi thơm nồng của hạt tiêu bắc, không bị ứa nước.",
            evidence_asset_id: "d0000000-0000-0000-0000-000000000001",
            evidence_quote: "Nhân bánh thì có miến dong, mộc nhĩ, thịt nạc dăm và chút hạt tiêu bắc.",
            start_time_seconds: 75,
            end_time_seconds: 130
          },
          {
            step_number: 3,
            title: "Cán vỏ và xếp nếp gấp vỏ sò",
            instructions: "Chia bột thành viên nhỏ 30g, cán mỏng tròn đường kính 12cm. Cho một muỗng nhân và 1 quả trứng cút vào giữa, gập đôi lại. Dùng đầu ngón tay miết chặt mép rồi xếp chéo nếp vỏ sò đều tăm tắp.",
            success_signs: "Mép bánh dính khít hoàn toàn, nếp gấp vỏ sò sắc nét, không bị hở nhân làm ngấm dầu khi chiên.",
            evidence_asset_id: "d0000000-0000-0000-0000-000000000001",
            evidence_quote: "Gói phải khéo mép gấp nếp hình vỏ sò.",
            start_time_seconds: 75,
            end_time_seconds: 130
          },
          {
            step_number: 4,
            title: "Kỹ thuật căn lửa chảo mỡ & chiên giòn",
            instructions: "Đổ mỡ/dầu ngập 1/2 thân bánh. Cắm đầu đũa tre xuống thấy bọt tăm sủi đều quanh đũa thì thả bánh vào. Giữ lửa vừa, trở mặt bánh 2 lần đến khi vỏ phồng căng màu vàng hổ phách thì gắp ra giá ráo.",
            success_signs: "Khi thả bánh nghe tiếng xèo reo vui tai, vỏ bánh phồng xốp rộp giòn tan, không ngấm dầu hay cháy mép.",
            evidence_asset_id: "d0000000-0000-0000-0000-000000000002",
            evidence_quote: "Thử đầu đũa tre vào chảo mỡ thấy sủi bọt tăm tăm thì mới thả bánh, không để mỡ quá già sẽ khét vỏ mà sống nhân.",
            start_time_seconds: 15,
            end_time_seconds: 55
          },
          {
            step_number: 5,
            title: "Pha nước mắm chua ngọt đu đủ xanh",
            instructions: "Pha theo tỷ lệ chuẩn trong sổ tay: 1 mắm - 1 giấm gạo - 1 đường - 4 nước ấm. Khuấy tan, thả tỏi ớt băm nhuyễn và đu đủ xanh thái lát mỏng ngâm giòn chua lên bề mặt.",
            success_signs: "Đu đủ giòn sần sật, nước mắm thơm dịu vị chua ngọt cân đối, tỏi ớt nổi đẹp mắt trên mặt bát.",
            evidence_asset_id: "d0000000-0000-0000-0000-000000000004",
            evidence_quote: "Sổ tay ghi chép định lượng giấm tỏi ớt ngâm đu đủ xanh chua ngọt."
          }
        ]),
        adminId
      ]
    );
    const manualId = manualRes.rows[0]?.id || "80000000-0000-0000-0000-000000000001";

    // Thêm câu hỏi thực hành
    await db.query(
      `INSERT INTO manual_practice_notes (
        workspace_id, manual_id, user_id, question, answer, answered_by, answered_at
       ) VALUES
       (
         $1, $2, $3,
         'Bà ơi nếu trời mùa đông lạnh thì thời gian ủ bột có cần tăng thêm không ạ?',
         'Đúng rồi cháu, mùa đông bột lâu nở hơn nên cháu ủ tầm 1 tiếng rưỡi hoặc bọc âu bột bằng khăn ấm nhé.',
         $4, NOW()
       ),
       (
         $1, $2, $5,
         'Lúc rán bánh có nên đậy vung chảo không bác An?',
         null,
         null, null
       )
       ON CONFLICT DO NOTHING`,
      [wsId, manualId, DEMO_USERS[2].id, adminId, DEMO_USERS[1].id]
    );
  }

  // Tự động bổ sung kho dữ liệu mẫu phong phú 4 thế hệ, cẩm nang và tư liệu
  await enrichFullFamilyData(db);
}
