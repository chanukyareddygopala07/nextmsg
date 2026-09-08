"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import type { WorkspaceParticipant } from "@/lib/ai/workspace-types";

interface WorkspaceParticipantManagerProps {
  participants: WorkspaceParticipant[];
  onAdd: (displayName: string, role: string, language?: string) => void;
  onUpdate: (participantId: string, updates: Partial<WorkspaceParticipant>) => void;
  onRemove: (participantId: string) => void;
}

export default function WorkspaceParticipantManager({
  participants,
  onAdd,
  onUpdate,
  onRemove,
}: WorkspaceParticipantManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("participant");
  const [newLanguage, setNewLanguage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAdd(trimmed, newRole, newLanguage.trim() || undefined);
    setNewName("");
    setNewRole("participant");
    setNewLanguage("");
    setIsAdding(false);
  }

  function handleStartEdit(p: WorkspaceParticipant) {
    setEditingId(p.id);
    setEditName(p.displayName);
    setEditRole(p.role);
  }

  function handleSaveEdit() {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    onUpdate(editingId, { displayName: trimmed, role: editRole });
    setEditingId(null);
  }

  function handleRemove(participantId: string) {
    onRemove(participantId);
    setRemoveConfirmId(null);
  }

  const userParticipant = participants.find((p) => p.isUser);
  const otherParticipants = participants.filter((p) => !p.isUser);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Participants</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsAdding(true)}
        >
          + Add
        </Button>
      </div>

      {userParticipant && (
        <div className="px-3 py-2 bg-white/5 rounded-lg">
          <span className="text-xs font-medium text-blue-400">{userParticipant.displayName}</span>
          <span className="text-xs text-white/30 ml-2">(you)</span>
        </div>
      )}

      {otherParticipants.map((p) => (
        <div
          key={p.id}
          className="px-3 py-2 bg-white/5 rounded-lg flex items-center justify-between gap-2"
        >
          {editingId === p.id ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white focus:outline-none"
                autoFocus
              />
              <input
                type="text"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                placeholder="Role"
                className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white placeholder:text-white/30 focus:outline-none"
              />
              <button onClick={handleSaveEdit} className="text-xs text-blue-400 hover:text-blue-300">Save</button>
              <button onClick={() => setEditingId(null)} className="text-xs text-white/40 hover:text-white/60">Cancel</button>
            </div>
          ) : removeConfirmId === p.id ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-white/60">Remove {p.displayName}?</span>
              <button onClick={() => handleRemove(p.id)} className="text-xs text-red-400 hover:text-red-300">Yes</button>
              <button onClick={() => setRemoveConfirmId(null)} className="text-xs text-white/40 hover:text-white/60">No</button>
            </div>
          ) : (
            <>
              <div>
                <span className="text-xs font-medium text-white/70">{p.displayName}</span>
                {p.role && <span className="text-xs text-white/30 ml-2">{p.role}</span>}
                {p.language && <span className="text-xs text-white/30 ml-2">({p.language})</span>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleStartEdit(p)}
                  className="text-xs text-white/30 hover:text-white/50 px-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => setRemoveConfirmId(p.id)}
                  className="text-xs text-red-400/50 hover:text-red-400 px-1"
                >
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {otherParticipants.length === 0 && !isAdding && (
        <p className="text-xs text-white/30 text-center py-2">No other participants</p>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="px-3 py-2 bg-white/5 rounded-lg space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Display name"
            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white placeholder:text-white/30 focus:outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Role (e.g., partner, colleague)"
              className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white placeholder:text-white/30 focus:outline-none"
            />
            <input
              type="text"
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              placeholder="Language"
              className="w-24 px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-white/40 hover:text-white/60"
            >
              Cancel
            </button>
            <Button type="submit" disabled={!newName.trim()} size="sm">
              Add
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
