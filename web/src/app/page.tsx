import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Church,
  HeartHandshake,
  MapPin,
  MessageCircleHeart,
  Smartphone,
  Users,
} from "lucide-react";

import { FreeBooksSection } from "@/components/FreeBooksSection";
import { siteConfig } from "@/config/site";
import { churches } from "@/data/churches";
import { publicEvents } from "@/data/events";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#071d35] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(73,107,63,0.35),_transparent_35%)]" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a] backdrop-blur">
              Offizielle Website · sdarm.ch
            </p>

            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              {siteConfig.name}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
              Eine Glaubensgemeinschaft in der Schweiz, verbunden durch Gottes
              Wort, den Sabbat, Gebet, Gemeinschaft und Mission.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/gemeinden"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] shadow-sm transition hover:bg-[#c99631]"
              >
                Gemeinde finden
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/veranstaltungen"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-[#071d35] shadow-sm transition hover:bg-white/90"
              >
                Veranstaltungen ansehen
              </Link>

              <Link
                href={siteConfig.freeBooks.href}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Kostenlose Bücher
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-8">
              <div>
                <p className="text-3xl font-bold text-[#f0d28a]">3</p>
                <p className="mt-1 text-sm text-white/65">Gemeinden</p>
              </div>

              <div>
                <p className="text-3xl font-bold text-[#f0d28a]">DE/FR</p>
                <p className="mt-1 text-sm text-white/65">Sprachen</p>
              </div>

              <div>
                <p className="text-3xl font-bold text-[#f0d28a]">CH</p>
                <p className="mt-1 text-sm text-white/65">Schweiz</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
              <div className="rounded-[1.5rem] bg-[#f8f6f1] p-6 text-[#0b2341]">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#496b3f]">
                      Church Connect
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      Nächster Sabbat
                    </h2>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b2341] text-white">
                    <Church size={24} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <CalendarDays className="mt-1 text-[#d6a63f]" />

                      <div>
                        <h3 className="font-bold">Sabbatgottesdienst</h3>
                        <p className="mt-1 text-sm text-[#475569]">
                          Bibelstudium, Gebet, Gemeinschaft und Predigt.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <MessageCircleHeart className="mt-1 text-[#496b3f]" />

                      <div>
                        <h3 className="font-bold">Gebetsfokus</h3>
                        <p className="mt-1 text-sm text-[#475569]">
                          Wir beten für Familien, Jugendliche und Mission in der
                          Schweiz.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#0b2341] p-5 text-white shadow-sm">
                    <p className="text-sm text-white/70">
                      „Dieses Volk habe ich mir bereitet; es soll meinen Ruhm
                      verkündigen.“
                    </p>

                    <p className="mt-3 font-semibold text-[#f0d28a]">
                      Jesaja 43,21
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl bg-[#d6a63f] p-5 text-[#071d35] shadow-xl md:block">
              <p className="text-sm font-semibold">Verbunden in Christus</p>
              <p className="mt-1 text-2xl font-bold">
                Bibel · Sabbat · Mission
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Churches */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Gemeinden
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Unsere Gemeinden in der Schweiz
            </h2>

            <p className="mt-4 max-w-2xl text-[#475569]">
              Besuchen Sie eine unserer Gemeinden. Jeder Besucher ist herzlich
              willkommen.
            </p>
          </div>

          <Link
            href="/gemeinden"
            className="inline-flex items-center gap-2 font-semibold text-[#0b2341] hover:underline"
          >
            Alle Gemeinden ansehen
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {churches.map((church) => (
            <article
              key={church.slug}
              className="group overflow-hidden rounded-3xl border border-[#e5dfd0] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="h-36 bg-[linear-gradient(135deg,#0b2341,#496b3f)] p-5 text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                  <MapPin size={24} />
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold">{church.name}</h3>

                <p className="mt-3 text-[#475569]">
                  {church.address}
                  <br />
                  {church.postalCode} {church.city}
                </p>

                <p className="mt-3 rounded-lg bg-[#f8f6f1] p-3 text-sm text-[#64748b]">
                  {church.note}
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
                  Mehr erfahren
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Events */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Veranstaltungen
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Öffentlich sichtbare Termine
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-[#475569]">
              Veranstaltungen können später direkt aus Church Connect
              veröffentlicht werden.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {publicEvents.map((event) => (
              <article
                key={event.title}
                className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6"
              >
                <span className="rounded-full bg-[#0b2341] px-3 py-1 text-xs font-semibold text-white">
                  {event.type}
                </span>

                <h3 className="mt-5 text-xl font-bold">{event.title}</h3>

                <div className="mt-4 space-y-2 text-sm text-[#475569]">
                  <p className="flex gap-2">
                    <CalendarDays size={16} className="text-[#d6a63f]" />
                    {event.date} · {event.time}
                  </p>

                  <p className="flex gap-2">
                    <MapPin size={16} className="text-[#496b3f]" />
                    {event.location}
                  </p>
                </div>

                <p className="mt-4 text-[#475569]">{event.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/veranstaltungen"
              className="inline-flex items-center gap-2 rounded-md bg-[#0b2341] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
            >
              Alle Veranstaltungen
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Prayer */}
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="rounded-3xl bg-[#496b3f] p-8 text-white">
          <HeartHandshake size={42} className="text-[#f0d28a]" />

          <h2 className="mt-6 text-3xl font-bold">Gebet verbindet</h2>

          <p className="mt-4 leading-7 text-white/80">
            Gebetsanliegen bleiben standardmässig privat. Öffentlich sichtbar
            werden nur allgemeine oder ausdrücklich freigegebene Anliegen.
          </p>

          <Link
            href="/gebet"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 font-semibold text-[#496b3f]"
          >
            Mehr über Gebet
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-3xl border border-[#e5dfd0] bg-white p-6">
            <Users className="text-[#d6a63f]" />
            <h3 className="mt-4 text-xl font-bold">Familien</h3>
            <p className="mt-3 text-[#475569]">
              Wir beten für starke Familien, Kinder, Jugendliche und geistliches
              Wachstum.
            </p>
          </div>

          <div className="rounded-3xl border border-[#e5dfd0] bg-white p-6">
            <Church className="text-[#d6a63f]" />
            <h3 className="mt-4 text-xl font-bold">Gemeinden</h3>
            <p className="mt-3 text-[#475569]">
              Wir beten für unsere Gemeinden in Zürich, Genève und Bern.
            </p>
          </div>

          <div className="rounded-3xl border border-[#e5dfd0] bg-white p-6">
            <BookOpenText className="text-[#d6a63f]" />
            <h3 className="mt-4 text-xl font-bold">Bibelstudien</h3>
            <p className="mt-3 text-[#475569]">
              Wir beten für Menschen, die Gottes Wort kennenlernen möchten.
            </p>
          </div>

          <div className="rounded-3xl border border-[#e5dfd0] bg-white p-6">
            <MessageCircleHeart className="text-[#d6a63f]" />
            <h3 className="mt-4 text-xl font-bold">Mission</h3>
            <p className="mt-3 text-[#475569]">
              Wir beten für die Verkündigung des Evangeliums in der Schweiz.
            </p>
          </div>
        </div>
      </section>

      {/* Beliefs */}
      <section className="bg-[#0b2341] py-20 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Grundlage
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Bibel, Sabbat und Mission
            </h2>

            <p className="mt-4 text-white/75">
              Unser Glaube gründet sich auf die Heilige Schrift und auf Jesus
              Christus als unseren Erlöser.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <BookOpenText className="text-[#d6a63f]" />
              <h3 className="mt-5 text-xl font-bold">Gottes Wort</h3>
              <p className="mt-3 text-white/75">
                Die Bibel ist die Grundlage unseres Glaubens, unserer Lehre und
                unseres Lebens.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <CalendarDays className="text-[#d6a63f]" />
              <h3 className="mt-5 text-xl font-bold">Der Sabbat</h3>
              <p className="mt-3 text-white/75">
                Der siebente Tag ist ein besonderer Tag der Ruhe, Anbetung und
                Gemeinschaft mit Gott.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <HeartHandshake className="text-[#d6a63f]" />
              <h3 className="mt-5 text-xl font-bold">
                Dienst am Menschen
              </h3>
              <p className="mt-3 text-white/75">
                Wir möchten Menschen praktisch helfen und sie mit Christus
                verbinden.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FreeBooksSection />

      {/* App CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-[#d6a63f]">
          <div className="grid items-center gap-8 p-8 md:grid-cols-[1fr_0.8fr] lg:p-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#0b2341]/70">
                Church Connect
              </p>

              <h2 className="mt-3 text-3xl font-bold text-[#071d35] md:text-4xl">
                Eine Plattform für Website und App
              </h2>

              <p className="mt-4 max-w-2xl text-[#071d35]/75">
                Öffentliche Veranstaltungen und freigegebene Informationen
                können später direkt aus Church Connect auf sdarm.ch angezeigt
                werden.
              </p>

              <Link
                href="/app"
                className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#071d35] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
              >
                <Smartphone size={18} />
                Church Connect App
              </Link>
            </div>

            <div className="rounded-[1.5rem] bg-[#071d35] p-6 text-white shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <p className="font-bold">Öffentlich sichtbar</p>

                <span className="rounded-full bg-[#496b3f] px-3 py-1 text-xs font-bold">
                  Sicher
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <p className="rounded-xl bg-white/10 p-3">
                  Veranstaltungen: nur wenn freigegeben
                </p>

                <p className="rounded-xl bg-white/10 p-3">
                  Gebetsanliegen: privat standardmässig
                </p>

                <p className="rounded-xl bg-white/10 p-3">
                  Mitglieder: nicht öffentlich sichtbar
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}