"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/components/ui/Button";

interface WorkspaceHeaderProps {
  title: string;
  platform: string | null;
  goal: string | null;
  messageCount: number;
  participantCount: number;
  lastActiveAt: string;
  isDirty: boolean;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export default function WorkspaceHeader({
  title,
  platform,
  goal,
  messageCount,
  participantCount,
  lastActiveAt,
  isDirty,
  onRename,
  onDelete,
}: WorkspaceHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function handleSave() {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== title) {
      onRename(trimmed);
    } else {
      setEditTitle(title);
    }
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditTitle(title);
      setIsEditing(false);
    }
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
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            maxLength={200}
            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:border-white/30"
          />
        ) : (
          <h2
            className="text-sm font-medium text-white truncate cursor-pointer hover:text-white/80"
            onClick={() => setIsEditing(true)}
          >
            {title}
          </h2>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
          {platform && <span>{platform}</span>}
          {goal && <span>{goal}</span>}
          <span>{participantCount} participant{participantCount !== 1 ? "s" : ""}</span>
          <span>{messageCount} message{messageCount !== 1 ? "s" : ""}</span>
          <span>Updated {formatRelativeTime(lastActiveAt)}</span>
          {isDirty && <span className="text-yellow-400">Unsaved</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsEditing(true)}
        >
          Rename
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onDelete}
          className="text-red-400 hover:text-red-300"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
