"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, History, PawPrint, Settings } from "lucide-react";

const items = [
  { href: "/", label: "Today", icon: CalendarCheck },
  { href: "/pets", label: "Pets", icon: PawPrint },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <span className={`rounded-full px-4 py-1 transition ${active ? "bg-brand-soft" : ""}`}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
