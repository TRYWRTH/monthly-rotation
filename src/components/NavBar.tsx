"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Today", icon: "🏠" },
  { href: "/log", label: "Log", icon: "📝" },
  { href: "/calendar", label: "Calendar", icon: "🗓️" },
  { href: "/insights", label: "Insights", icon: "✨" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function NavBar() {
  const pathname = usePathname();
  const hidden = ["/login", "/signup", "/onboarding"].includes(pathname);
  if (hidden) return null;

  return (
    <nav className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--card)] pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md justify-between px-2">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs ${
                  active ? "text-[var(--primary)]" : "text-[var(--muted)]"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
