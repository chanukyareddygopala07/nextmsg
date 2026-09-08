"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";

// ─── Memory List Component ─────────────────────────────────────────────────────
//
// Displays user's saved memories with edit/delete functionality.
// ──────────────────────────────────────────────────────────────────────────────

interface Memory {
  id: string;
  type: string;
  content: string;
  source: string;
  confidence: number;
  isUserConfirmed: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface MemoryListProps {
  userId: string;
  onDelete?: (memoryId: string) => void;
}

export default function MemoryList({ userId, onDelete }: MemoryListProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/memory");
        if (response.ok && !cancelled) {
          const data = await response.json();
          setMemories(data.memories);
        }
      } catch (error) {
        console.error("Failed to fetch memories:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleDelete = async (memoryId: string) => {
    setDeleting(memoryId);
    try {
      const response = await fetch(`/api/memory?memoryId=${memoryId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
        onDelete?.(memoryId);
      }
    } catch (error) {
      console.error("Failed to delete memory:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all memories?")) return;

    try {
      const response = await fetch("/api/memory", {
        method: "DELETE",
      });

      if (response.ok) {
        setMemories([]);
      }
    } catch (error) {
      console.error("Failed to clear memories:", error);
    }
  };

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

  const getSourceColor = (source: string) => {
    switch (source) {
      case "explicit_user":
        return "bg-green-100 text-green-800";
      case "user_confirmed":
        return "bg-blue-100 text-blue-800";
      case "conversation_observed":
        return "bg-yellow-100 text-yellow-800";
      case "ai_inference":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-6 w-6 text-gray-400"
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
        </div>
        <h3 className="font-medium text-gray-900">No memories yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Memories will be created as you have conversations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Saved Memories</h3>
        <Button onClick={handleClearAll} variant="ghost" size="sm">
          Clear All
        </Button>
      </div>

      <div className="space-y-2">
        {memories.map((memory) => (
          <div
            key={memory.id}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {formatType(memory.type)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${getSourceColor(
                      memory.source
                    )}`}
                  >
                    {getSourceLabel(memory.source)}
                  </span>
                  {memory.isUserConfirmed && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Confirmed
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{memory.content}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span>Created: {formatDate(memory.createdAt)}</span>
                  {memory.expiresAt && (
                    <span>Expires: {formatDate(memory.expiresAt)}</span>
                  )}
                  <span>
                    Confidence: {Math.round(memory.confidence * 100)}%
                  </span>
                </div>
              </div>

              <Button
                onClick={() => handleDelete(memory.id)}
                disabled={deleting === memory.id}
                variant="ghost"
                size="sm"
                className="ml-4 text-red-600 hover:text-red-700"
              >
                {deleting === memory.id ? "..." : "Delete"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
