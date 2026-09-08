"use client";

// ─── Memory Transparency Component ─────────────────────────────────────────────
//
// Shows when memory was used in generating a response.
// Provides transparency about what historical context was considered.
// ──────────────────────────────────────────────────────────────────────────────

interface MemoryUsed {
  type: string;
  content: string;
  source: string;
  confidence: number;
}

interface MemoryTransparencyProps {
  memoriesUsed: MemoryUsed[];
  conflictCoachingUsed?: boolean;
  resolutionsUsed?: number;
}

export default function MemoryTransparency({
  memoriesUsed,
  conflictCoachingUsed,
  resolutionsUsed,
}: MemoryTransparencyProps) {
  if (
    memoriesUsed.length === 0 &&
    !conflictCoachingUsed &&
    (!resolutionsUsed || resolutionsUsed === 0)
  ) {
    return null;
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "explicit_user":
        return "You said";
      case "user_confirmed":
        return "You confirmed";
      case "conversation_observed":
        return "Observed";
      case "ai_inference":
        return "Inferred";
      default:
        return source;
    }
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <svg
          className="h-4 w-4 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <span className="text-sm font-medium text-blue-800">
          Memory Used in Response
        </span>
      </div>

      <div className="space-y-2">
        {memoriesUsed.map((memory, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="text-xs text-blue-600">•</span>
            <div className="flex-1">
              <span className="text-xs font-medium text-blue-700">
                {getSourceLabel(memory.source)}:
              </span>
              <span className="ml-1 text-xs text-blue-600">
                {memory.content}
              </span>
            </div>
          </div>
        ))}

        {conflictCoachingUsed && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-blue-600">•</span>
            <span className="text-xs text-blue-600">
              Conflict coaching applied
            </span>
          </div>
        )}

        {resolutionsUsed && resolutionsUsed > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-blue-600">•</span>
            <span className="text-xs text-blue-600">
              {resolutionsUsed} past resolution{resolutionsUsed > 1 ? "s" : ""}{" "}
              considered
            </span>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-blue-500">
        Historical context was considered but current conversation takes priority
      </p>
    </div>
  );
}
