import Link from "next/link";

import { EventCoverImage } from "@/components/EditorialImage";
import {
  ArrowRight,
  CalendarDays,
  Church,
  Clock,
  Globe,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { getWebsiteChurches } from "@/lib/website-churches";
import { getWebsiteEvents } from "@/lib/website-events";

export const dynamic = "force-dynamic";

export default async function VeranstaltungenPage() {
  const [events, churches] = await Promise.all([
    getWebsiteEvents(),
    getWebsiteChurches(),
  ]);
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%)]" />

        <div className="relative mx-auto max-w-6xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Veranstaltungen
          </p>

          <h1 className="max-w-4xl text-[clamp(2rem,7vw,5rem)] font-extrabold leading-[1.03] tracking-[-0.04em]">
            Öffentliche Termine und Veranstaltungen
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Hier finden Besucher öffentliche Gottesdienste, Bibelstunden,
            Gebetsversammlungen und besondere Veranstaltungen unserer Gemeinden
            in der Schweiz.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Link
              href="/gemeinden"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-[#c99631]"
            >
              Gemeinde finden
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/kontakt"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-white/90"
            >
              Kontakt aufnehmen
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Aktuell
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Nächste öffentliche Termine
            </h2>
            <p className="mt-4 max-w-2xl text-[#475569]">
              Diese Termine werden direkt aus Church Connect geladen und nur
              nach ausdrücklicher Freigabe öffentlich angezeigt.
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

        {events.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event, index) => (
            <article
              key={event.slug}
              className="overflow-hidden rounded-3xl border border-[#e5dfd0] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <EventCoverImage index={index} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071d35]/35 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-[#496b3f] px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                  {event.type}
                </span>
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

                {event.registrationInformation && (
                  <p className="mt-4 rounded-xl bg-[#eef3ea] p-3 text-sm text-[#496b3f]">
                    {event.registrationInformation}
                  </p>
                )}

                <Link
                  href={
                    event.churchSlug
                      ? `/gemeinden#${event.churchSlug}`
                      : "/kontakt"
                  }
                  className="mt-6 inline-flex items-center gap-2 font-semibold text-[#0b2341] hover:underline"
                >
                  {event.churchName ?? "Mehr Informationen"}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-[#e5dfd0] bg-white p-10 text-center text-[#475569] shadow-sm">
            Zurzeit sind keine öffentlichen Veranstaltungen geplant.
          </p>
        )}
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Nach Gemeinde
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Veranstaltungen pro Standort
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#475569]">
              Entdecken Sie die Gemeinde hinter einer Veranstaltung und
              planen Sie Ihren Besuch.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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

                <div className="mt-5 flex flex-wrap gap-2">
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

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="rounded-[2rem] bg-[#0b2341] p-8 text-white md:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] md:items-center">
            <div>
              <Globe className="text-[#d6a63f]" size={40} />

              <h2 className="mt-5 text-3xl font-bold">
                Veranstaltung veröffentlichen
              </h2>

              <p className="mt-4 max-w-2xl leading-7 text-white/75">
                Verantwortliche können in Church Connect eine bereinigte
                öffentliche Version prüfen, veröffentlichen, aktualisieren oder
                wieder von staref.ch zurückziehen.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-6">
              <p className="font-bold text-[#f0d28a]">
                Verfügbare Sichtbarkeiten
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
