# Mạch Nguồn — Hệ Thống Kho Tri Thức Sống & Ký Ức Gia Đình

Triển khai MVP theo đặc tả kỹ thuật tại [PLAN_MVP_MACH_NGUON.md](../PLAN_MVP_MACH_NGUON.md).

### Đăng nhập và dữ liệu cục bộ

Chế độ mặc định dùng tài khoản do người vận hành cấp. Dừng ứng dụng trước khi chạy script bên dưới để chỉ có một tiến trình mở thư mục DB. Script giữ nguyên ID của hồ sơ cũ khi email trùng, thay mật khẩu và thu hồi các phiên cũ. Đặt cùng `PG_DATA_DIR` hoặc `MACH_NGUON_DATA_DIR` cho script và máy chủ nếu dùng thư mục dữ liệu riêng.

```powershell
$machNguonPassword = Read-Host "Mật khẩu (ít nhất 14 ký tự)" -MaskInput
$machNguonPassword | node scripts/provision-account.mjs 'nguoi-dung@example.com' 'Tên người dùng'
Remove-Variable machNguonPassword
npm.cmd run dev
```

Sau khi đăng nhập, quản trị viên kho tạo lời mời ở trang **Thành viên** và gửi mã riêng cho người nhận. Người nhận đăng nhập bằng tài khoản đã cấp rồi nhập mã tại **Kho gia đình**.

Để mở kho mẫu, đặt `$env:APP_ENV = 'demo'` trước khi chạy `npm.cmd run dev`. Chế độ này dùng thư mục `.demo-data` và cookie riêng. Bỏ biến `APP_ENV` để quay lại kho dùng mật khẩu.

Tệp tải mới được giữ riêng cho người tải, trừ khi họ chọn **Chia sẻ với gia đình**. Tệp từng có trong kho giữ phạm vi chia sẻ trước đó. Chọn tư liệu đã chia sẻ để gắn vào câu chuyện, sự kiện, bản đồ hoặc cẩm nang.

---

## 1. Phân Hệ P01: Kho Gia Đình & Phân Quyền Bảo Mật
- **Quản lý kho gia đình (Workspaces)**: Người tạo tự động là Quản trị viên (`admin`).
- **4 Vai trò chuẩn mực**: `admin`, `narrator`, `contributor`, `viewer`.
- **Cơ chế thu hồi (Revoke)**: Khi thu hồi quyền, thành viên lập tức mất quyền truy cập kho.
- **Bảo mật cơ sở dữ liệu**: Bật **PostgreSQL Row Level Security (RLS)** cách ly 100% giữa các gia đình.
- **Audit Logging**: Ghi nhận toàn bộ thao tác bảo mật vào bảng `audit_events`.

---

## 2. Phân Hệ P02: Hồ Sơ Người Thân & Mạng Lưới Phả Hệ
- **Hồ sơ cá nhân**: Tên, tên thân mật, giới tính, năm sinh (hỗ trợ năm gần đúng hoặc khoảng năm), tiểu sử, liên kết tài khoản.
- **Nguyên tắc bảo vệ danh tính (Identity Separation)**: Không tự động gộp hai người trùng tên; mỗi người có mã định danh độc lập.
- **Mối quan hệ gia đình hai chiều (Bi-directional Relationships)**:
  - Hỗ trợ: Cha/Mẹ, Con, Vợ/Chồng, Anh/Chị/Em, Ông/Bà, Cháu, Họ hàng.
  - Tự động đồng bộ quan hệ đảo ngược để cây phả hệ luôn đầy đủ và chính xác.

---

## 3. Phân Hệ P03: Kho Tư Liệu Âm Thanh, Ảnh & Tài Liệu Gốc
- **Ghi âm trực tiếp từ trình duyệt ([`AudioRecorder.tsx`](src/components/AudioRecorder.tsx))**:
  - Ghi âm micro trực tiếp qua Web Audio / MediaRecorder.
  - Bộ đếm thời gian thực `mm:ss` (giới hạn tối đa 10:00 theo đặc tả MVP).
  - Điều khiển: Tạm dừng / Tiếp tục / Hoàn tất & Nghe lại / Ghi âm lại.
  - Lưu vào kho: Điền tiêu đề, gắn người kể và ghi chú bối cảnh.
- **Tải tệp đa định dạng ([`FileUploadModal.tsx`](src/components/FileUploadModal.tsx))**: Hỗ trợ âm thanh (mp3, webm, wav), hình ảnh (jpg, png) và tài liệu chép tay PDF.
- **Lưu trữ & Kiểm soát quyền riêng tư**:
  - Tệp được lưu trữ trong thư mục private (`.data/uploads/[workspaceId]/`).
  - Đường dẫn tải tệp (`/api/workspaces/[id]/assets/[filename]/download`) bắt buộc kiểm tra phiên đăng nhập và quyền thành viên active của kho.
  - Tính checksum SHA-256 đảm bảo tính toàn vẹn của tư liệu gốc.
- **Bộ lọc & Tìm kiếm tư liệu ([`page.tsx`](src/app/workspaces/[id]/assets/page.tsx))**:
  - Lọc theo danh mục: Tất cả / Ghi âm & Âm thanh / Hình ảnh / Tài liệu PDF.
  - Tích hợp HTML5 audio player cho phép nghe trực tiếp các đoạn thu âm giọng bà kể.
- **Quyền xóa an toàn**: Chỉ Quản trị viên kho hoặc chính người đã tải tệp lên mới được xóa tư liệu; tự động xóa tệp vật lý và ghi nhật ký kiểm toán.

---

## Hướng Dẫn Chạy & Kiểm Thử

### 1. Chạy Automated Tests (18/18 tests pass)
```bash
cd mach-nguon
npm run test
```

### 2. Trải nghiệm trực tiếp trên giao diện
Mở trình duyệt tại **http://localhost:3000**
1. Vào **Kho Gia Đình Họ Nguyễn** → **Kho tư liệu & Ghi âm (P03)**.
2. Bấm **Bắt đầu thu âm** để thử nghiệm tính năng ghi âm trực tiếp lời kể bằng micro máy tính.
3. Nghe thử 2 bản ghi âm lời kể mẫu của Bà Lê Thị Mai về món bánh gối phố cổ.
4. Thử bộ lọc chuyển đổi giữa các tab: Ghi âm / Hình ảnh / Tài liệu PDF.
