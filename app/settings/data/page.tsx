import { DataManagement } from "./data-management";

export const dynamic = "force-dynamic";

export default function DataSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">데이터 관리</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 백업·초기화·복원을 한 화면에서. 운영 데이터를 다루는 화면이므로 신중히 사용하세요.
        </p>
      </div>
      <DataManagement />
    </div>
  );
}
