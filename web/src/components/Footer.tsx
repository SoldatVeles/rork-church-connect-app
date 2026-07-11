import Link from "next/link";
import { Mail, MapPin, Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#071d35] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4 lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/70">
              ✝
            </div>
            <div>
              <p className="font-bold">Reformbewegung</p>
              <p className="text-sm text-white/70">Schweiz</p>
            </div>
          </div>

          <p className="text-sm leading-6 text-white/75">
            Siebenten-Tags-Adventisten Reformbewegung Schweiz.
            Verbunden im Glauben, im Gebet und in der Mission.
          </p>
        </div>

        <div>
          <h3 className="mb-4 font-bold">Gemeinden</h3>
          <ul className="space-y-2 text-sm text-white/75">
            <li>Zürich / Regensdorf</li>
            <li>Genève / Grand-Lancy</li>
            <li>Bern / Oberbottigen</li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-bold">Schnellzugriff</h3>
          <ul className="space-y-2 text-sm text-white/75">
            <li>
              <Link href="/gemeinden" className="hover:text-white">
                Gemeinden
              </Link>
            </li>
            <li>
              <Link href="/veranstaltungen" className="hover:text-white">
                Veranstaltungen
              </Link>
            </li>
            <li>
              <Link href="/gebet" className="hover:text-white">
                Gebet
              </Link>
            </li>
            <li>
              <Link href="/kontakt" className="hover:text-white">
                Kontakt
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-bold">Kontakt</h3>
          <ul className="space-y-3 text-sm text-white/75">
            <li className="flex gap-2">
              <Globe size={16} />
              sdarm.ch
            </li>
            <li className="flex gap-2">
              <Mail size={16} />
              info@sdarm.ch
            </li>
            <li className="flex gap-2">
              <MapPin size={16} />
              Schweiz
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 text-xs text-white/60 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2026 Siebenten-Tags-Adventisten Reformbewegung Schweiz.</p>

          <div className="flex gap-5">
            <Link href="/impressum" className="hover:text-white">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-white">
              Datenschutz
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}