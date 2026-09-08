"use client";

import { useState } from "react";
import type { WorkspaceMessage, WorkspaceParticipant } from "@/lib/ai/workspace-types";

interface WorkspaceConversationProps {
  messages: WorkspaceMessage[];
  participants: WorkspaceParticipant[];
  selectedMessageId: string | null;
  onSelectMessage: (messageId: string | null) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

export default function WorkspaceConversation({
  messages,
  participants,
  selectedMessageId,
  onSelectMessage,
  onEditMessage,
  onDeleteMessage,
}: WorkspaceConversationProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  function getParticipantName(participantId: string | null): string {
    if (!participantId) return "Unknown";
    const p = participants.find((p) => p.id === participantId);
    return p?.displayName || "Unknown";
  }

  function getSenderLabel(sender: string, participantId: string | null): string {
    if (sender === "user") return "You";
    return getParticipantName(participantId);
  }

  function getSenderColor(sender: string): string {
    if (sender === "user") return "text-blue-400";
    return "text-white/70";
  }

  function startEditing(message: WorkspaceMessage) {
    setEditingId(message.id);
    setEditText(message.text);
  }

  function saveEdit(messageId: string) {
    if (editText.trim()) {
      onEditMessage(messageId, editText.trim());
    }
    setEditingId(null);
    setEditText("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-white/40 text-sm">No messages yet</p>
        <p className="text-white/30 text-xs">Add a message or paste a conversation to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Conversation</h3>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`group px-3 py-2 rounded-lg cursor-pointer transition-all ${
            selectedMessageId === message.id
              ? "bg-white/10 border border-white/20"
              : "hover:bg-white/5 border border-transparent"
          }`}
          onClick={() => {
            if (editingId !== message.id) {
              onSelectMessage(selectedMessageId === message.id ? null : message.id);
            }
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className={`text-xs font-medium ${getSenderColor(message.sender)}`}>
                {getSenderLabel(message.sender, message.participantId)}
              </span>
              {editingId === message.id ? (
                <div className="mt-1 space-y-1">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        saveEdit(message.id);
                      }
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="w-full text-sm text-white/80 bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-white/40"
                    rows={2}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); saveEdit(message.id); }}
                      className="text-xs text-green-400 hover:text-green-300 px-2 py-0.5 rounded bg-white/5"
                    >
                      Save
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                      className="text-xs text-white/40 hover:text-white/60 px-2 py-0.5 rounded bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/80 mt-0.5 whitespace-pre-wrap break-words">{message.text}</p>
              )}
            </div>
            {selectedMessageId === message.id && editingId !== message.id && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); startEditing(message); }}
                  className="text-xs text-white/40 hover:text-white/60 px-1.5 py-0.5 rounded bg-white/5"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteMessage(message.id); }}
                  className="text-xs text-red-400/60 hover:text-red-400 px-1.5 py-0.5 rounded bg-white/5"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
