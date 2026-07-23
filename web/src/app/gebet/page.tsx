import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Church,
  Clock,
  HeartHandshake,
  Lock,
  MapPin,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PrayerRequestForm } from "@/components/PrayerRequestForm";
import { getWebsiteEvents } from "@/lib/website-events";
import { getPrayerSubmissionChurches } from "@/lib/website-churches";
import { getWebsitePrayers } from "@/lib/website-prayers";

export const dynamic = "force-dynamic";

export default async function GebetPage() {
  const [publicPrayers, events, submissionChurches] = await Promise.all([
    getWebsitePrayers(),
    getWebsiteEvents(),
    getPrayerSubmissionChurches(),
  ]);
  const prayerMeetings = events.filter((event) => event.type === "Gebet");

  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-6 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(73,107,63,0.35),_transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Gebet
          </p>

          <h1 className="max-w-4xl text-4xl font-bold md:text-6xl">
            Gebet verbindet
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Gemeinsam bringen wir unsere Anliegen vor Gott. Gebetsanliegen
            werden vertraulich behandelt und sind standardmässig nicht
            öffentlich sichtbar.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#gebetsanliegen"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-[#c99631]"
            >
              Gebetsanliegen senden
              <ArrowRight size={18} />
            </a>

            <a
              href="#gebetstreffen"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-white/90"
            >
              Gebetstreffen ansehen
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
            Aktuelle Schwerpunkte
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Wofür wir gemeinsam beten
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#475569]">
            Diese öffentlichen Schwerpunkte sind allgemein formuliert. Private
            Namen und persönliche Details werden nicht öffentlich angezeigt.
          </p>
        </div>

        {publicPrayers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3">
            {publicPrayers.map((prayer) => (
              <article
                key={prayer.id}
                className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ea] text-[#496b3f]">
                    <HeartHandshake size={28} />
                  </div>
                  {prayer.isAnswered ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#166534]">
                      <CheckCircle2 size={14} />
                      Erhört
                    </span>
                  ) : null}
                </div>

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6a63f]">
                  {prayer.category}
                </p>
                <h3 className="mt-2 text-xl font-bold">{prayer.title}</h3>
                <p className="mt-3 leading-7 text-[#475569]">
                  {prayer.details}
                </p>
                <Link
                  href={`/gemeinden#${prayer.churchSlug}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#496b3f] hover:underline"
                >
                  {prayer.churchName}
                  <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-[#e5dfd0] bg-white p-10 text-center text-[#475569] shadow-sm">
            Zurzeit sind keine öffentlichen Gebetsschwerpunkte veröffentlicht.
          </p>
        )}
      </section>

      <section id="gebetstreffen" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
                Gebetstreffen
              </p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                Gemeinsam beten
              </h2>
              <p className="mt-4 max-w-2xl text-[#475569]">
                Freigegebene Gebetstreffen werden direkt aus Church Connect
                veröffentlicht.
              </p>
            </div>

            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 font-semibold text-[#0b2341] hover:underline"
            >
              Kontakt aufnehmen
              <ArrowRight size={18} />
            </Link>
          </div>

          {prayerMeetings.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {prayerMeetings.map((meeting) => (
                <article
                  key={meeting.slug}
                  className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-7"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0b2341] text-white">
                    <Church size={28} />
                  </div>

                  <h3 className="mt-5 text-2xl font-bold">{meeting.title}</h3>
                  <p className="mt-2 text-[#496b3f]">
                    {meeting.churchName ?? "Schweiz"}
                  </p>

                  <div className="mt-5 space-y-3 text-sm text-[#475569]">
                    <p className="flex gap-3">
                      <CalendarDays size={18} className="text-[#d6a63f]" />
                      {meeting.date}
                    </p>
                    <p className="flex gap-3">
                      <Clock size={18} className="text-[#d6a63f]" />
                      {meeting.time}
                    </p>
                    <p className="flex gap-3">
                      <MapPin size={18} className="text-[#496b3f]" />
                      {meeting.location}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-8 text-center text-[#475569]">
              Aktuell sind keine öffentlichen Gebetstreffen geplant.
            </p>
          )}
        </div>
      </section>

      <section id="gebetsanliegen" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d6a63f] text-[#071d35]">
                <Send size={24} />
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  Gebetsanliegen senden
                </h2>
                <p className="text-[#475569]">
                  Teilen Sie uns mit, wofür wir beten dürfen.
                </p>
              </div>
            </div>

            <PrayerRequestForm churches={submissionChurches} />
            <form className="hidden" aria-hidden="true">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Ihr Name, optional
                </label>
                <input
                  type="text"
                  placeholder="z. B. Maria"
                  className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  E-Mail, optional
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Ihr Anliegen
                </label>
                <textarea
                  rows={6}
                  placeholder="Wofür dürfen wir beten?"
                  className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Sichtbarkeit
                </label>
                <select className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]">
                  <option>Nur an die Gemeindeleitung senden</option>
                  <option>Anonym mit der Gemeinde teilen</option>
                  <option>Ich möchte zuerst kontaktiert werden</option>
                </select>
              </div>

              <label className="flex gap-3 text-sm text-[#475569]">
                <input type="checkbox" className="mt-1" />
                Ich bin einverstanden, dass meine Angaben zur Bearbeitung des
                Gebetsanliegens verwendet werden.
              </label>

              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0b2341] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
              >
                Anliegen vorbereiten
                <ArrowRight size={18} />
              </button>

              <p className="text-xs leading-5 text-[#64748b]">
                Hinweis: Die technische Übermittlung wird später mit Supabase
                verbunden. Bis dahin ist dieses Formular vorbereitet, aber noch
                nicht aktiv.
              </p>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-[#0b2341] p-7 text-white">
              <ShieldCheck className="text-[#d6a63f]" size={38} />
              <h3 className="mt-5 text-2xl font-bold">
                Datenschutz und Vertrauen
              </h3>
              <p className="mt-4 leading-7 text-white/75">
                Gebetsanliegen sind sehr persönlich. Deshalb werden sie
                vertraulich behandelt und nicht automatisch auf der Website
                veröffentlicht.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7">
              <Lock className="text-[#496b3f]" size={38} />
              <h3 className="mt-5 text-2xl font-bold">
                Privat als Standard
              </h3>
              <ul className="mt-4 space-y-3 text-[#475569]">
                <li>Private Anliegen bleiben privat.</li>
                <li>Namen werden nicht öffentlich angezeigt.</li>
                <li>Öffentliche Anliegen brauchen klare Freigabe.</li>
                <li>Leiter sehen nur, was sie sehen dürfen.</li>
              </ul>
            </div>

            <div className="rounded-3xl bg-[#496b3f] p-7 text-white">
              <Users className="text-[#f0d28a]" size={38} />
              <h3 className="mt-5 text-2xl font-bold">
                Gebet in Church Connect
              </h3>
              <p className="mt-4 leading-7 text-white/80">
                Gebetsanliegen werden in der App einer Gemeinde zugeordnet und
                sicher verwaltet. Nur eine ausdrücklich geprüfte, anonyme Kopie
                kann auf der Website erscheinen.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
        <div className="rounded-[2rem] bg-[#d6a63f] p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_0.7fr] md:items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#071d35]">
                Wir beten gerne für Sie
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-[#071d35]/75">
                Haben Sie ein Anliegen, wünschen Sie ein Gespräch oder möchten
                Sie eine Gemeinde besuchen? Nehmen Sie gerne Kontakt auf.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#071d35] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
              >
                Kontakt aufnehmen
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/gemeinden"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 font-semibold text-[#071d35] hover:bg-white/90"
              >
                Gemeinde finden
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}