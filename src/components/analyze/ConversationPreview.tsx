import type { ConversationMessage } from "@/types/conversation";

interface ConversationPreviewProps {
  messages: ConversationMessage[];
}

export default function ConversationPreview({ messages }: ConversationPreviewProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-white/60 mb-3">Conversation</h3>
      <div className="bg-white/5 rounded-xl p-4 space-y-2 max-h-64 overflow-y-auto">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                msg.sender === "me"
                  ? "bg-blue-500/20 text-blue-100 rounded-br-sm"
                  : msg.sender === "them"
                  ? "bg-white/10 text-white/80 rounded-bl-sm"
                  : "bg-white/5 text-white/40 italic"
              }`}
            >
              <span className="text-[10px] text-white/30 block mb-0.5">
                {msg.sender === "me" ? "You" : msg.sender === "them" ? "Them" : "?"}
              </span>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
