import Image from "next/image";
import Link from "next/link";
import { Globe, Mail, MapPin } from "lucide-react";

import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="bg-[#071d35] text-white">
      <div className="site-container grid gap-10 py-14 sm:grid-cols-2 xl:grid-cols-[1.35fr_0.8fr_0.8fr_1fr]">
        <div>
          <div className="mb-5 flex min-w-0 items-center gap-3">
            <Image
              src="/images/sdarm-logo-white-transparent.png"
              alt=""
              width={52}
              height={42}
              className="h-11 w-auto flex-none"
            />

            <div className="min-w-0">
              <p className="text-base font-extrabold leading-tight">
                STA Reformationbewegung
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/65">
                Schweiz
              </p>
            </div>
          </div>

          <p className="max-w-sm text-sm leading-7 text-white/70">
            {siteConfig.name}. Verbunden im Glauben, im Gebet und in der
            Mission.
          </p>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-[#f0d28a]">
            Gemeinden
          </h2>
          <ul className="space-y-3 text-sm leading-6 text-white/70">
            <li>Zürich / Regensdorf</li>
            <li>Genève / Grand-Lancy</li>
            <li>Bern / Oberbottigen</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-[#f0d28a]">
            Schnellzugriff
          </h2>
          <ul className="space-y-3 text-sm text-white/70">
            <li><Link href="/gemeinden" className="hover:text-white">Gemeinden</Link></li>
            <li><Link href="/veranstaltungen" className="hover:text-white">Veranstaltungen</Link></li>
            <li><Link href="/gebet" className="hover:text-white">Gebet</Link></li>
            <li><Link href={siteConfig.freeBooks.href} className="hover:text-white">Kostenlose Bücher</Link></li>
            <li><Link href="/kontakt" className="hover:text-white">Kontakt</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-[#f0d28a]">
            Kontakt
          </h2>
          <ul className="space-y-4 text-sm leading-6 text-white/70">
            <li className="flex items-start gap-3">
              <Globe className="mt-0.5" size={17} />
              <span>{siteConfig.domain}</span>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5" size={17} />
              <a className="break-all hover:text-white" href={`mailto:${siteConfig.email}`}>
                {siteConfig.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5" size={17} />
              <span>Schweiz</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="site-container flex flex-col gap-4 py-5 text-xs text-white/55 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p>© 2026 {siteConfig.name}.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/impressum" className="hover:text-white">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-white">Datenschutz</Link>
            <Link href="/gemeinschaftsregeln" className="hover:text-white">Gemeinschaftsregeln</Link>
            <Link href="/account-deletion" className="hover:text-white">Konto löschen</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
