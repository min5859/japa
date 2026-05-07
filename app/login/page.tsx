import { LoginForm } from "@/components/forms/login-form";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "로그인 링크가 만료되었거나 유효하지 않습니다. 다시 시도해 주세요.",
  session_failed: "세션 생성에 실패했습니다. 다시 시도해 주세요.",
  invalid_callback: "유효하지 않은 로그인 시도입니다.",
  unauthorized_email: "허용되지 않은 이메일입니다.",
  session_expired: "세션이 만료되었습니다. 다시 로그인해 주세요.",
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const errorCode = params?.error;
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? null : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm rounded-3xl border bg-card/80 p-8 shadow-sm backdrop-blur">
        <div className="mb-6 text-center">
          <p className="text-sm text-muted-foreground">Personal Asset Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">로그인</h1>
        </div>
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
