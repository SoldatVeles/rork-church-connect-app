import {
  BookOpenText,
  Gift,
  HeartHandshake,
} from "lucide-react";

import { WebsiteRequestForm } from "@/components/WebsiteRequestForm";

export default function KostenloseBuecherPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%)]" />

        <div className="relative mx-auto max-w-6xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Kostenloses Studienmaterial
          </p>

          <h1 className="max-w-4xl text-[clamp(2rem,7vw,5rem)] font-extrabold leading-[1.03] tracking-[-0.04em]">
            Kostenlose Bücher bestellen
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Gerne senden wir Ihnen ausgewählte christliche Literatur und
            Bibelmaterial kostenlos zu. Die Bestellung ist unverbindlich.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <Gift className="text-[#d6a63f]" size={36} />
            <h2 className="mt-5 text-2xl font-bold">
              Was kann bestellt werden?
            </h2>
            <p className="mt-4 leading-7 text-[#475569]">
              Besucher können hier kostenlos Bücher, Broschüren oder
              Bibelstudienmaterial anfragen. Die genaue Auswahl kann später vom
              Vorstand oder der Literaturabteilung festgelegt werden.
            </p>
          </div>

          <div className="rounded-3xl bg-[#496b3f] p-7 text-white shadow-sm">
            <BookOpenText className="text-[#f0d28a]" size={36} />
            <h2 className="mt-5 text-2xl font-bold">Ziel dieser Seite</h2>
            <p className="mt-4 leading-7 text-white/80">
              Diese Seite soll Menschen helfen, Gottes Wort besser
              kennenzulernen und einen einfachen ersten Kontakt mit der Gemeinde
              zu ermöglichen.
            </p>
          </div>

          <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7">
            <HeartHandshake className="text-[#d6a63f]" size={36} />
            <h2 className="mt-5 text-2xl font-bold">Datenschutz</h2>
            <p className="mt-4 leading-7 text-[#475569]">
              Persönliche Angaben werden nur für die Bearbeitung der Anfrage
              verwendet und nicht öffentlich angezeigt.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-bold">Bestellformular</h2>
          <p className="mt-3 text-[#475569]">
            Senden Sie uns Ihre Kontaktdaten und die gewünschte Literatur.
            Ihre Angaben werden vertraulich behandelt.
          </p>

          <div className="mt-8">
            <WebsiteRequestForm variant="book" />
          </div>
        </div>
      </section>
    </main>
  );
}