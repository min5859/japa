// Design Ref: §8 — login page with friendly error messages
// Plan SC: SC-1 (이메일 입력 화면)

import { LoginForm } from "./login-form";

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "로그인 링크가 만료되었거나 유효하지 않습니다. 다시 시도해주세요.",
  session_failed: "세션 생성에 실패했습니다. 다시 시도해주세요.",
  invalid_callback: "유효하지 않은 로그인 시도입니다.",
  unauthorized_email: "세션이 만료되었습니다. 다시 로그인해주세요.",
  internal_error: "예기치 못한 오류가 발생했습니다. 다시 시도해주세요.",
  session_expired: "세션이 만료되었습니다. 다시 로그인해주세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const errorCode = params?.error;
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? null : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">japa</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">자산을 한눈에</p>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {errorMessage}
          </div>
        )}

        <LoginForm />
      </div>
    </main>
  );
}
