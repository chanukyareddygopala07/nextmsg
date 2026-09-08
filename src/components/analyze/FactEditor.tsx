"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export interface UserFact {
  id: string;
  text: string;
}

interface FactEditorProps {
  facts: UserFact[];
  onChange: (facts: UserFact[]) => void;
  maxFacts?: number;
}

let factCounter = 0;

export default function FactEditor({
  facts,
  onChange,
  maxFacts = 10,
}: FactEditorProps) {
  const [newFact, setNewFact] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const handleAdd = () => {
    const trimmed = newFact.trim();
    if (!trimmed || facts.length >= maxFacts) return;

    const fact: UserFact = { id: `fact-${Date.now()}-${factCounter++}`, text: trimmed };
    onChange([...facts, fact]);
    setNewFact("");
  };

  const handleDelete = (id: string) => {
    onChange(facts.filter((f) => f.id !== id));
  };

  const handleStartEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (!trimmed) return;

    onChange(facts.map((f) => (f.id === editingId ? { ...f, text: trimmed } : f)));
    setEditingId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: "add" | "save") => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (action === "add") handleAdd();
      else handleSaveEdit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/60">Key Facts</h3>
        <span className="text-xs text-white/30">
          {facts.length}/{maxFacts}
        </span>
      </div>

      <p className="text-xs text-white/30">
        Add context the AI should know — real names, events, dates, promises, etc.
      </p>

      {facts.length > 0 && (
        <div className="space-y-2">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3"
            >
              {editingId === fact.id ? (
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, "save")}
                  className="flex-1 bg-transparent text-sm text-white outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm text-white/80">{fact.text}</span>
              )}

              <div className="flex items-center gap-1">
                {editingId === fact.id ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveEdit}
                      className="text-green-400 hover:text-green-300"
                    >
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartEdit(fact.id, fact.text)}
                      className="text-white/30 hover:text-white/60 transition-colors p-1"
                      aria-label="Edit fact"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(fact.id)}
                      className="text-white/30 hover:text-red-400 transition-colors p-1"
                      aria-label="Delete fact"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {facts.length < maxFacts && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "add")}
            placeholder="e.g., Meeting was at 3pm yesterday"
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAdd}
            disabled={!newFact.trim()}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
