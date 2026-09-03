import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/40">Your conversation copilot at a glance.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/analyze">
          <Card hover>
            <div className="text-3xl mb-3">✨</div>
            <h3 className="text-lg font-semibold text-white mb-1">Analyze screenshot</h3>
            <p className="text-sm text-white/40">Upload a chat screenshot</p>
          </Card>
        </Link>
        <Link href="/analyze">
          <Card hover>
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-white mb-1">Paste conversation</h3>
            <p className="text-sm text-white/40">Paste text from a chat</p>
          </Card>
        </Link>
        <Link href="/analyze">
          <Card hover>
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="text-lg font-semibold text-white mb-1">Start new</h3>
            <p className="text-sm text-white/40">Fresh conversation analysis</p>
          </Card>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Your style</h2>
          <Card>
            <div className="flex flex-wrap gap-2">
              {["Casual", "Short", "Lowercase", "Funny", "Moderate emojis"].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/60"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Link href="/style">
              <Button variant="ghost" size="sm" className="mt-4">
                Edit style
              </Button>
            </Link>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent conversations</h2>
          <Card>
            <p className="text-sm text-white/30">No conversations yet. Start by analyzing one!</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
