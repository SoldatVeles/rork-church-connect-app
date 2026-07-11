"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Smartphone } from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Startseite", href: "/" },
  { name: "Gemeinden", href: "/gemeinden" },
  { name: "Veranstaltungen", href: "/veranstaltungen" },
  { name: "Gebet", href: "/gebet" },
  { name: "Über uns", href: "/ueber-uns" },
  { name: "Glaubensgrundsätze", href: "/glaubensgrundsaetze" },
  { name: "Ressourcen", href: "/ressourcen" },
  { name: "Kontakt", href: "/kontakt" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e8e0d0] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-[#0b2341] text-[#0b2341]">
            ✝
          </div>

          <div className="leading-tight">
            <p className="text-lg font-bold text-[#0b2341]">
              Reformbewegung
            </p>
            <p className="text-sm font-semibold text-[#496b3f]">Schweiz</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 py-7 text-sm font-semibold transition ${
                  active
                    ? "border-[#d6a63f] text-[#0b2341]"
                    : "border-transparent text-[#263b55] hover:border-[#d6a63f] hover:text-[#0b2341]"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-md bg-[#0b2341] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#12365f]"
          >
            <Smartphone size={16} />
            Church Connect App
          </Link>

          <button className="text-sm font-bold text-[#0b2341]">DE ▾</button>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="rounded-md border border-[#e8e0d0] p-2 text-[#0b2341] lg:hidden"
          aria-label="Menü öffnen"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#e8e0d0] bg-white px-5 py-5 lg:hidden">
          <nav className="flex flex-col gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-sm font-semibold text-[#0b2341] hover:bg-[#f8f6f1]"
              >
                {item.name}
              </Link>
            ))}

            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className="mt-3 rounded-md bg-[#0b2341] px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Church Connect App
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}