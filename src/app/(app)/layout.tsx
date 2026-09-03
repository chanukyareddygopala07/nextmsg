import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black min-h-screen flex">
      <aside className="w-64 border-r border-white/5 p-4 hidden md:flex flex-col">
        <div className="text-xl font-bold text-white tracking-tight mb-8 px-3">
          NEXTMSG
        </div>
        <nav className="space-y-1 flex-1">
          <NavLink href="/dashboard" icon="🏠">Dashboard</NavLink>
          <NavLink href="/analyze" icon="✨">Analyze</NavLink>
          <NavLink href="/conversations" icon="💬">History</NavLink>
          <NavLink href="/style" icon="🧠">Your style</NavLink>
          <NavLink href="/settings" icon="⚙️">Settings</NavLink>
        </nav>
        <div className="border-t border-white/5 pt-4 px-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm text-white/60">
              U
            </div>
            <div className="text-sm text-white/60 truncate">user@email.com</div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5">
          <div className="text-lg font-bold text-white">NEXTMSG</div>
          <Link href="/analyze" className="px-4 py-2 bg-white text-black text-sm font-medium rounded-xl">
            Analyze
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
    >
      <span>{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
