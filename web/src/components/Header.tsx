"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, Smartphone, X } from "lucide-react";
import { useState } from "react";

import { siteConfig } from "@/config/site";

const navigation = siteConfig.navigation;

export function Header() {
  const pathname = usePathname();
  const t = useTranslations("Header");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e8e0d0] bg-[#fdfcf9]/96 shadow-[0_8px_28px_rgba(7,29,53,0.05)] backdrop-blur-xl">
      <div className="site-container flex min-h-[4.6rem] items-center justify-between py-2.5 lg:min-h-0 lg:justify-center lg:py-4">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex min-w-0 items-center gap-3 lg:flex-col lg:gap-1.5 lg:text-center"
          aria-label="Zur Startseite"
        >
          <Image
            src="/images/sdarm-logo-navy-transparent.png"
            alt=""
            width={58}
            height={48}
            priority
            className="h-10 w-auto flex-none lg:h-12"
          />

          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-extrabold tracking-[-0.02em] text-[#0b2341] lg:text-[0.82rem]">
              Siebenten-Tags-Adventisten
            </span>
            <span className="mt-0.5 block truncate text-[0.68rem] font-bold text-[#496b3f] lg:text-[0.72rem]">
              Reformbewegung Schweiz
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#e5dfd0] bg-white text-[#0b2341] shadow-sm lg:hidden"
          aria-label={open ? "Menü schliessen" : t("openMenu")}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div className="hidden border-t border-[#eee8dc] lg:block">
        <div className="site-container flex min-h-12 items-center gap-3">
          <nav
            className="flex min-w-0 flex-1 items-center justify-between gap-1"
            aria-label="Hauptnavigation"
          >
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex min-h-12 items-center px-1.5 text-[0.74rem] font-bold transition xl:px-2 xl:text-[0.78rem] ${
                    active
                      ? "text-[#0b2341]"
                      : "text-[#526174] hover:text-[#0b2341]"
                  }`}
                >
                  {item.name}
                  <span
                    className={`absolute inset-x-1 bottom-0 h-0.5 rounded-full ${
                      active ? "bg-[#d6a63f]" : "bg-transparent"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <Link
            href="/app"
            className="inline-flex min-h-9 flex-none items-center gap-2 rounded-lg bg-[#d6a63f] px-3.5 py-2 text-xs font-extrabold text-[#071d35] transition hover:bg-[#e3b956]"
          >
            <Smartphone size={15} />
            Church Connect
          </Link>

          <button
            type="button"
            className="min-h-9 flex-none rounded-lg border border-[#e5dfd0] bg-white px-2.5 text-xs font-extrabold text-[#0b2341]"
            aria-label="Sprachauswahl: Deutsch"
          >
            {t("languageShort")}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-navigation"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4.6rem)] overflow-y-auto border-t border-[#e8e0d0] bg-[#fdfcf9] p-4 shadow-2xl lg:hidden"
        >
          <nav
            className="mx-auto flex w-full max-w-lg flex-col gap-1"
            aria-label="Mobile Navigation"
          >
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-12 items-center rounded-xl px-4 py-3 text-sm font-bold ${
                    active
                      ? "bg-[#eef3ea] text-[#36532e]"
                      : "text-[#0b2341] hover:bg-white"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            <div className="mt-3 grid gap-2 border-t border-[#e5dfd0] pt-4 sm:grid-cols-2">
              <Link
                href={siteConfig.freeBooks.href}
                onClick={() => setOpen(false)}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#d6a63f]/30 bg-white px-4 py-3 text-center text-sm font-bold text-[#0b2341]"
              >
                {siteConfig.freeBooks.shortTitle}
              </Link>

              <Link
                href="/app"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d6a63f] px-4 py-3 text-center text-sm font-bold text-[#071d35]"
              >
                <Smartphone size={17} />
                Church Connect
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
