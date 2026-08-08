"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  CalendarDays,
  Church,
  Heart,
  Home,
  Mail,
  Menu,
  Smartphone,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { WebsiteLanguageSelector } from "@/components/WebsiteLanguageSelector";
import { siteConfig } from "@/config/site";

const navigation = siteConfig.navigation;

const navigationIcons = {
  "/": Home,
  "/gemeinden": Church,
  "/veranstaltungen": CalendarDays,
  "/gebet": Heart,
  "/ueber-uns": Users,
  "/glaubenspunkte": BookOpenText,
  "/ressourcen": BookOpenText,
  "/kontakt": Mail,
};

export function Header() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(80);

  const measureHeader = useCallback(() => {
    const bottom = headerRef.current?.getBoundingClientRect().bottom;
    if (bottom !== undefined) setMenuTop(Math.max(0, bottom));
  }, []);

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) {
      window.setTimeout(() => menuButtonRef.current?.focus(), 0);
    }
  }, []);

  const toggleMenu = () => {
    if (!menuOpen) measureHeader();
    setMenuOpen((open) => !open);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu(true);
    };
    const updatePosition = () => measureHeader();

    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
    };
  }, [closeMenu, measureHeader, menuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-50 border-b border-[#e8e0d0] bg-[#fdfcf9]/96 shadow-[0_8px_28px_rgba(7,29,53,0.05)] backdrop-blur-xl"
      >
        <div className="mx-auto flex min-h-[4.75rem] w-full max-w-[90rem] items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-5 lg:px-8 xl:min-h-24 xl:py-2.5">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={toggleMenu}
            className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#dce8d5] ${
              menuOpen
                ? "border-[#0b2341] bg-[#0b2341] text-white"
                : "border-[#e5dfd0] bg-white text-[#0b2341] hover:border-[#b9c9ad] hover:bg-[#f8f6f1]"
            }`}
            aria-label={menuOpen ? "Seitennavigation schließen" : "Seitennavigation öffnen"}
            aria-controls="website-navigation-drawer"
            aria-expanded={menuOpen}
          >
            <Menu size={23} />
          </button>

          <Link
            href="/"
            onClick={() => closeMenu()}
            className="notranslate flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2.5 lg:gap-3"
            aria-label={`${siteConfig.name} – Zur Startseite`}
            translate="no"
          >
            <Image
              src="/images/sdarm-logo-navy-transparent.png"
              alt=""
              width={70}
              height={58}
              priority
              className="h-8 w-auto flex-none min-[360px]:h-9 sm:h-10 xl:h-14"
            />

            <span className="block min-w-0 text-[0.52rem] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#0b2341] min-[360px]:text-[0.59rem] sm:text-[0.72rem] sm:leading-[1.1] md:text-sm xl:max-w-[27rem] xl:text-base">
              {siteConfig.name}
            </span>
          </Link>

          <div className="flex flex-none items-center gap-1.5 sm:gap-2">
            <Link
              href="/app"
              className="notranslate inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-xl bg-[#d6a63f] font-extrabold text-[#071d35] shadow-sm transition hover:bg-[#e3b956] min-[390px]:w-auto min-[390px]:px-2.5 min-[390px]:text-[0.68rem] sm:px-3 sm:text-[0.72rem]"
              aria-label="Church Connect App"
              title="Church Connect"
              translate="no"
            >
              <Smartphone size={16} />
              <span className="hidden min-[390px]:inline sm:hidden">App</span>
              <span className="hidden sm:inline">Church Connect</span>
            </Link>

            <WebsiteLanguageSelector />
          </div>
        </div>
      </header>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 z-30 cursor-default bg-[#071d35]/35 backdrop-blur-[2px]"
            style={{ top: menuTop }}
            onClick={() => closeMenu(true)}
            aria-label="Seitennavigation schließen"
          />

          <aside
            id="website-navigation-drawer"
            className="fixed bottom-0 left-0 z-40 flex w-[min(22rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-tr-[1.75rem] border-r border-[#e5dfd0] bg-[#fdfcf9] shadow-[24px_20px_65px_rgba(7,29,53,0.22)]"
            style={{ top: menuTop }}
            aria-label="Seitennavigation"
          >
            <div className="border-b border-[#e8e0d0] px-5 py-4 sm:px-6">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-[#8e6a1d]">
                Seiten
              </p>
              <p className="mt-1 text-sm font-semibold text-[#526174]">
                Wohin möchten Sie gehen?
              </p>
            </div>

            <nav
              className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4"
              aria-label="Hauptnavigation"
            >
              <div className="space-y-1.5">
                {navigation.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));
                  const Icon =
                    navigationIcons[item.href as keyof typeof navigationIcons] ??
                    BookOpenText;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => closeMenu()}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex min-h-13 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition sm:text-[0.95rem] ${
                        active
                          ? "bg-[#eef3ea] text-[#294723] shadow-sm"
                          : "text-[#0b2341] hover:bg-white hover:shadow-sm"
                      }`}
                    >
                      <span
                        className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${
                          active ? "bg-[#d6a63f]" : "bg-transparent"
                        }`}
                      />
                      <span
                        className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${
                          active
                            ? "bg-white text-[#496b3f]"
                            : "bg-[#f4f0e7] text-[#526174] group-hover:text-[#496b3f]"
                        }`}
                      >
                        <Icon size={18} strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 leading-5">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-[#e5dfd0] pt-4">
                <Link
                  href={siteConfig.freeBooks.href}
                  onClick={() => closeMenu()}
                  className="flex min-h-13 items-center gap-3 rounded-xl border border-[#d6a63f]/35 bg-[#fffaf0] px-4 py-3 text-sm font-bold text-[#0b2341] transition hover:border-[#d6a63f] hover:bg-[#fff6df] sm:text-[0.95rem]"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[#d6a63f] text-[#071d35]">
                    <BookOpenText size={18} strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 leading-5">
                    {siteConfig.freeBooks.shortTitle}
                  </span>
                </Link>
              </div>
            </nav>

            <div className="border-t border-[#e8e0d0] bg-white/75 px-5 py-3 text-center text-[0.68rem] font-semibold text-[#6b7280] sm:px-6">
              staref.ch · Schweiz
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
