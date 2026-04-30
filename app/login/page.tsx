import { LoginForm } from "@/components/forms/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const redirectTo = from && from.startsWith("/") ? from : "/";
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm rounded-3xl border bg-card/80 p-8 shadow-sm backdrop-blur">
        <div className="mb-6 text-center">
          <p className="text-sm text-muted-foreground">Personal Asset Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">로그인</h1>
        </div>
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
