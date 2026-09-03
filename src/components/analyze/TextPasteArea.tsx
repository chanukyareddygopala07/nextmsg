"use client";

import { useState } from "react";

interface TextPasteAreaProps {
  onParse: (text: string) => void;
}

export default function TextPasteArea({ onParse }: TextPasteAreaProps) {
  const [text, setText] = useState("");

  const handleParse = () => {
    if (text.trim()) {
      onParse(text.trim());
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Paste your conversation here...\n\nThem: ...\nMe: ...\nThem: ...`}
        className="w-full h-48 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none font-mono text-sm"
      />
      <button
        onClick={handleParse}
        disabled={!text.trim()}
        className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Parse conversation
      </button>
    </div>
  );
}
