import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Church,
  Clock,
  Globe,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { publicEvents } from "@/data/events";
import { churches } from "@/data/churches";

export default function VeranstaltungenPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-6 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Veranstaltungen
          </p>

          <h1 className="max-w-4xl text-4xl font-bold md:text-6xl">
            Öffentliche Termine und Veranstaltungen
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Hier finden Besucher öffentliche Gottesdienste, Bibelstunden,
            Gebetsversammlungen und besondere Veranstaltungen unserer Gemeinden
            in der Schweiz.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/gemeinden"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-[#c99631]"
            >
              Gemeinde finden
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/kontakt"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-white/90"
            >
              Kontakt aufnehmen
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Aktuell
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Nächste öffentliche Termine
            </h2>
            <p className="mt-4 max-w-2xl text-[#475569]">
              In der ersten Version sind diese Termine noch statisch. Später
              werden sie direkt aus Church Connect und Supabase geladen.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e5dfd0] bg-white p-4 text-sm text-[#475569] shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 text-[#496b3f]" size={20} />
              <p>
                Nur Veranstaltungen, die ausdrücklich als öffentlich markiert
                sind, erscheinen auf der Website.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {publicEvents.map((event) => (
            <article
              key={event.title}
              className="overflow-hidden rounded-3xl border border-[#e5dfd0] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="bg-[linear-gradient(135deg,#0b2341,#496b3f)] p-6 text-white">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {event.type}
                </span>

                <h3 className="mt-5 text-2xl font-bold">{event.title}</h3>
              </div>

              <div className="p-6">
                <div className="space-y-3 text-sm text-[#475569]">
                  <p className="flex gap-3">
                    <CalendarDays size={18} className="text-[#d6a63f]" />
                    {event.date}
                  </p>

                  <p className="flex gap-3">
                    <Clock size={18} className="text-[#d6a63f]" />
                    {event.time}
                  </p>

                  <p className="flex gap-3">
                    <MapPin size={18} className="text-[#496b3f]" />
                    {event.location}
                  </p>
                </div>

                <p className="mt-5 leading-7 text-[#475569]">
                  {event.description}
                </p>

                <Link
                  href="/kontakt"
                  className="mt-6 inline-flex items-center gap-2 font-semibold text-[#0b2341] hover:underline"
                >
                  Mehr Informationen
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Nach Gemeinde
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Veranstaltungen pro Standort
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#475569]">
              Besucher können später nach Standort, Sprache und Art der
              Veranstaltung filtern.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {churches.map((church) => (
              <article
                key={church.slug}
                className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b2341] text-white">
                  <Church size={24} />
                </div>

                <h3 className="mt-5 text-xl font-bold">{church.name}</h3>

                <p className="mt-3 text-[#475569]">
                  {church.address}
                  <br />
                  {church.postalCode} {church.city}
                </p>

                <div className="mt-5 flex gap-2">
                  {church.languages.map((language) => (
                    <span
                      key={language}
                      className="rounded-full bg-[#eef3ea] px-3 py-1 text-xs font-semibold text-[#496b3f]"
                    >
                      {language}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/gemeinden#${church.slug}`}
                  className="mt-6 inline-flex items-center gap-2 font-semibold text-[#0b2341] hover:underline"
                >
                  Gemeinde ansehen
                  <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="rounded-[2rem] bg-[#0b2341] p-8 text-white md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-center">
            <div>
              <Globe className="text-[#d6a63f]" size={40} />

              <h2 className="mt-5 text-3xl font-bold">
                Veranstaltung veröffentlichen
              </h2>

              <p className="mt-4 max-w-2xl leading-7 text-white/75">
                Später können Verantwortliche in Church Connect entscheiden, ob
                ein Anlass privat bleibt, nur für Mitglieder sichtbar ist oder
                öffentlich auf sdarm.ch erscheinen soll.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-6">
              <p className="font-bold text-[#f0d28a]">
                Geplante Sichtbarkeiten
              </p>

              <ul className="mt-4 space-y-3 text-sm text-white/80">
                <li>Privat — nur intern in der App</li>
                <li>Gemeinde — nur eigene Gemeinde</li>
                <li>Schweiz — alle Gemeinden</li>
                <li>Öffentlich — sichtbar auf der Website</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}