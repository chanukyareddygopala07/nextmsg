import Card from "@/components/ui/Card";

const features = [
  {
    title: "Screenshot analysis",
    description: "Upload a screenshot and AI extracts the conversation automatically.",
    icon: "📸",
  },
  {
    title: "Your texting style",
    description: "Learns how you text — your slang, emoji, tone, and pacing.",
    icon: "🧠",
  },
  {
    title: "Natural replies",
    description: "Generates messages that sound like you, not a chatbot.",
    icon: "💬",
  },
  {
    title: "Read the room",
    description: "Understands conversation stage, engagement, and momentum.",
    icon: "🎭",
  },
  {
    title: "Multiple strategies",
    description: "6 different approaches — playful, confident, curious, and more.",
    icon: "🎲",
  },
  {
    title: "Private by design",
    description: "Your conversations stay yours. Delete anytime.",
    icon: "🔒",
  },
];

export default function Features() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything you need
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            A conversation engine built around your personality.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title} hover>
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
