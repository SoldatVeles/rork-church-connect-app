import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Gift,
  HeartHandshake,
  Mail,
  MapPin,
  User,
} from "lucide-react";
import { siteConfig } from "@/config/site";

export default function KostenloseBuecherPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-6 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Kostenloses Studienmaterial
          </p>

          <h1 className="max-w-4xl text-4xl font-bold md:text-6xl">
            Kostenlose Bücher bestellen
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Gerne senden wir Ihnen ausgewählte christliche Literatur und
            Bibelmaterial kostenlos zu. Die Bestellung ist unverbindlich.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
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
            Dieses Formular ist im ersten Schritt nur vorbereitet. Später
            verbinden wir es mit Supabase oder senden die Anfrage per E-Mail.
          </p>

          <form className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Vorname und Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-[#64748b]" size={18} />
                <input
                  type="text"
                  placeholder="Ihr Name"
                  className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-10 py-3 outline-none focus:border-[#d6a63f]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-[#64748b]" size={18} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-10 py-3 outline-none focus:border-[#d6a63f]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Adresse
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-[#64748b]" size={18} />
                <input
                  type="text"
                  placeholder="Strasse, PLZ, Ort"
                  className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-10 py-3 outline-none focus:border-[#d6a63f]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Gewünschtes Material
              </label>
              <select className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]">
                <option>Bitte auswählen</option>
                <option>Bibelstudienmaterial</option>
                <option>Christliches Buch</option>
                <option>Material über den Sabbat</option>
                <option>Material über Gesundheit und Familie</option>
                <option>Ich bin nicht sicher</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Nachricht, optional
              </label>
              <textarea
                rows={5}
                placeholder="Ihre Nachricht oder Frage"
                className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
              />
            </div>

            <label className="flex gap-3 text-sm text-[#475569]">
              <input type="checkbox" className="mt-1" />
              Ich bin einverstanden, dass meine Angaben zur Bearbeitung meiner
              Anfrage verwendet werden.
            </label>

            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0b2341] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
            >
              Anfrage vorbereiten
              <ArrowRight size={18} />
            </button>

            <p className="text-xs leading-5 text-[#64748b]">
              Hinweis: Die technische Übermittlung wird im nächsten Schritt
              aktiviert. Bis dahin kann die Anfrage direkt über{" "}
              <Link
                href={`mailto:${siteConfig.email}`}
                className="font-semibold text-[#0b2341] underline"
              >
                {siteConfig.email}
              </Link>{" "}
              erfolgen.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}