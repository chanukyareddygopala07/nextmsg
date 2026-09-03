import Button from "@/components/ui/Button";

export default function CTA() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Start sounding like yourself
        </h2>
        <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto">
          Stop overthinking your replies. Let AI handle the hard part while you stay in control.
        </p>
        <Button size="lg" className="min-w-[240px]">
          Analyze a conversation
        </Button>
      </div>
    </section>
  );
}
