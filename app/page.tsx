// Design Ref: §1 GATE 4 — middleware redirects to /login or /dashboard
// 루트 진입 시 인증 사용자는 /dashboard로, 비인증은 미들웨어가 /login으로 보냄.

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
