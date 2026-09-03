import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import CTA from "@/components/landing/CTA";

export default function HomePage() {
  return (
    <main className="bg-black min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-bold text-white tracking-tight">NEXTMSG</div>
        <div className="flex items-center gap-3">
          <a href="/login" className="text-sm text-white/50 hover:text-white transition-colors">
            Sign in
          </a>
          <a
            href="/signup"
            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            Get started
          </a>
        </div>
      </nav>

      <Hero />
      <Features />
      <CTA />

      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm text-white/30">NEXTMSG</div>
          <div className="text-sm text-white/30">Built for real conversations</div>
        </div>
      </footer>
    </main>
  );
}
