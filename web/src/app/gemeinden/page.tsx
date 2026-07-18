import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Church,
  ExternalLink,
  Globe2,
  HeartHandshake,
  Info,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

import { churches } from "@/data/churches";
import { siteConfig } from "@/config/site";

export default function GemeindenPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-6 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(73,107,63,0.35),_transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Gemeinden
          </p>

          <h1 className="max-w-4xl text-4xl font-bold md:text-6xl">
            Unsere Gemeinden in der Schweiz
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Finden Sie eine Gemeinde in Ihrer Nähe. Besucher sind herzlich
            willkommen, am Sabbat mit uns Gottes Wort zu studieren, zu beten und
            Gemeinschaft zu erleben.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#standorte"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-[#c99631]"
            >
              Standorte ansehen
              <ArrowRight size={18} />
            </a>

            <Link
              href="/kontakt"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-white/90"
            >
              Besuch anfragen
            </Link>
          </div>

          <div className="mt-12 grid max-w-3xl gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
            <div>
              <p className="text-3xl font-bold text-[#f0d28a]">3</p>
              <p className="mt-1 text-sm text-white/65">Gemeinden</p>
            </div>

            <div>
              <p className="text-3xl font-bold text-[#f0d28a]">DE / FR</p>
              <p className="mt-1 text-sm text-white/65">Sprachen</p>
            </div>

            <div>
              <p className="text-3xl font-bold text-[#f0d28a]">CH</p>
              <p className="mt-1 text-sm text-white/65">Schweizweit</p>
            </div>
          </div>
        </div>
      </section>

      <section id="standorte" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Standorte
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Gemeinden und Versammlungsorte
            </h2>
            <p className="mt-4 max-w-2xl text-[#475569]">
              Die angegebenen Räume sind gemietete Versammlungsorte. Für genaue
              Zeiten und besondere Veranstaltungen kontaktieren Sie uns bitte
              vorher.
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

        <div className="grid gap-8 lg:grid-cols-3">
          {churches.map((church) => (
            <article
              id={church.slug}
              key={church.slug}
              className="overflow-hidden rounded-3xl border border-[#e5dfd0] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="bg-[linear-gradient(135deg,#0b2341,#496b3f)] p-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                    <Church size={28} />
                  </div>

                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                    {church.region}
                  </span>
                </div>

                <h3 className="mt-6 text-2xl font-bold">{church.name}</h3>
                <p className="mt-2 text-white/75">{church.city}</p>
              </div>

              <div className="p-7">
                <p className="leading-7 text-[#475569]">
                  {church.description}
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 text-[#496b3f]" size={20} />
                    <div>
                      <p className="font-semibold">Adresse</p>
                      <p className="mt-1 text-sm leading-6 text-[#475569]">
                        {church.address}
                        <br />
                        {church.postalCode} {church.city}
                        <br />
                        {church.country}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CalendarDays
                      className="mt-0.5 text-[#d6a63f]"
                      size={20}
                    />
                    <div>
                      <p className="font-semibold">Gottesdienst</p>
                      <p className="mt-1 text-sm text-[#475569]">
                        {church.meetingTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 text-[#d6a63f]" size={20} />
                    <div>
                      <p className="font-semibold">Hinweis</p>
                      <p className="mt-1 text-sm text-[#475569]">
                        {church.note}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Globe2 className="mt-0.5 text-[#496b3f]" size={20} />
                    <div>
                      <p className="font-semibold">Sprachen</p>
                      <div className="mt-2 flex gap-2">
                        {church.languages.map((language) => (
                          <span
                            key={language}
                            className="rounded-full bg-[#eef3ea] px-3 py-1 text-xs font-semibold text-[#496b3f]"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-3">
                  <a
                    href={church.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0b2341] px-5 py-3 font-semibold text-white hover:bg-[#12365f]"
                  >
                    Auf Karte öffnen
                    <ExternalLink size={16} />
                  </a>

                  <Link
                    href="/kontakt"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-[#e5dfd0] bg-[#f8f6f1] px-5 py-3 font-semibold text-[#0b2341] hover:bg-white"
                  >
                    Besuch anfragen
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="rounded-3xl bg-[#496b3f] p-8 text-white">
            <HeartHandshake className="text-[#f0d28a]" size={42} />
            <h2 className="mt-6 text-3xl font-bold">
              Besucher sind herzlich willkommen
            </h2>
            <p className="mt-4 leading-7 text-white/80">
              Sie dürfen einfach kommen, zuhören, Fragen stellen und die
              Gemeinschaft kennenlernen. Wenn Sie zum ersten Mal kommen möchten,
              können Sie uns gerne vorher kontaktieren.
            </p>

            <Link
              href="/kontakt"
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 font-semibold text-[#496b3f]"
            >
              Kontakt aufnehmen
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6">
              <Users className="text-[#d6a63f]" size={34} />
              <h3 className="mt-5 text-xl font-bold">Gemeinschaft</h3>
              <p className="mt-3 leading-7 text-[#475569]">
                Unsere Gemeinden sind Orte der Anbetung, des Gebets und der
                gegenseitigen Ermutigung.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6">
              <CalendarDays className="text-[#d6a63f]" size={34} />
              <h3 className="mt-5 text-xl font-bold">Sabbat</h3>
              <p className="mt-3 leading-7 text-[#475569]">
                Der Sabbat ist ein besonderer Tag für Ruhe, Gottesdienst und
                gemeinsames Bibelstudium.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6">
              <ShieldCheck className="text-[#d6a63f]" size={34} />
              <h3 className="mt-5 text-xl font-bold">Verantwortlich</h3>
              <p className="mt-3 leading-7 text-[#475569]">
                Öffentliche Informationen werden bewusst freigegeben und
                persönliche Daten geschützt.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6">
              <MapPin className="text-[#d6a63f]" size={34} />
              <h3 className="mt-5 text-xl font-bold">Standorte</h3>
              <p className="mt-3 leading-7 text-[#475569]">
                Zurzeit sind wir in Zürich / Regensdorf, Genève / Grand-Lancy
                und Bern / Oberbottigen vertreten.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="rounded-[2rem] bg-[#d6a63f] p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#071d35]">
                Möchten Sie eine Gemeinde besuchen?
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-[#071d35]/75">
                Schreiben Sie uns gerne, wenn Sie Fragen haben oder zum ersten
                Mal eine Gemeinde besuchen möchten.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center rounded-md bg-[#071d35] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
              >
                Kontakt aufnehmen
              </Link>

              <Link
                href={siteConfig.freeBooks.href}
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 font-semibold text-[#071d35] hover:bg-white/90"
              >
                Kostenlose Bücher
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}