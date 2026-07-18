import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Gift,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";

import { siteConfig } from "@/config/site";

export function FreeBooksSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-[#e5dfd0] bg-[#f8f6f1] shadow-sm">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0b2341,#496b3f)] p-8 text-white md:p-12">
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#d6a63f]/20" />
              <div className="absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-white/10" />

              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                  <Gift size={32} className="text-[#f0d28a]" />
                </div>

                <p className="mt-8 text-sm font-semibold uppercase tracking-[0.25em] text-[#f0d28a]">
                  Kostenloses Angebot
                </p>

                <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                  Kostenlose christliche Bücher bestellen
                </h2>

                <p className="mt-5 max-w-xl leading-7 text-white/80">
                  Wir senden Ihnen gerne ausgewählte Bücher, Broschüren oder
                  Bibelstudienmaterial kostenlos und unverbindlich zu.
                </p>

                <Link
                  href={siteConfig.freeBooks.href}
                  className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] shadow-sm transition hover:bg-[#c99631]"
                >
                  Jetzt Bücher bestellen
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
                Glauben entdecken
              </p>

              <h3 className="mt-3 text-3xl font-bold text-[#0b2341]">
                Gottes Wort persönlich kennenlernen
              </h3>

              <p className="mt-5 leading-7 text-[#475569]">
                Das kostenlose Literaturangebot soll Menschen helfen, biblische
                Themen in Ruhe zu studieren und einen einfachen ersten Kontakt
                mit der Gemeinde zu finden.
              </p>

              <div className="mt-8 grid gap-5 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#e5dfd0] bg-white p-5">
                  <BookOpenText className="text-[#496b3f]" size={28} />
                  <h4 className="mt-4 font-bold">Bibelstudium</h4>
                  <p className="mt-2 text-sm leading-6 text-[#64748b]">
                    Material zu wichtigen biblischen Themen.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e5dfd0] bg-white p-5">
                  <HeartHandshake className="text-[#496b3f]" size={28} />
                  <h4 className="mt-4 font-bold">Unverbindlich</h4>
                  <p className="mt-2 text-sm leading-6 text-[#64748b]">
                    Die Bestellung verpflichtet zu nichts.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e5dfd0] bg-white p-5">
                  <ShieldCheck className="text-[#496b3f]" size={28} />
                  <h4 className="mt-4 font-bold">Vertraulich</h4>
                  <p className="mt-2 text-sm leading-6 text-[#64748b]">
                    Angaben werden nur zur Bearbeitung verwendet.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={siteConfig.freeBooks.href}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0b2341] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
                >
                  Zur Buchbestellung
                  <ArrowRight size={18} />
                </Link>

                <Link
                  href="/kontakt"
                  className="inline-flex items-center justify-center rounded-md border border-[#e5dfd0] bg-white px-6 py-3 font-semibold text-[#0b2341] hover:bg-[#f8f6f1]"
                >
                  Frage stellen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}