"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import type { WorkspacePreview } from "@/lib/ai/workspace-types";

interface WorkspaceListProps {
  onSelect: (workspaceId: string) => void;
  onCreateNew: () => void;
}

export default function WorkspaceList({ onSelect, onCreateNew }: WorkspaceListProps) {
  const [workspaces, setWorkspaces] = useState<WorkspacePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  async function fetchWorkspaces(searchQuery?: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/conversations?${params}`);
      if (!res.ok) throw new Error("Failed to load workspaces");
      const data = await res.json();
      setWorkspaces(data.workspaces || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchWorkspaces(search || undefined);
  }

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Your Conversations</h2>
        <Button onClick={onCreateNew} size="sm">
          New Conversation
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
        />
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
      </form>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-white/40 text-sm">No conversations yet</p>
          <Button onClick={onCreateNew} variant="secondary" size="sm">
            Start your first conversation
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => onSelect(ws.id)}
              className="w-full text-left px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{ws.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
                    {ws.platform && <span>{ws.platform}</span>}
                    {ws.participantCount > 0 && (
                      <span>{ws.participantCount} participant{ws.participantCount !== 1 ? "s" : ""}</span>
                    )}
                    <span>{ws.messageCount} message{ws.messageCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <span className="text-xs text-white/30 shrink-0">
                  {formatRelativeTime(ws.lastActiveAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
