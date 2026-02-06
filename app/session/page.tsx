"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SessionView } from "@/components/SessionView";

function SessionContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <p className="text-neutral-500 text-sm">No session ID provided.</p>
      </div>
    );
  }

  return <SessionView sessionId={sessionId} />;
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}
