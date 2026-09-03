import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px]" />

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white/60 mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          AI conversation copilot
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
          Never wonder what
          <br />
          to say next.
        </h1>

        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI that understands the conversation — and writes the reply like you would.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="min-w-[200px]">
            Analyze a conversation
          </Button>
          <Button variant="secondary" size="lg" className="min-w-[200px]">
            See how it works
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto text-center">
          <div>
            <div className="text-2xl font-bold text-white">3s</div>
            <div className="text-sm text-white/40">Analysis time</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">6</div>
            <div className="text-sm text-white/40">Reply strategies</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">0%</div>
            <div className="text-sm text-white/40">AI-sounding</div>
          </div>
        </div>
      </div>
    </section>
  );
}
