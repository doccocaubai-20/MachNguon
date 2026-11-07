import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import fs from "node:fs";

const wsId = "a0000000-0000-0000-0000-000000000001";
const adminId = "11111111-1111-1111-1111-111111111111"; // Bác An
const contributorId = "22222222-2222-2222-2222-222222222222"; // Chú Bình
const viewerId = "33333333-3333-3333-3333-333333333333"; // Bé Châu

export async function enrichData(db) {
  console.log("=== BẮT ĐẦU NẠP DỮ LIỆU MẪU ĐA DẠNG CHO MẠCH NGUỒN ===");

  // 1. PERSONS (4 Thế hệ dòng họ)
  const persons = [
    {
      id: "c0000000-0000-0000-0000-000000000001",
      full_name: "Bà Lê Thị Mai",
      nick_name: "Bà Nội",
      gender: "female",
      birth_date: "1936",
      bio: "Gốc làng nghề bánh gối phố cổ Hà Nội. Nắm giữ bí quyết pha bột giòn xốp, căn lửa chảo mỡ và cá chép kho mật mía mục xương.",
      linked_user_id: null,
    },
    {
      id: "c0000000-0000-0000-0000-000000000002",
      full_name: "Bác Nguyễn Văn An",
      nick_name: "Bác Cả",
      gender: "male",
      birth_date: "1960",
      bio: "Con trai cả của bà Mai. Kỹ sư cơ khí, người kế thừa chiếc đồng hồ cổ của cụ Phúc và chủ động số hóa kho ký ức gia đình.",
      linked_user_id: adminId,
    },
    {
      id: "c0000000-0000-0000-0000-000000000003",
      full_name: "Nguyễn Mai Châu",
      nick_name: "Bé Châu",
      gender: "female",
      birth_date: "2002",
      bio: "Cháu gái thế hệ thứ 4. Sinh viên tốt nghiệp công nghệ, đam mê học nấu ăn truyền thống và xây dựng bảo tàng số gia đình.",
      linked_user_id: viewerId,
    },
    {
      id: "c0000000-0000-0000-0000-000000000004",
      full_name: "Cụ Nguyễn Văn Phúc",
      nick_name: "Cụ Cố",
      gender: "male",
      birth_date: "1908",
      bio: "Cụ cố sinh tại làng gốm Bát Tràng (1908 - 1985). Thợ cả nung gốm nức tiếng, người đặt nền móng nề nếp gia phong, tính tình cẩn trọng, trọng chữ Tín.",
      linked_user_id: null,
    },
    {
      id: "c0000000-0000-0000-0000-000000000005",
      full_name: "Cụ bà Trần Thị Thoa",
      nick_name: "Cụ Bà",
      gender: "female",
      birth_date: "1912",
      bio: "Cụ bà (1912 - 1994) người Tràng An gốc, thạo nghề thêu ren và truyền dạy các bài thuốc ngâm rượu gừng nghệ hạ thổ chăm sóc sản phụ.",
      linked_user_id: null,
    },
    {
      id: "c0000000-0000-0000-0000-000000000006",
      full_name: "Ông Nguyễn Văn Khiêm",
      nick_name: "Ông Nội",
      gender: "male",
      birth_date: "1932",
      bio: "Ông nội (1932 - 2005), cựu chiến binh chống Mỹ. Từng trực tiếp chiến đấu tại thành cổ Quảng Trị hè 1972, lưu giữ bức thư tiền tuyến xúc động.",
      linked_user_id: null,
    },
    {
      id: "c0000000-0000-0000-0000-000000000007",
      full_name: "Cô Nguyễn Thị Thu Hương",
      nick_name: "Cô Hương",
      gender: "female",
      birth_date: "1968",
      bio: "Con gái thứ của bà Mai. Giáo viên dạy văn, người nâng niu từng bức thư tay, cuốn sổ nhật ký và bài thơ của gia đình qua các thời kỳ.",
      linked_user_id: null,
    },
    {
      id: "c0000000-0000-0000-0000-000000000008",
      full_name: "Chú Nguyễn Thanh Bình",
      nick_name: "Chú Bình",
      gender: "male",
      birth_date: "1975",
      bio: "Con trai út của bà Mai. Kiến trúc sư, người phục chế ảnh đen trắng thời chiến và số hóa toàn bộ tư liệu giấy của dòng họ.",
      linked_user_id: contributorId,
    },
    {
      id: "c0000000-0000-0000-0000-000000000009",
      full_name: "Nguyễn Minh Khang",
      nick_name: "Cháu Khang",
      gender: "male",
      birth_date: "2006",
      bio: "Cháu trai thế hệ thứ 4. Học sinh cấp 3, ham thích tìm hiểu lịch sử kháng chiến và câu chuyện thời ông nội chiến đấu ở Quảng Trị.",
      linked_user_id: null,
    },
  ];

  for (const p of persons) {
    await db.query(
      `INSERT INTO persons (id, workspace_id, full_name, nick_name, gender, birth_date, bio, linked_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         nick_name = EXCLUDED.nick_name,
         gender = EXCLUDED.gender,
         birth_date = EXCLUDED.birth_date,
         bio = EXCLUDED.bio,
         linked_user_id = EXCLUDED.linked_user_id`,
      [p.id, wsId, p.full_name, p.nick_name, p.gender, p.birth_date, p.bio, p.linked_user_id]
    );
  }
  console.log(`✓ Đã nạp ${persons.length} hồ sơ người thân (4 thế hệ)`);

  // Quan hệ phả hệ 2 chiều
  const relationships = [
    { p1: "c0000000-0000-0000-0000-000000000004", p2: "c0000000-0000-0000-0000-000000000005", type: "spouse", notes: "Vợ chồng cụ cố" },
    { p1: "c0000000-0000-0000-0000-000000000005", p2: "c0000000-0000-0000-0000-000000000004", type: "spouse", notes: "Vợ chồng cụ cố" },
    { p1: "c0000000-0000-0000-0000-000000000004", p2: "c0000000-0000-0000-0000-000000000006", type: "parent", notes: "Cha ruột" },
    { p1: "c0000000-0000-0000-0000-000000000006", p2: "c0000000-0000-0000-0000-000000000004", type: "child", notes: "Con trai" },
    { p1: "c0000000-0000-0000-0000-000000000006", p2: "c0000000-0000-0000-0000-000000000001", type: "spouse", notes: "Vợ chồng ông bà nội" },
    { p1: "c0000000-0000-0000-0000-000000000001", p2: "c0000000-0000-0000-0000-000000000006", type: "spouse", notes: "Vợ chồng ông bà nội" },
    { p1: "c0000000-0000-0000-0000-000000000001", p2: "c0000000-0000-0000-0000-000000000002", type: "parent", notes: "Mẹ ruột" },
    { p1: "c0000000-0000-0000-0000-000000000002", p2: "c0000000-0000-0000-0000-000000000001", type: "child", notes: "Con trai cả" },
    { p1: "c0000000-0000-0000-0000-000000000001", p2: "c0000000-0000-0000-0000-000000000007", type: "parent", notes: "Mẹ ruột" },
    { p1: "c0000000-0000-0000-0000-000000000007", p2: "c0000000-0000-0000-0000-000000000001", type: "child", notes: "Con gái thứ" },
    { p1: "c0000000-0000-0000-0000-000000000001", p2: "c0000000-0000-0000-0000-000000000008", type: "parent", notes: "Mẹ ruột" },
    { p1: "c0000000-0000-0000-0000-000000000008", p2: "c0000000-0000-0000-0000-000000000001", type: "child", notes: "Con trai út" },
    { p1: "c0000000-0000-0000-0000-000000000002", p2: "c0000000-0000-0000-0000-000000000007", type: "sibling", notes: "Anh em ruột" },
    { p1: "c0000000-0000-0000-0000-000000000002", p2: "c0000000-0000-0000-0000-000000000008", type: "sibling", notes: "Anh em ruột" },
    { p1: "c0000000-0000-0000-0000-000000000002", p2: "c0000000-0000-0000-0000-000000000003", type: "parent", notes: "Bố ruột" },
    { p1: "c0000000-0000-0000-0000-000000000003", p2: "c0000000-0000-0000-0000-000000000002", type: "child", notes: "Con gái" },
    { p1: "c0000000-0000-0000-0000-000000000008", p2: "c0000000-0000-0000-0000-000000000009", type: "parent", notes: "Bố ruột" },
    { p1: "c0000000-0000-0000-0000-000000000009", p2: "c0000000-0000-0000-0000-000000000008", type: "child", notes: "Con trai" },
    { p1: "c0000000-0000-0000-0000-000000000001", p2: "c0000000-0000-0000-0000-000000000003", type: "grandparent", notes: "Bà nội" },
    { p1: "c0000000-0000-0000-0000-000000000003", p2: "c0000000-0000-0000-0000-000000000001", type: "grandchild", notes: "Cháu gái nội" },
    { p1: "c0000000-0000-0000-0000-000000000001", p2: "c0000000-0000-0000-0000-000000000009", type: "grandparent", notes: "Bà nội" },
    { p1: "c0000000-0000-0000-0000-000000000009", p2: "c0000000-0000-0000-0000-000000000001", type: "grandchild", notes: "Cháu trai nội" },
  ];

  for (const r of relationships) {
    await db.query(
      `INSERT INTO person_relationships (workspace_id, person_id, related_person_id, relationship_type, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [wsId, r.p1, r.p2, r.type, r.notes]
    );
  }
  console.log(`✓ Đã nạp ${relationships.length} quan hệ phả hệ đa thế hệ`);

  // 2. ASSETS
  const assets = [
    {
      id: "d0000000-0000-0000-0000-000000000001",
      asset_type: "audio",
      file_name: "ba_mai_ke_chuyen_banh_goi.mp3",
      file_path: "/samples/ba_mai_ke_chuyen_banh_goi.mp3",
      mime_type: "audio/mpeg",
      byte_size: 4120000,
      duration_seconds: 255,
      narrator_id: "c0000000-0000-0000-0000-000000000001",
      title: "Bà kể về xuất xứ gánh bánh gối phố cổ và bí quyết ủ bột xốp",
      description: "Ghi âm trực tiếp tại nhà bà Mai vào sáng Chủ nhật. Bà nhắc kỹ tỷ lệ nước ấm và ủ bột thở 1 canh giờ.",
    },
    {
      id: "d0000000-0000-0000-0000-000000000002",
      asset_type: "audio",
      file_name: "ba_mai_can_lua_dau.mp3",
      file_path: "/samples/ba_mai_can_lua_dau.mp3",
      mime_type: "audio/mpeg",
      byte_size: 3250000,
      duration_seconds: 200,
      narrator_id: "c0000000-0000-0000-0000-000000000001",
      title: "Bí quyết căn lửa dầu và dấu hiệu mép bánh vàng giòn",
      description: "Bà dặn thử đầu đũa tre sủi bọt tăm tăm mới thả bánh, giữ lửa vừa để vỏ bánh phồng xốp không ngấm mỡ.",
    },
    {
      id: "d0000000-0000-0000-0000-000000000005",
      asset_type: "audio",
      file_name: "ong_khiem_thu_quang_tri_1972.mp3",
      file_path: "/samples/ong_khiem_thu_quang_tri_1972.mp3",
      mime_type: "audio/mpeg",
      byte_size: 3840000,
      duration_seconds: 240,
      narrator_id: "c0000000-0000-0000-0000-000000000006",
      title: "Bức thư từ chiến trường Quảng Trị gửi về khu sơ tán hè 1972",
      description: "Bản thu giọng đọc bức thư viết tay của Ông Khiêm bên bờ sông Thạch Hãn gửi về động viên bà Mai và các con.",
    },
    {
      id: "d0000000-0000-0000-0000-000000000006",
      asset_type: "audio",
      file_name: "ba_mai_kho_ca_chep.mp3",
      file_path: "/samples/ba_mai_kho_ca_chep.mp3",
      mime_type: "audio/mpeg",
      byte_size: 3600000,
      duration_seconds: 220,
      narrator_id: "c0000000-0000-0000-0000-000000000001",
      title: "Bí quyết kho cá chép mục xương đượm vị mật mía ngày Tết",
      description: "Bà Mai kể về niêu cá kho Tết thời bao cấp, cách lót riềng già dưới đáy nồi đất và ủ trấu 12 tiếng liên tục.",
    },
    {
      id: "d0000000-0000-0000-0000-000000000007",
      asset_type: "audio",
      file_name: "bac_an_ke_dong_ho_cu_phuc.mp3",
      file_path: "/samples/bac_an_ke_dong_ho_cu_phuc.mp3",
      mime_type: "audio/mpeg",
      byte_size: 3100000,
      duration_seconds: 190,
      narrator_id: "c0000000-0000-0000-0000-000000000002",
      title: "Kỷ vật chiếc đồng hồ quả lắc Odo Pháp 1930 và bài học chữ Tín",
      description: "Bác An bồi hồi kể về chiếc đồng hồ quả lắc của Cụ Phúc, lời răn dạy sự đúng giờ và giữ trọn lời hứa của gia đình.",
    },
    {
      id: "d0000000-0000-0000-0000-000000000008",
      asset_type: "audio",
      file_name: "co_huong_ngam_ruou_gung_nghe.mp3",
      file_path: "/samples/co_huong_ngam_ruou_gung_nghe.mp3",
      mime_type: "audio/mpeg",
      byte_size: 2980000,
      duration_seconds: 185,
      narrator_id: "c0000000-0000-0000-0000-000000000007",
      title: "Bí quyết ngâm rượu gừng nghệ nếp hạ thổ 100 ngày của cụ Thoa",
      description: "Cô Thu Hương truyền lại bài thuốc dân gian gia truyền chăm sóc phụ nữ sau sinh, giữ ấm cơ thể mùa đông.",
    },
    {
      id: "d0000000-0000-0000-0000-000000000003",
      asset_type: "image",
      file_name: "banh_goi_thanh_pham.jpg",
      file_path: "/samples/banh_goi_thanh_pham.jpg",
      mime_type: "image/jpeg",
      byte_size: 1540000,
      duration_seconds: null,
      narrator_id: "c0000000-0000-0000-0000-000000000001",
      title: "Đĩa bánh gối vàng ruộm vừa vớt ra khỏi chảo của bà Mai",
      description: "Chụp góc cận cảnh vỏ bánh phồng xốp xếp cùng đĩa rau sống và bát nước chấm đu đủ xanh.",
    },
    {
      id: "d0000000-0000-0000-0000-000000000009",
      asset_type: "image",
      file_name: "dong_ho_odo_1930.jpg",
      file_path: "/samples/dong_ho_odo_1930.jpg",
      mime_type: "image/jpeg",
      byte_size: 1820000,
      duration_seconds: null,
      narrator_id: "c0000000-0000-0000-0000-000000000002",
      title: "Kỷ vật chiếc đồng hồ quả lắc Odo Pháp 1930 của Cụ Phúc",
      description: "Ảnh chụp chiếc đồng hồ gỗ cổ treo trang trọng ở phòng khách, chạy đúng giờ suốt gần một thế kỷ.",
    },
    {
      id: "d0000000-0000-0000-0000-000000000010",
      asset_type: "image",
      file_name: "noi_ca_kho_ngay_tet.jpg",
      file_path: "/samples/noi_ca_kho_ngay_tet.jpg",
      mime_type: "image/jpeg",
      byte_size: 1950000,
      duration_seconds: null,
      narrator_id: "c0000000-0000-0000-0000-000000000001",
      title: "Niêu đất cá chép kho mật mía mục xương thơm ngát đêm 30 Tết",
      description: "Khúc cá màu cánh gián bóng bẩy, thịt chắc đượm hương riềng già và mật mía nồng nàn.",
    },
    {
      id: "d0000000-0000-0000-0000-000000000011",
      asset_type: "image",
      file_name: "hu_ruou_gung_nghe.jpg",
      file_path: "/samples/hu_ruou_gung_nghe.jpg",
      mime_type: "image/jpeg",
      byte_size: 1420000,
      duration_seconds: null,
      narrator_id: "c0000000-0000-0000-0000-000000000007",
      title: "Hũ sành gốm Bát Tràng ngâm rượu gừng nghệ nếp hạ thổ",
      description: "Bình rượu màu vàng hổ phách sóng sánh như mật ong sau 100 ngày hạ thổ dưới gốc cây bưởi.",
    },
    {
      id: "d0000000-0000-0000-0000-000000000004",
      asset_type: "document",
      file_name: "so_tay_cong_thuc_1980.pdf",
      file_path: "/samples/so_tay_cong_thuc_1980.pdf",
      mime_type: "application/pdf",
      byte_size: 2800000,
      duration_seconds: null,
      narrator_id: "c0000000-0000-0000-0000-000000000001",
      title: "Sổ tay công thức ẩm thực chép tay năm 1980 của bà Mai",
      description: "Bản scan sổ tay màu giấy ngả vàng, ghi chép định lượng gia vị ướp bánh và bí quyết cá kho ngày Tết.",
    },
    {
      id: "d0000000-0000-0000-0000-000000000012",
      asset_type: "document",
      file_name: "la_thu_quang_tri_1972.pdf",
      file_path: "/samples/la_thu_quang_tri_1972.pdf",
      mime_type: "application/pdf",
      byte_size: 3100000,
      duration_seconds: null,
      narrator_id: "c0000000-0000-0000-0000-000000000006",
      title: "Bản scan bức thư tay viết bằng mực tím từ chiến trường Quảng Trị 1972",
      description: "Bút tích của Ông Khiêm viết gửi về cho bà Mai và các con, còn nguyên vẹn nét chữ và dấu mộc quân bưu.",
    },
  ];

  for (const a of assets) {
    await db.query(
      `INSERT INTO assets (
        id, workspace_id, asset_type, file_name, file_path, mime_type, byte_size,
        duration_seconds, uploaded_by, narrator_id, title, description, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ready')
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         duration_seconds = EXCLUDED.duration_seconds`,
      [a.id, wsId, a.asset_type, a.file_name, a.file_path, a.mime_type, a.byte_size, a.duration_seconds, adminId, a.narrator_id, a.title, a.description]
    );
  }
  console.log(`✓ Đã nạp ${assets.length} tư liệu gốc (Audio, Hình ảnh, Tài liệu scan)`);

  // 3. GRAPH ENTITIES (Phải nạp trước practice_manuals)
  const entities = [
    { id: "70000000-0000-0000-0000-000000000001", type: "person", name: "Bà Lê Thị Mai", aliases: ["Bà Nội", "Bà Mai Bánh Gối"], desc: "Gốc làng nghề bánh gối phố cổ Hà Nội, người khởi nguồn các công thức ẩm thực gia truyền." },
    { id: "70000000-0000-0000-0000-000000000002", type: "person", name: "Bác Nguyễn Văn An", aliases: ["Bác Cả", "Anh An"], desc: "Con trai cả bà Mai, người kế thừa đồng hồ cổ và trực tiếp số hóa kho ký ức." },
    { id: "70000000-0000-0000-0000-000000000003", type: "person", name: "Nguyễn Mai Châu", aliases: ["Bé Châu"], desc: "Cháu gái thế hệ thứ 4, thực hành làm món ăn gia truyền và lưu giữ di sản số." },
    { id: "70000000-0000-0000-0000-000000000004", type: "place", name: "Ngõ Hàng Chiếu - Phố Cổ", aliases: ["Góc chợ Đồng Xuân"], desc: "Nơi bà Mai gánh hàng bánh gối bán từ sáng sớm những năm 1965." },
    { id: "70000000-0000-0000-0000-000000000005", type: "place", name: "Gian bếp gia đình", aliases: ["Bếp nhà Bác An"], desc: "Không gian ấm cúng nơi con cháu quây quần học làm bánh cùng bà." },
    { id: "70000000-0000-0000-0000-000000000006", type: "event", name: "Gánh bánh rong 1965", aliases: ["Mùa thu 1965"], desc: "Mốc son bà Mai bắt đầu gánh bánh rong mưu sinh nuôi cả gia đình." },
    { id: "70000000-0000-0000-0000-000000000007", type: "skill", name: "Bí quyết ủ bột xốp giòn", aliases: ["Pha bột bánh gối"], desc: "Tỷ lệ nước ấm và bột nghỉ 1 canh giờ để vỏ bánh phồng xốp không ngấm dầu." },
    { id: "70000000-0000-0000-0000-000000000008", type: "skill", name: "Kỹ năng căn nhiệt độ chảo dầu", aliases: ["Căn lửa chảo mỡ"], desc: "Thử đầu đũa tre sủi bọt tăm tăm, giữ lửa vừa để vỏ phồng đều vàng ruộm." },
    { id: "70000000-0000-0000-0000-000000000009", type: "skill", name: "Công thức nước chấm đu đủ xanh", aliases: ["Nước mắm chua ngọt"], desc: "Tỷ lệ 1 mắm - 1 giấm - 1 đường - 4 nước ấm ngâm đu đủ giòn sần sật." },
    { id: "70000000-0000-0000-0000-000000000010", type: "skill", name: "Bí quyết kho cá chép mục xương", aliases: ["Cá kho mật mía đun trấu"], desc: "Đun niêu đất than trấu liu riu 12 tiếng liên tục với mật mía và riềng già." },
    { id: "70000000-0000-0000-0000-000000000011", type: "skill", name: "Bài thuốc rượu gừng nghệ hạ thổ", aliases: ["Rượu hạ thổ 100 ngày"], desc: "Ngâm gừng ré nghệ nếp trong hũ sành Bát Tràng hạ thổ 100 ngày cho sản phụ." },
    { id: "70000000-0000-0000-0000-000000000012", type: "skill", name: "Gìn giữ đồng hồ quả lắc Odo Pháp 1930", aliases: ["Đồng hồ Cụ Phúc", "Kỷ vật gia bảo"], desc: "Kỷ vật gia bảo gần 100 năm, biểu trưng cho chữ Tín và sự đúng giờ của gia đình." }
  ];

  for (const ent of entities) {
    await db.query(
      `INSERT INTO graph_entities (id, workspace_id, entity_type, name, aliases, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description`,
      [ent.id, wsId, ent.type, ent.name, ent.aliases, ent.desc, adminId]
    );
  }
  console.log(`✓ Đã nạp ${entities.length} thực thể tri thức (Người, Địa danh, Sự kiện, Kỹ năng, Kỷ vật)`);

  // 4. STORIES
  const stories = [
    {
      id: "e0000000-0000-0000-0000-000000000001",
      narrator_id: "c0000000-0000-0000-0000-000000000001",
      primary_asset_id: "d0000000-0000-0000-0000-000000000001",
      title: "Ký ức gánh bánh gối phố cổ và bí quyết ủ bột của bà Mai",
      summary: "Câu chuyện về những năm tháng gánh bánh rong quanh phố cổ Hà Nội và bí quyết làm vỏ bánh phồng xốp truyền qua ba thế hệ.",
      content: `Năm 1965, khi phố cổ Hà Nội còn nhiều tiếng tàu điện leng keng, bà bắt đầu gánh hàng bánh gối từ ngõ nhỏ Hàng Chiếu ra bán ở góc chợ.\n\nMỗi buổi sáng bà dậy từ 4 giờ để nhào bột. Thời ấy không có máy móc, mọi công đoạn đều dùng đôi bàn tay. Bà dặn: bí quyết vỏ bánh giòn tan không ngấm dầu nằm ở chỗ pha nước ấm vừa đủ và để bột nghỉ đúng một canh giờ.\n\nKhi thả vào chảo mỡ, phải căn lúc mỡ vừa sôi tăm tăm, nghe tiếng xèo xèo reo vui thì vỏ bánh mới phồng đều thành màu vàng hổ phách. Đó không chỉ là món ăn nuôi sống cả nhà qua năm tháng gian khó, mà còn là tình cảm bà gửi gắm cho con cháu mai sau.`,
      category: "ẩm thực & gia đình",
      evidence: [
        { asset_id: "d0000000-0000-0000-0000-000000000001", start: 30, end: 75, quote: "Bột mì thì phải chọn loại mịn, hòa nước ấm vừa tay, nhào đều rồi ủ lại cho bột thở đúng một canh giờ." },
        { asset_id: "d0000000-0000-0000-0000-000000000002", start: 15, end: 55, quote: "Thử đầu đũa tre vào chảo mỡ thấy sủi bọt tăm tăm thì mới thả bánh, không để mỡ quá già sẽ khét vỏ mà sống nhân." }
      ],
      segments: [
        { order: 1, start: 0, end: 30, speaker: "Bà Lê Thị Mai", text: "Năm ấy là độ sáu mươi lăm, phố cổ còn vắng lắm, sáng sớm tinh mơ chỉ nghe thấy tiếng bánh sắt tàu điện chạy trên đường ray." },
        { order: 2, start: 30, end: 75, speaker: "Bà Lê Thị Mai", text: "Mỗi sáng bà phải thức từ bốn giờ. Bột mì thì phải chọn loại mịn, hòa nước ấm vừa tay, nhào đều rồi ủ lại cho bột thở." },
        { order: 3, start: 75, end: 130, speaker: "Bà Lê Thị Mai", text: "Nhân bánh thì có miến dong, mộc nhĩ, thịt nạc dăm và chút hạt tiêu bắc. Gói phải khéo mép gấp nếp hình vỏ sò." }
      ]
    },
    {
      id: "e0000000-0000-0000-0000-000000000002",
      narrator_id: "c0000000-0000-0000-0000-000000000006",
      primary_asset_id: "d0000000-0000-0000-0000-000000000005",
      title: "Mùa sơ tán năm 1972 và bức thư từ chiến trường Quảng Trị của ông nội",
      summary: "Ký ức thời chiến tranh khốc liệt, bức thư tay mực tím gửi từ thành cổ Quảng Trị mùa hè 1972 sưởi ấm căn nhà sơ tán nơi hậu phương.",
      content: `Mùa hè năm 1972, máy bay Mỹ ném bom ác liệt, bà Mai bồng bế các con sơ tán về vùng ngoại thành Đông Anh. Những đêm ngửa mặt nhìn lên bầu trời đỏ rực ánh chớp bom, lòng bà như thắt lại vì biết ông Khiêm đang ở chảo lửa Quảng Trị.\n\nThế rồi một buổi chiều tháng Tám, chú liên lạc quân bưu đạp chiếc xe đạp cà tàng mang đến một phong thư gấp nếp mép đã ngả màu khói súng. Nét chữ mực tím quen thuộc của ông Khiêm hiện lên nắn nót: 'Em Mai và các con yêu quý... Đêm nay bên bờ sông Thạch Hãn tiếng pháo vừa dứt. Anh ngồi dưới hầm chữ A tranh thủ viết mấy dòng gửi về...'.\n\nLá thư ấy bà Mai bọc trong ba lớp nilon giấu kỹ đáy vali, là điểm tựa tinh thần vững vàng nuôi lớn ba đứa con trưởng thành.`,
      category: "kháng chiến & ký ức",
      evidence: [
        { asset_id: "d0000000-0000-0000-0000-000000000005", start: 0, end: 40, quote: "Quảng Trị, đêm ngày 15 tháng 7 năm 1972. Em Mai và các con yêu quý của anh... Đêm nay bên bờ sông Thạch Hãn tiếng pháo vừa dứt." },
        { asset_id: "d0000000-0000-0000-0000-000000000005", start: 40, end: 85, quote: "Thằng An lớn rồi, phải biết giúp mẹ gánh nước, bổ củi và chăm sóc các em thay bố nhé." }
      ],
      segments: [
        { order: 1, start: 0, end: 40, speaker: "Ông Nguyễn Văn Khiêm", text: "Quảng Trị, đêm ngày 15 tháng 7 năm 1972. Em Mai và các con yêu quý của anh. Đêm nay bên bờ sông Thạch Hãn tiếng pháo vừa dứt." },
        { order: 2, start: 40, end: 85, speaker: "Ông Nguyễn Văn Khiêm", text: "Nghe tin mẹ con em đã sơ tán an toàn về ngoại thành, anh mừng rơi nước mắt. Mấy đứa nhỏ An và Hương có ngoan không em?" },
        { order: 3, start: 85, end: 140, speaker: "Ông Nguyễn Văn Khiêm", text: "Ở chiến trường khốc liệt nhưng anh em đồng đội luôn kiên cường. Nhất định ngày đất nước thống nhất anh sẽ về bên em và các con." }
      ]
    },
    {
      id: "e0000000-0000-0000-0000-000000000003",
      narrator_id: "c0000000-0000-0000-0000-000000000001",
      primary_asset_id: "d0000000-0000-0000-0000-000000000006",
      title: "Nồi cá chép kho mật mía mục xương ngày Tết thời bao cấp của bà Mai",
      summary: "Bí quyết kho niêu cá chép ăn Tết của người Hà Nội xưa: đun lửa than trấu ròng rã 12 tiếng để xương cá mềm tan mà thịt săn chắc đậm đà.",
      content: `Thời bao cấp, tiêu chuẩn Tết mỗi nhà chỉ được vài lạng thịt và một con cá chép sông mua bằng phiếu thực phẩm. Con cá chép ấy qua bàn tay khéo léo của bà Mai trở thành món ăn linh hồn trong mâm cỗ tất niên.\n\nBà dặn: Kho cá tuyệt đối không dùng nước hàng công nghiệp mà phải dùng mật mía làng nghề. Dưới đáy nồi đất lót một lớp riềng già thái lát mỏng và vài đốt mía chẻ đôi. Khi xếp cá vào nồi thì chèn thêm chút mỡ phần và hạt tiêu sọ.\n\nNiêu cá được vùi trong trấu sôi sùng sục liu riu từ chiều 29 đến sáng 30 Tết. Khi mở nắp vung, mùi thơm bốc lên ngào ngạt khắp ngõ nhỏ, từng khúc cá màu cánh gián bóng bẩy, thịt cá ngọt đậm, xương mềm tan như bơ mà không hề nát khúc.`,
      category: "ẩm thực & phong tục",
      evidence: [
        { asset_id: "d0000000-0000-0000-0000-000000000006", start: 0, end: 45, quote: "Món cá chép kho mật mía ngày Tết này là cụ bà truyền lại cho bà từ ngày mới về làm dâu." },
        { asset_id: "d0000000-0000-0000-0000-000000000006", start: 45, end: 90, quote: "Lót dưới đáy nồi đất một lớp riềng già thái lát mỏng và mấy nhánh mía chẻ. Ướp cá với nước mắm cốt và chén mật mía thơm." }
      ],
      segments: [
        { order: 1, start: 0, end: 45, speaker: "Bà Lê Thị Mai", text: "Món cá chép kho mật mía ngày Tết này là cụ bà truyền lại cho bà từ ngày mới về làm dâu." },
        { order: 2, start: 45, end: 90, speaker: "Bà Lê Thị Mai", text: "Lót dưới đáy nồi đất một lớp riềng già thái lát mỏng và mấy nhánh mía chẻ. Ướp cá với nước mắm cốt và chén mật mía thơm." },
        { order: 3, start: 90, end: 150, speaker: "Bà Lê Thị Mai", text: "Bí quyết ở chỗ ủ trấu đun lửa liu riu suốt mười hai tiếng đồng hồ. Xương cá nhừ tơi mà thịt cá vẫn săn chắc, ngậy thơm." }
      ]
    },
    {
      id: "e0000000-0000-0000-0000-000000000004",
      narrator_id: "c0000000-0000-0000-0000-000000000002",
      primary_asset_id: "d0000000-0000-0000-0000-000000000007",
      title: "Tiếng chuông đồng hồ quả lắc của cụ Phúc và bài học chữ Tín",
      summary: "Kỷ vật chiếc đồng hồ Odo Pháp năm 1930 và bài học sâu sắc của Cụ cố Nguyễn Văn Phúc về sự đúng giờ và giữ trọn chữ Tín trong đời.",
      content: `Trong gian phòng khách trang trọng của gia đình họ Nguyễn luôn có tiếng tích tắc êm đềm và tiếng chuông boong boong trầm ấm của chiếc đồng hồ Odo cổ. Đó là kỷ vật duy nhất còn nguyên vẹn của Cụ cố Nguyễn Văn Phúc để lại từ năm 1930.\n\nBác An nhớ lại: Cụ Phúc tính tình nghiêm cẩn lắm. Mỗi lần con cháu đi học hay đi làm về muộn, cụ chỉ đứng lặng im nhìn lên chiếc đồng hồ rồi bảo: 'Thời gian trôi qua không lấy lại được. Người biết quý giờ giấc là người biết tôn trọng chính mình và tôn trọng người khác'.\n\nCụ luôn răn dạy con cháu: Chữ Tín là sinh mệnh của người làm nghề và nếp nhà. Đã hứa điều gì thì dù khó khăn gian khổ cũng phải giữ cho trọn. Tiếng chuông đồng hồ ấy đã đồng hành cùng bốn thế hệ gia đình đi qua bao thăng trầm của lịch sử.`,
      category: "gia phong & đạo lý",
      evidence: [
        { asset_id: "d0000000-0000-0000-0000-000000000007", start: 0, end: 40, quote: "Mỗi lần nghe tiếng chuông boong boong trầm ấm của chiếc đồng hồ Odo treo ở phòng khách, bác lại nhớ đến Cụ Phúc." },
        { asset_id: "d0000000-0000-0000-0000-000000000007", start: 40, end: 80, quote: "Đã là người trong nhà họ Nguyễn thì chữ Tín và sự đúng giờ phải đặt lên hàng đầu." }
      ],
      segments: [
        { order: 1, start: 0, end: 40, speaker: "Bác Nguyễn Văn An", text: "Mỗi lần nghe tiếng chuông boong boong trầm ấm của chiếc đồng hồ Odo treo ở phòng khách, bác lại nhớ đến Cụ Phúc." },
        { order: 2, start: 40, end: 80, speaker: "Bác Nguyễn Văn An", text: "Cụ luôn dạy bác: Đã là người trong nhà họ Nguyễn thì chữ Tín và sự đúng giờ phải đặt lên hàng đầu." },
        { order: 3, start: 80, end: 130, speaker: "Bác Nguyễn Văn An", text: "Trải qua bao nhiêu năm bom đạn chiến tranh, chuyển nhà sơ tán mấy bận, chiếc đồng hồ vẫn chạy đúng từng giây." }
      ]
    },
    {
      id: "e0000000-0000-0000-0000-000000000005",
      narrator_id: "c0000000-0000-0000-0000-000000000007",
      primary_asset_id: "d0000000-0000-0000-0000-000000000008",
      title: "Bình rượu gừng nghệ hạ thổ một trăm ngày và tình thương của người mẹ",
      summary: "Bài thuốc dân gian chăm sóc phụ nữ sau sinh được lưu truyền từ cụ Thoa đến các con dâu, con gái trong nhà họ Nguyễn.",
      content: `Mỗi lần trong gia đình có con dâu hay con gái chuẩn bị sinh nở, góc vườn râm mát dưới gốc bưởi nhà bà Mai lại được xới đất để chuẩn bị hạ thổ một hũ sành rượu gừng nghệ.\n\nCô Hương chia sẻ: Cụ Thoa dặn kỹ lắm, gừng phải là gừng ta củ nhỏ xíu mà thơm cay nồng, nghệ phải là nghệ nếp đỏ bánh tẻ. Rửa sạch đất cát, để ráo vỏ rồi giã dập, ngâm cùng rượu nếp cái hoa vàng chuẩn độ cất tay.\n\nBình rượu được hạ thổ đúng 100 ngày để âm dương hòa hợp, đào lên nước rượu sánh óng như mật ong rừng. Khi thoa lên da thì ấm sực từ trong cốt tủy, giúp người mẹ trẻ phục hồi khí huyết nhanh chóng. Hũ rượu ấy không đơn thuần là một bài thuốc, mà là tình thương dịu dàng, chở che của những người mẹ, người bà truyền qua nhiều thế hệ.`,
      category: "y học dân gian & tình mẫu tử",
      evidence: [
        { asset_id: "d0000000-0000-0000-0000-000000000008", start: 0, end: 40, quote: "Bài thuốc rượu gừng nghệ hạ thổ này là bí quyết gia truyền mà cụ Thoa ngày xưa chăm sóc cho mẹ Mai và các con dâu." },
        { asset_id: "d0000000-0000-0000-0000-000000000008", start: 40, end: 80, quote: "Phải chọn gừng ta củ nhỏ nhưng cay thơm, nghệ nếp vàng ươm bánh tẻ ngâm với rượu nếp cái hoa vàng trong hũ sành Bát Tràng." }
      ],
      segments: [
        { order: 1, start: 0, end: 40, speaker: "Cô Nguyễn Thị Thu Hương", text: "Bài thuốc rượu gừng nghệ hạ thổ này là bí quyết gia truyền mà cụ Thoa ngày xưa chăm sóc cho mẹ Mai và các con dâu." },
        { order: 2, start: 40, end: 80, speaker: "Cô Nguyễn Thị Thu Hương", text: "Phải chọn gừng ta củ nhỏ nhưng cay thơm, nghệ nếp vàng ươm bánh tẻ ngâm với rượu nếp cái hoa vàng trong hũ sành Bát Tràng." },
        { order: 3, start: 80, end: 130, speaker: "Cô Nguyễn Thị Thu Hương", text: "Hạ thổ nơi đất sạch dưới bóng râm đúng một trăm ngày. Rượu khi đào lên có màu vàng óng như mật ong, thoa lên người giúp ấm cốt sáng da." }
      ]
    }
  ];

  for (const s of stories) {
    await db.query(
      `INSERT INTO stories (
        id, workspace_id, narrator_id, primary_asset_id, title, summary,
        content, category, status, version_number, approved_by, approved_at, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', 1, $9, NOW(), $9)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         content = EXCLUDED.content,
         category = EXCLUDED.category`,
      [s.id, wsId, s.narrator_id, s.primary_asset_id, s.title, s.summary, s.content, s.category, adminId]
    );

    for (const ev of s.evidence) {
      await db.query(
        `INSERT INTO story_evidence_refs (story_id, asset_id, start_time_seconds, end_time_seconds, quote_text)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [s.id, ev.asset_id, ev.start, ev.end, ev.quote]
      );
    }

    for (const seg of s.segments) {
      await db.query(
        `INSERT INTO transcript_segments (workspace_id, asset_id, segment_order, start_time_seconds, end_time_seconds, speaker, text)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [wsId, s.primary_asset_id, seg.order, seg.start, seg.end, seg.speaker, seg.text]
      );
    }
  }
  console.log(`✓ Đã nạp ${stories.length} câu chuyện ký ức có đầy đủ trích dẫn đối soát`);

  // 5. PRACTICE MANUALS
  const manuals = [
    {
      id: "80000000-0000-0000-0000-000000000001",
      skill_id: "70000000-0000-0000-0000-000000000007",
      title: "Bí quyết làm bánh gối giòn xốp gia truyền của bà Mai",
      summary: "Cẩm nang hướng dẫn đầy đủ cách làm vỏ bánh giòn tan không ngấm mỡ, ướp nhân thịt mộc nhĩ chuẩn vị phố cổ và kỹ thuật căn lửa chảo dầu truyền qua ba thế hệ.",
      cover: "d0000000-0000-0000-0000-000000000003",
      ingredients: [
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
      ],
      steps: [
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
      ]
    },
    {
      id: "80000000-0000-0000-0000-000000000002",
      skill_id: "70000000-0000-0000-0000-000000000010",
      title: "Bí quyết kho cá chép mục xương đượm vị mật mía ngày Tết",
      summary: "Cẩm nang gia truyền kho cá chép sông trong niêu đất đun trấu 12 tiếng liên tục: thịt cá săn chắc, đậm vị mật mía, xương nhừ tơi.",
      cover: "d0000000-0000-0000-0000-000000000010",
      ingredients: [
        { name: "Cá chép sông tươi", amount: "1 con (khoảng 2kg)", category: "ingredient", notes: "Chọn cá dày mình, vảy sáng, làm sạch mang và ruột" },
        { name: "Mật mía làng nghề", amount: "1 bát con (150ml)", category: "ingredient", notes: "Mật sánh đặc, thơm dịu, tạo màu cánh gián tự nhiên" },
        { name: "Riềng già", amount: "300g", category: "ingredient", notes: "Thái lát mỏng lót đáy nồi và rải xen kẽ" },
        { name: "Mía lau chẻ đốt", amount: "2 lóng", category: "ingredient", notes: "Lót dưới cùng chống cháy khét nồi" },
        { name: "Thịt mỡ phần", amount: "200g", category: "ingredient", notes: "Tạo độ bóng và ngậy béo cho thịt cá" },
        { name: "Nước mắm truyền thống cốt nhĩ", amount: "4 thìa canh", category: "seasoning", notes: "Độ đạm cao dậy mùi thơm" },
        { name: "Hạt tiêu sọ đập dập", amount: "1 thìa canh", category: "seasoning" },
        { name: "Niêu đất nung Bát Tràng", amount: "1 chiếc", category: "tool", notes: "Giữ nhiệt cực tốt suốt 12 tiếng ủ trấu" }
      ],
      steps: [
        {
          step_number: 1,
          title: "Sơ chế cá và lót đáy nồi đất",
          instructions: "Cá chép đánh sạch vảy, rửa rượu gừng khử tanh, cắt khúc dày 4cm. Đáy niêu đất xếp lớp mía chẻ rồi đến lớp riềng già thái lát phủ kín mặt đáy.",
          success_signs: "Đáy nồi phủ kín riềng và mía, cá sạch nhớt không còn mùi tanh.",
          evidence_asset_id: "d0000000-0000-0000-0000-000000000006",
          evidence_quote: "Lót dưới đáy nồi đất một lớp riềng già thái lát mỏng và mấy nhánh mía chẻ.",
          start_time_seconds: 45,
          end_time_seconds: 90
        },
        {
          step_number: 2,
          title: "Xếp cá và tẩm ướp gia vị mật mía",
          instructions: "Xếp từng khúc cá khít nhau, chèn thịt mỡ phần và riềng lát vào các kẽ hở. Rưới đều bát mật mía, nước mắm cốt nhĩ, tiêu sọ. Ướp tĩnh trong 45 phút cho cá ngấm gia vị.",
          success_signs: "Khúc cá thấm đều mật mía chuyển sang màu nâu nhạt, thịt cá hơi se lại.",
          evidence_asset_id: "d0000000-0000-0000-0000-000000000006",
          evidence_quote: "Ướp cá với nước mắm cốt và chén mật mía thơm.",
          start_time_seconds: 45,
          end_time_seconds: 90
        },
        {
          step_number: 3,
          title: "Kỹ thuật đun sôi bùng và hãm lửa than trấu",
          instructions: "Đặt niêu cá lên bếp đun lửa to cho sôi bùng 10 phút. Đổ thêm nước chè xanh nóng ngập mặt cá. Sau đó chuyển sang bếp trấu ủ kín, giữ nhiệt liu riu liên tục 12 tiếng.",
          success_signs: "Nước kho sôi tăm tăm đều đặn, không để cạn đáy, mùi thơm ngào ngạt lan tỏa.",
          evidence_asset_id: "d0000000-0000-0000-0000-000000000006",
          evidence_quote: "Bí quyết ở chỗ ủ trấu đun lửa liu riu suốt mười hai tiếng đồng hồ.",
          start_time_seconds: 90,
          end_time_seconds: 150
        },
        {
          step_number: 4,
          title: "Dấu hiệu kiểm chứng cá mục xương đạt chuẩn",
          instructions: "Khi nước cạn gần sát đáy và sánh lại như mạch nha thì dỡ niêu cá ra để nguội hoàn toàn. Khi ăn, gắp nhẹ khúc cá ra đĩa.",
          success_signs: "Khúc cá màu cánh gián bóng bẩy, thịt cá săn chắc dẻo thơm, xương cá mềm tơi tan ngay khi cắn mà không hề sắc cạnh.",
          evidence_asset_id: "d0000000-0000-0000-0000-000000000006",
          evidence_quote: "Xương cá nhừ tơi mà thịt cá vẫn săn chắc, ngậy thơm.",
          start_time_seconds: 90,
          end_time_seconds: 150
        }
      ]
    },
    {
      id: "80000000-0000-0000-0000-000000000003",
      skill_id: "70000000-0000-0000-0000-000000000011",
      title: "Công thức ngâm rượu gừng nghệ nếp hạ thổ 100 ngày cho sản phụ",
      summary: "Bài thuốc gia truyền chăm sóc sức khỏe phụ nữ sau sinh từ cụ bà Trần Thị Thoa: giữ ấm khí huyết, làm sáng da, chống phong hàn trọn đời.",
      cover: "d0000000-0000-0000-0000-000000000011",
      ingredients: [
        { name: "Gừng ta ré củ nhỏ", amount: "1.5 kg", category: "ingredient", notes: "Cay nồng, nhiều tinh dầu, rửa sạch để nguyên vỏ ráo nước" },
        { name: "Nghệ nếp đỏ bánh tẻ", amount: "1.5 kg", category: "ingredient", notes: "Lõi đỏ cam đậm, nhiều curcumin" },
        { name: "Rượu nếp cái hoa vàng 45 độ", amount: "5 lít", category: "ingredient", notes: "Rượu cất men ta truyền thống, không pha cồn công nghiệp" },
        { name: "Hũ sành gốm không tráng men trong", amount: "1 hũ 10 lít", category: "tool", notes: "Hút độc tố và thẩm thấu khoáng chất của đất" }
      ],
      steps: [
        {
          step_number: 1,
          title: "Làm sạch và giã dập nguyên liệu",
          instructions: "Gừng và nghệ ngâm nước sạch, dùng bàn chải cọ sạch từng khe kẽ. Để khô ráo hoàn toàn ngoài bóng râm. Cho vào cối đá giã dập (không xay nát vụn làm đục rượu).",
          success_signs: "Củ gừng nghệ dập vỡ tiết dịch dầu thơm nồng, không còn nước lã đọng lại.",
          evidence_asset_id: "d0000000-0000-0000-0000-000000000008",
          evidence_quote: "Phải chọn gừng ta củ nhỏ nhưng cay thơm, nghệ nếp vàng ươm bánh tẻ.",
          start_time_seconds: 40,
          end_time_seconds: 80
        },
        {
          step_number: 2,
          title: "Đóng hũ sành và bịt kín miệng hũ",
          instructions: "Cho gừng nghệ vào hũ sành, đổ 5 lít rượu nếp cái hoa vàng ngập bã 2 đốt ngón tay. Dùng nilon bọc 3 lớp quanh miệng hũ, đậy nắp sành và trét đất sét non quanh mép nắp.",
          success_signs: "Miệng hũ kín mít, không có khe hở thoát khí, rượu ngập đều nguyên liệu.",
          evidence_asset_id: "d0000000-0000-0000-0000-000000000008",
          evidence_quote: "Ngâm với rượu nếp cái hoa vàng trong hũ sành Bát Tràng.",
          start_time_seconds: 40,
          end_time_seconds: 80
        },
        {
          step_number: 3,
          title: "Kỹ thuật hạ thổ đúng 100 ngày",
          instructions: "Đào hố sâu 80cm nơi đất vườn sạch dưới bóng râm thoáng mát (gốc cây bưởi hoặc cây nhãn). Đặt hũ rượu xuống, lấp đất chặt. Ghi lại ngày hạ thổ đúng 100 ngày sau mới đào lên.",
          success_signs: "Đất vườn ẩm mát tự nhiên, giữ nhiệt độ ổn định quanh năm giúp rượu thẩm thấu âm dương.",
          evidence_asset_id: "d0000000-0000-0000-0000-000000000008",
          evidence_quote: "Hạ thổ nơi đất sạch dưới bóng râm đúng một trăm ngày.",
          start_time_seconds: 80,
          end_time_seconds: 130
        },
        {
          step_number: 4,
          title: "Dấu hiệu thành phẩm và cách sử dụng",
          instructions: "Khi đào hũ rượu lên, mở nắp kiểm tra màu sắc và hương thơm. Chắt nước cốt ra chai thủy tinh dùng dần để xoa bóp toàn thân cho sản phụ sau khi tắm nước ấm.",
          success_signs: "Nước rượu màu vàng óng như mật ong rừng, mùi thơm nồng ấm không nồng gắt cồn, xoa lên da thấy ấm sực và thẩm thấu nhanh.",
          evidence_asset_id: "d0000000-0000-0000-0000-000000000008",
          evidence_quote: "Rượu khi đào lên có màu vàng óng như mật ong, thoa lên người giúp ấm cốt sáng da.",
          start_time_seconds: 80,
          end_time_seconds: 130
        }
      ]
    }
  ];

  for (const m of manuals) {
    await db.query(
      `INSERT INTO practice_manuals (
        id, workspace_id, skill_entity_id, title, summary, cover_asset_id,
        status, version_number, ingredients, steps, approved_by, approved_at, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, 'approved', 1, $7, $8, $9, NOW(), $9)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         ingredients = EXCLUDED.ingredients,
         steps = EXCLUDED.steps`,
      [m.id, wsId, m.skill_id, m.title, m.summary, m.cover, JSON.stringify(m.ingredients), JSON.stringify(m.steps), adminId]
    );
  }
  console.log(`✓ Đã nạp ${manuals.length} cẩm nang thực hành chi tiết (Bánh gối, Cá kho mật mía, Rượu gừng nghệ)`);

  // 6. TIMELINE EVENTS
  const timelineEvents = [
    {
      id: "f0000000-0000-0000-0000-000000000010",
      title: "Cụ Nguyễn Văn Phúc sinh ra tại làng gốm Bát Tràng",
      description: "Cụ cố sinh ra trong gia đình thợ gốm truyền thống, khởi đầu nếp nhà gia phong của dòng họ Nguyễn.",
      year: 1908,
      date_display: "Năm 1908",
      date_precision: "year",
      location: "Làng gốm Bát Tràng, Gia Lâm, Hà Nội",
      importance: "milestone",
      person_id: "c0000000-0000-0000-0000-000000000004",
      asset_id: null
    },
    {
      id: "f0000000-0000-0000-0000-000000000011",
      title: "Cụ Phúc rước chiếc đồng hồ quả lắc Odo Pháp năm 1930",
      description: "Cụ cố mua chiếc đồng hồ quả lắc Odo tại phố Hàng Khay, bắt đầu truyền thống giữ chữ Tín và sự đúng giờ trong gia đình.",
      year: 1930,
      date_display: "Mùa thu năm 1930",
      date_precision: "approximate",
      location: "Phố Hàng Khay, Hà Nội",
      importance: "milestone",
      person_id: "c0000000-0000-0000-0000-000000000004",
      asset_id: "d0000000-0000-0000-0000-000000000009"
    },
    {
      id: "f0000000-0000-0000-0000-000000000001",
      title: "Bà Lê Thị Mai sinh ra tại ngoại thành Hà Nội",
      description: "Bà Mai sinh ra trong một gia đình làm bột và bánh truyền thống, người gìn giữ tinh hoa ẩm thực phố cổ.",
      year: 1936,
      date_display: "Năm 1936",
      date_precision: "year",
      location: "Hà Nội",
      importance: "normal",
      person_id: "c0000000-0000-0000-0000-000000000001",
      asset_id: null
    },
    {
      id: "f0000000-0000-0000-0000-000000000012",
      title: "Nồi cháo nghĩa tình trong nạn đói năm Ất Dậu 1945",
      description: "Gia đình Cụ Phúc cùng Cụ Thoa mở nồi cháo cứu đói trước cửa ngõ Hàng Chiếu, sẻ chia hạt gạo cùng bà con xóm phố.",
      year: 1945,
      date_display: "Mùa xuân năm 1945",
      date_precision: "approximate",
      location: "Ngõ Hàng Chiếu, Hoàn Kiếm, Hà Nội",
      importance: "milestone",
      person_id: "c0000000-0000-0000-0000-000000000004",
      asset_id: null
    },
    {
      id: "f0000000-0000-0000-0000-000000000013",
      title: "Tiếp quản Thủ đô năm 1954 - Cả nhà sum họp",
      description: "Đoàn quân chiến thắng tiến về tiếp quản Thủ đô ngày 10/10/1954. Gia đình sum họp đông đủ tại căn nhà ngõ Hàng Chiếu.",
      year: 1954,
      date_display: "Tháng 10/1954",
      date_precision: "month",
      location: "Phố cổ Hà Nội",
      importance: "milestone",
      person_id: "c0000000-0000-0000-0000-000000000001",
      asset_id: null
    },
    {
      id: "f0000000-0000-0000-0000-000000000002",
      title: "Gánh hàng bánh gối đầu tiên ở ngõ Hàng Chiếu - phố cổ",
      description: "Bà Mai gánh đôi quang gánh từ sáng sớm ra góc chợ Đồng Xuân bán bánh gối nóng hổi mưu sinh nuôi cả nhà.",
      year: 1965,
      date_display: "Mùa thu năm 1965",
      date_precision: "approximate",
      location: "Ngõ Hàng Chiếu, Hoàn Kiếm, Hà Nội",
      importance: "milestone",
      person_id: "c0000000-0000-0000-0000-000000000001",
      asset_id: "d0000000-0000-0000-0000-000000000001"
    },
    {
      id: "f0000000-0000-0000-0000-000000000014",
      title: "Bức thư từ thành cổ Quảng Trị hè đỏ lửa 1972 của Ông Khiêm",
      description: "Ông nội Khiêm gửi bức thư mực tím từ chiến hào sông Thạch Hãn về khu sơ tán, dặn dò Bác An giúp mẹ chăm sóc các em.",
      year: 1972,
      date_display: "Tháng 7/1972",
      date_precision: "month",
      location: "Chiến trường Quảng Trị",
      importance: "milestone",
      person_id: "c0000000-0000-0000-0000-000000000006",
      asset_id: "d0000000-0000-0000-0000-000000000005"
    },
    {
      id: "f0000000-0000-0000-0000-000000000003",
      title: "Hoàn thành sổ tay chép tay công thức gia truyền năm 1980",
      description: "Bà Mai đúc kết định lượng gia vị ướp bánh gối và cá chép kho mật mía vào cuốn sổ tay bìa cứng ngả vàng.",
      year: 1980,
      date_display: "Khoảng năm 1980",
      date_precision: "decade",
      location: "Hà Nội",
      importance: "normal",
      person_id: "c0000000-0000-0000-0000-000000000001",
      asset_id: "d0000000-0000-0000-0000-000000000004"
    },
    {
      id: "f0000000-0000-0000-0000-000000000004",
      title: "Bà Mai truyền dạy bí quyết căn lửa chảo mỡ cho Bác An",
      description: "Bác An được bà dạy trực tiếp kỹ thuật thử tăm tre sủi bọt và trở bánh hai lần để vỏ giòn xốp không ngấm mỡ.",
      year: 1995,
      date_display: "Tháng 8/1995",
      date_precision: "month",
      location: "Bếp gia đình - Hà Nội",
      importance: "normal",
      person_id: "c0000000-0000-0000-0000-000000000002",
      asset_id: "d0000000-0000-0000-0000-000000000002"
    },
    {
      id: "f0000000-0000-0000-0000-000000000005",
      title: "Bé Châu học làm món bánh của bà và xây dựng Mạch Nguồn",
      description: "Cháu gái Nguyễn Mai Châu thực hành gói bánh theo lời bà kể, cùng Bác An số hóa di sản dòng họ lên nền tảng Mạch Nguồn.",
      year: 2026,
      date_display: "Năm 2026",
      date_precision: "approximate",
      location: "Nhà Bác An - Hà Nội",
      importance: "milestone",
      person_id: "c0000000-0000-0000-0000-000000000003",
      asset_id: "d0000000-0000-0000-0000-000000000003"
    }
  ];

  for (const ev of timelineEvents) {
    await db.query(
      `INSERT INTO timeline_events (
        id, workspace_id, title, description, year, date_display, date_precision, location, importance, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         year = EXCLUDED.year,
         date_display = EXCLUDED.date_display,
         location = EXCLUDED.location`,
      [ev.id, wsId, ev.title, ev.description, ev.year, ev.date_display, ev.date_precision, ev.location, ev.importance, adminId]
    );

    if (ev.person_id) {
      await db.query(
        `INSERT INTO timeline_event_persons (event_id, person_id, role_description)
         VALUES ($1, $2, 'Nhân vật chính')
         ON CONFLICT DO NOTHING`,
        [ev.id, ev.person_id]
      );
    }

    if (ev.asset_id) {
      await db.query(
        `INSERT INTO timeline_event_assets (event_id, asset_id, caption)
         VALUES ($1, $2, 'Tư liệu đối chiếu')
         ON CONFLICT DO NOTHING`,
        [ev.id, ev.asset_id]
      );
    }
  }
  console.log(`✓ Đã nạp ${timelineEvents.length} mốc sự kiện Dòng thời gian gia đình (1908 - 2026)`);

  // 7. GRAPH CLAIMS
  const claims = [
    {
      source: "70000000-0000-0000-0000-000000000001",
      target: "70000000-0000-0000-0000-000000000007",
      rel: "mastered",
      stmt: "Bà Mai nắm giữ bí quyết ủ bột xốp giòn gia truyền",
      asset: "d0000000-0000-0000-0000-000000000001",
      quote: "Bột mì thì phải chọn loại mịn, hòa nước ấm vừa tay, nhào đều rồi ủ lại cho bột thở.",
      start: 30, end: 75
    },
    {
      source: "70000000-0000-0000-0000-000000000001",
      target: "70000000-0000-0000-0000-000000000010",
      rel: "mastered",
      stmt: "Bà Mai nắm giữ bí quyết kho cá chép mục xương đượm vị mật mía ngày Tết",
      asset: "d0000000-0000-0000-0000-000000000006",
      quote: "Món cá chép kho mật mía ngày Tết này là cụ bà truyền lại cho bà từ ngày mới về làm dâu.",
      start: 0, end: 45
    },
    {
      source: "70000000-0000-0000-0000-000000000002",
      target: "70000000-0000-0000-0000-000000000012",
      rel: "preserves",
      stmt: "Bác An gìn giữ kỷ vật chiếc đồng hồ quả lắc Odo 1930 của Cụ Phúc",
      asset: "d0000000-0000-0000-0000-000000000007",
      quote: "Mỗi lần nghe tiếng chuông boong boong trầm ấm của chiếc đồng hồ Odo treo ở phòng khách, bác lại nhớ đến Cụ Phúc.",
      start: 0, end: 40
    },
    {
      source: "70000000-0000-0000-0000-000000000001",
      target: "70000000-0000-0000-0000-000000000002",
      rel: "taught",
      stmt: "Bà Mai truyền dạy kỹ năng căn nhiệt chảo dầu cho Bác An",
      asset: "d0000000-0000-0000-0000-000000000002",
      quote: "Thử đầu đũa tre vào chảo mỡ thấy sủi bọt tăm tăm thì mới thả bánh, không để mỡ quá già.",
      start: 15, end: 55
    },
    {
      source: "70000000-0000-0000-0000-000000000002",
      target: "70000000-0000-0000-0000-000000000003",
      rel: "guided",
      stmt: "Bác An trực tiếp hướng dẫn Bé Châu thực hành làm bánh gia truyền",
      asset: "d0000000-0000-0000-0000-000000000003",
      quote: "Hai bác cháu cùng đứng bếp gói từng chiếc bánh nếp gấp hình vỏ sò.",
      start: null, end: null
    }
  ];

  for (const c of claims) {
    await db.query(
      `INSERT INTO graph_claims (
        workspace_id, source_entity_id, target_entity_id, relation_type,
        statement, status, evidence_asset_id, evidence_quote, start_time_seconds, end_time_seconds, created_by, confirmed_by, confirmed_at
       ) VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7, $8, $9, $10, $10, NOW())
       ON CONFLICT DO NOTHING`,
      [wsId, c.source, c.target, c.rel, c.stmt, c.asset, c.quote, c.start, c.end, adminId]
    );
  }
  console.log(`✓ Đã nạp ${claims.length} mối liên kết trên Bản đồ tri thức`);

  console.log("=== NẠP DỮ LIỆU HOÀN TẤT THÀNH CÔNG ===");
}

async function main() {
  const dirs = [
    path.resolve(process.cwd(), ".data/pglite"),
    path.resolve(process.cwd(), ".demo-data/pglite"),
  ];

  for (const d of dirs) {
    if (fs.existsSync(d)) {
      console.log(`\nĐang nạp vào CSDL tại: ${d}`);
      const db = new PGlite(d);
      await enrichData(db);
      await db.close();
    }
  }
}

main().catch(console.error);
