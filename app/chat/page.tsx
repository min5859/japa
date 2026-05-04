import { MessageCircle } from "lucide-react";

export default function ChatIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
      <MessageCircle className="h-12 w-12 text-muted-foreground/30" />
      <p className="mt-4 font-medium">재무 상담 채팅</p>
      <p className="mt-1 text-sm">
        좌측 "새 채팅" 버튼을 눌러 시작하세요. 사용자의 포트폴리오 데이터를
        근거로 답변합니다.
      </p>
    </div>
  );
}
