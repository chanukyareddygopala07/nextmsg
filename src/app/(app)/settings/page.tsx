import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-white/40">Manage your account and privacy.</p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Privacy</h2>
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80">Store conversation history</p>
                  <p className="text-xs text-white/40">Save past analyses for quick access</p>
                </div>
                <div className="w-10 h-6 bg-white/10 rounded-full relative">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="border-t border-white/5 pt-4">
                <p className="text-sm text-white/80 mb-2">Delete all data</p>
                <p className="text-xs text-white/40 mb-3">
                  Permanently delete all your conversations, style profile, and account data.
                </p>
                <Button variant="danger" size="sm">
                  Delete all data
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-white/80">Email</p>
                <p className="text-xs text-white/40">user@example.com</p>
              </div>
              <div className="border-t border-white/5 pt-4">
                <p className="text-sm text-white/80 mb-2">Delete account</p>
                <p className="text-xs text-white/40 mb-3">
                  This action cannot be undone.
                </p>
                <Button variant="danger" size="sm">
                  Delete account
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
