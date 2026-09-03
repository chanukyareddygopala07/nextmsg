import Card from "@/components/ui/Card";

export default function ConversationsPage() {
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">History</h1>
        <p className="text-white/40">Your past conversation analyses.</p>
      </div>

      <Card>
        <p className="text-sm text-white/30">No conversations yet. Start by analyzing one!</p>
      </Card>
    </div>
  );
}
