export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roleDescription: string;
  avatarUrl?: string;
}

export const DEMO_USERS: UserProfile[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    email: "nguyen.anh@giadinh.vn",
    fullName: "Bác Nguyễn Văn An",
    roleDescription: "Người quản lý kho & Người kể chuyện chính (Admin / Narrator)",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    email: "nguyen.binh@giadinh.vn",
    fullName: "Nguyễn Thanh Bình",
    roleDescription: "Con trai - Người đóng góp tư liệu (Contributor)",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    email: "nguyen.chau@giadinh.vn",
    fullName: "Nguyễn Mai Châu",
    roleDescription: "Cháu gái - Người học & Người xem (Viewer)",
  },
  {
    id: "99999999-9999-9999-9999-999999999999",
    email: "khach.ngoai@test.vn",
    fullName: "Người Ngoài Gia Đình",
    roleDescription: "Không thuộc kho gia đình này (Outsider để test cách ly)",
  },
];

export function getDemoUser(idOrEmail: string): UserProfile {
  const user = DEMO_USERS.find(
    (u) => u.id === idOrEmail || u.email.toLowerCase() === idOrEmail.toLowerCase()
  );
  if (!user) {
    return DEMO_USERS[0];
  }
  return user;
}
