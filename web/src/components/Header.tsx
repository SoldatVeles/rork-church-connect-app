"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, Smartphone, X } from "lucide-react";
import { useState } from "react";

import { WebsiteLanguageSelector } from "@/components/WebsiteLanguageSelector";
import { siteConfig } from "@/config/site";

const navigation = siteConfig.navigation;

export function Header() {
  const pathname = usePathname();
  const t = useTranslations("Header");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e8e0d0] bg-[#fdfcf9]/96 shadow-[0_8px_28px_rgba(7,29,53,0.05)] backdrop-blur-xl">
      <div className="site-container flex min-h-[4.6rem] items-center justify-between gap-4 py-2.5 xl:min-h-20 xl:py-0">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex min-w-0 items-center gap-3 xl:w-[12.5rem] xl:flex-none"
          aria-label="Zur Startseite"
        >
          <Image
            src="/images/sdarm-logo-navy-transparent.png"
            alt=""
            width={58}
            height={48}
            priority
            className="h-10 w-auto flex-none xl:h-11"
          />

          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-extrabold tracking-[-0.02em] text-[#0b2341] xl:text-[0.72rem]">
              Siebenten-Tags-Adventisten
            </span>
            <span className="mt-0.5 block truncate text-[0.68rem] font-bold text-[#496b3f] xl:text-[0.65rem]">
              Reformbewegung Schweiz
            </span>
          </span>
        </Link>

        <nav
          className="hidden min-w-0 flex-1 self-stretch items-center justify-center gap-0.5 xl:flex"
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
                className={`relative flex h-full min-w-0 items-center px-1.5 text-center text-[0.69rem] font-bold transition 2xl:px-2 2xl:text-[0.73rem] ${
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

        <div className="hidden flex-none items-center gap-2 xl:flex">
          <Link
            href="/app"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#d6a63f] px-3 py-2 text-[0.7rem] font-extrabold text-[#071d35] transition hover:bg-[#e3b956]"
          >
            <Smartphone size={14} />
            Church Connect
          </Link>

          <WebsiteLanguageSelector />
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#e5dfd0] bg-white text-[#0b2341] shadow-sm xl:hidden"
          aria-label={open ? "Menü schließen" : t("openMenu")}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open ? (
        <div
          id="mobile-navigation"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4.6rem)] overflow-y-auto border-t border-[#e8e0d0] bg-[#fdfcf9] p-4 shadow-2xl xl:hidden"
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

            <div className="mt-2">
              <WebsiteLanguageSelector mobile />
              <p className="mt-1.5 px-1 text-[0.68rem] font-semibold text-[#6b7280]">
                Automatische Übersetzung
              </p>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
