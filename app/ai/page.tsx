import { listAiAnalyses } from "@/lib/data";
import { getAvailableProviderList } from "@/app/actions/ai";
import { AiPageClient } from "./ai-page-client";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const [availableProviders, analyses] = await Promise.all([
    getAvailableProviderList(),
    listAiAnalyses(20),
  ]);

  return (
    <AiPageClient
      availableProviders={availableProviders}
      initialAnalyses={analyses}
    />
  );
}
