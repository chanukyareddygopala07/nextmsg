"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/components/ui/Button";

interface WorkspaceComposerProps {
  onAddMessage: (text: string, sender: string, participantId?: string) => void;
  onCommitDraft: (text: string, sender: string, participantId?: string) => void;
  participants: Array<{ id: string; displayName: string; isUser: boolean }>;
  currentDraft: string | null;
}

export default function WorkspaceComposer({
  onAddMessage,
  onCommitDraft,
  participants,
  currentDraft,
}: WorkspaceComposerProps) {
  const [text, setText] = useState("");
  const [sender, setSender] = useState("user");
  const [participantId, setParticipantId] = useState<string>("");
  const [isCommitting, setIsCommitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentDraft && !text) {
      setText(currentDraft);
      setIsCommitting(true);
    }
  }, [currentDraft]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (isCommitting) {
      onCommitDraft(trimmed, sender, participantId || undefined);
    } else {
      onAddMessage(trimmed, sender, participantId || undefined);
    }
    setText("");
    setIsCommitting(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const nonUserParticipants = participants.filter((p) => !p.isUser);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs text-white/40">Send as:</label>
        <select
          value={sender}
          onChange={(e) => {
            setSender(e.target.value);
            if (e.target.value === "user") setParticipantId("");
          }}
          className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-white/20"
        >
          <option value="user">You</option>
          {nonUserParticipants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
          <option value="other">Other participant</option>
        </select>

        {sender === "other" && (
          <input
            type="text"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            placeholder="Participant name"
            className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        )}

        <label className="flex items-center gap-1.5 ml-auto">
          <input
            type="checkbox"
            checked={isCommitting}
            onChange={(e) => setIsCommitting(e.target.checked)}
            className="rounded border-white/20"
          />
          <span className="text-xs text-white/40">Commit to conversation</span>
        </label>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isCommitting ? "Add this message to the conversation..." : "Type a message..."}
          rows={2}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-white/20"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-white/30">
          {isCommitting ? "⌘+Enter to commit" : "⌘+Enter to add"}
        </span>
        <Button
          type="submit"
          disabled={!text.trim()}
          size="sm"
          variant={isCommitting ? "primary" : "secondary"}
        >
          {isCommitting ? "Commit" : "Add Message"}
        </Button>
      </div>
    </form>
  );
}
