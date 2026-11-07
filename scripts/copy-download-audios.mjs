import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const downloadDir = "C:/Users/admin/Downloads";
const targetDir = path.resolve(process.cwd(), "public/samples");

const mapping = [
  { pattern: "eebbdbfa33", target: "ba_mai_ke_chuyen_banh_goi.mp3", label: "Bà Mai kể bánh gối" },
  { pattern: "1ccef2b175", target: "ba_mai_can_lua_dau.mp3", label: "Bà Mai dặn căn lửa dầu" },
  { pattern: "c8f252c2a3", target: "ong_khiem_thu_quang_tri_1972.mp3", label: "Ông Khiêm thư Quảng Trị 1972" },
  { pattern: "d40e03ec37", target: "ba_mai_kho_ca_chep.mp3", label: "Bà Mai kho cá chép mật mía" },
  { pattern: "5a7dfb751a", target: "bac_an_ke_dong_ho_cu_phuc.mp3", label: "Bác An kể đồng hồ Cụ Phúc" },
  { pattern: "40c1718e0b", target: "co_huong_ngam_ruou_gung_nghe.mp3", label: "Cô Hương ngâm rượu gừng nghệ" },
];

const downloadFiles = fs.readdirSync(downloadDir);

for (const m of mapping) {
  const match = downloadFiles.find((f) => f.includes(m.pattern));
  if (match) {
    const src = path.join(downloadDir, match);
    const dest = path.join(targetDir, m.target);
    fs.copyFileSync(src, dest);
    const stats = fs.statSync(dest);
    console.log(`[COPIED] ${m.target} (${(stats.size / 1024).toFixed(1)} KB)`);
  }
}

// Cập nhật dung lượng thật vào CSDL
const dirs = [
  path.resolve(process.cwd(), ".data/pglite"),
  path.resolve(process.cwd(), ".demo-data/pglite"),
];

for (const d of dirs) {
  if (fs.existsSync(d)) {
    const db = new PGlite(d);
    for (const m of mapping) {
      const dest = path.join(targetDir, m.target);
      if (fs.existsSync(dest)) {
        const stats = fs.statSync(dest);
        await db.query(
          "UPDATE assets SET byte_size = $1 WHERE file_name = $2",
          [stats.size, m.target]
        );
      }
    }
    await db.close();
    console.log(`[DB SYNCED] ${d}`);
  }
}
