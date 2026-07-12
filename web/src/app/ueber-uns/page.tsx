import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Church,
  Globe2,
  HeartHandshake,
  Home,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { churches } from "@/data/churches";
import { siteConfig } from "@/config/site";

const values = [
  {
    title: "Bibel",
    description:
      "Die Heilige Schrift ist die Grundlage unseres Glaubens, unserer Lehre und unseres Lebens.",
    icon: BookOpenText,
  },
  {
    title: "Sabbat",
    description:
      "Der siebente Tag ist ein besonderer Tag der Ruhe, Anbetung und Gemeinschaft mit Gott.",
    icon: CalendarDays,
  },
  {
    title: "Gebet",
    description:
      "Im Gebet suchen wir Gottes Führung, Trost, Vergebung und Kraft für den Alltag.",
    icon: HeartHandshake,
  },
  {
    title: "Mission",
    description:
      "Wir möchten Menschen mit Jesus Christus verbinden und Gottes Wort weitergeben.",
    icon: Globe2,
  },
];

const missionItems = [
  {
    title: "Glauben stärken",
    description:
      "Wir möchten Familien, Kinder, Jugendliche und Erwachsene im Glauben begleiten.",
  },
  {
    title: "Menschen einladen",
    description:
      "Jeder Besucher ist willkommen, eine Gemeinde zu besuchen und Fragen zu stellen.",
  },
  {
    title: "Christliche Literatur teilen",
    description:
      "Durch kostenlose Bücher und Bibelmaterial möchten wir Menschen zum Studium der Bibel einladen.",
  },
];

export default function UeberUnsPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-6 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(73,107,63,0.35),_transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Über uns
          </p>

          <h1 className="max-w-4xl text-4xl font-bold md:text-6xl">
            Eine Glaubensgemeinschaft in der Schweiz
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            {siteConfig.name} ist eine christliche Gemeinschaft, die sich auf
            die Bibel gründet, den Sabbat hält und Menschen zu Jesus Christus
            einladen möchte.
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
              href="/glaubenspunkte"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-white/90"
            >
              Was wir glauben
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <Church className="text-[#d6a63f]" size={42} />

          <h2 className="mt-6 text-3xl font-bold">Wer wir sind</h2>

          <div className="mt-5 space-y-4 leading-7 text-[#475569]">
            <p>
              Wir sind eine christliche Glaubensgemeinschaft, die Jesus Christus
              als Erlöser bekennt und die Bibel als Gottes Wort annimmt.
            </p>

            <p>
              In der Schweiz treffen wir uns in verschiedenen Gemeinden zur
              Anbetung, zum Bibelstudium, zum Gebet und zur Gemeinschaft.
            </p>

            <p>
              Unser Wunsch ist es, Menschen in Liebe zu begegnen, sie zum Wort
              Gottes einzuladen und gemeinsam im Glauben zu wachsen.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {values.map((value) => {
            const Icon = value.icon;

            return (
              <article
                key={value.title}
                className="rounded-3xl border border-[#e5dfd0] bg-white p-6 shadow-sm"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ea] text-[#496b3f]">
                  <Icon size={28} />
                </div>

                <h3 className="mt-5 text-xl font-bold">{value.title}</h3>
                <p className="mt-3 leading-7 text-[#475569]">
                  {value.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Unser Auftrag
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Christus dienen und Menschen einladen
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-[#475569]">
              Unsere Gemeinde möchte nicht nur Informationen anbieten, sondern
              Menschen praktisch helfen, Gottes Wort kennenzulernen.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {missionItems.map((item, index) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1]"
              >
                <div className="h-32 bg-[linear-gradient(135deg,#0b2341,#496b3f)] p-6 text-white">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                    {index === 0 && <Sparkles size={26} />}
                    {index === 1 && <Users size={26} />}
                    {index === 2 && <BookOpenText size={26} />}
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="mt-3 leading-7 text-[#475569]">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Schweiz
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Unsere Gemeinden
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-[#475569]">
              Zurzeit sind unsere Gemeinden in Zürich, Genève und Bern
              vertreten. Besucher sind herzlich willkommen.
            </p>

            <div className="mt-8 grid gap-5 md:grid-cols-3 lg:grid-cols-1">
              {churches.map((church) => (
                <article
                  key={church.slug}
                  className="rounded-3xl border border-[#e5dfd0] bg-white p-6 shadow-sm"
                >
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0b2341] text-white">
                      <MapPin size={24} />
                    </div>

                    <div>
                      <h3 className="font-bold">{church.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#475569]">
                        {church.address}
                        <br />
                        {church.postalCode} {church.city}
                      </p>
                      <p className="mt-2 text-sm text-[#64748b]">
                        {church.note}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-[#496b3f] p-8 text-white">
              <Leaf className="text-[#f0d28a]" size={42} />
              <h3 className="mt-6 text-2xl font-bold">
                Einfach, biblisch, persönlich
              </h3>
              <p className="mt-4 leading-7 text-white/80">
                Der Besuch einer Gemeinde soll einfach sein: Sie dürfen kommen,
                zuhören, Fragen stellen und die Gemeinschaft kennenlernen.
              </p>

              <Link
                href="/gemeinden"
                className="mt-7 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 font-semibold text-[#496b3f]"
              >
                Standorte ansehen
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="rounded-3xl border border-[#e5dfd0] bg-white p-8">
              <Home className="text-[#d6a63f]" size={42} />
              <h3 className="mt-6 text-2xl font-bold">
                Eine geistliche Heimat
              </h3>
              <p className="mt-4 leading-7 text-[#475569]">
                Gemeinde bedeutet mehr als ein Ort. Es ist Gemeinschaft,
                gegenseitige Unterstützung, Bibelstudium, Gebet und Dienst.
              </p>
            </div>

            <div className="rounded-3xl bg-[#0b2341] p-8 text-white">
              <ShieldCheck className="text-[#d6a63f]" size={42} />
              <h3 className="mt-6 text-2xl font-bold">
                Verantwortlich veröffentlichen
              </h3>
              <p className="mt-4 leading-7 text-white/75">
                Informationen auf dieser Website werden öffentlich sichtbar
                gemacht, während persönliche Daten und interne Anliegen geschützt
                bleiben.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#071d35] py-16 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
                Church Connect
              </p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                Website und App gehören zusammen
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-white/75">
                Die öffentliche Website soll später mit Church Connect und
                Supabase verbunden werden. So können öffentliche Termine,
                Gemeindeseiten und freigegebene Informationen zentral verwaltet
                werden.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-6">
              <p className="font-bold text-[#f0d28a]">
                Öffentlich sichtbar
              </p>

              <ul className="mt-4 space-y-3 text-sm text-white/80">
                <li>Gemeindeinformationen</li>
                <li>Öffentliche Veranstaltungen</li>
                <li>Allgemeine Gebetsschwerpunkte</li>
                <li>Kostenlose Bücher und Kontaktmöglichkeiten</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="rounded-[2rem] bg-[#d6a63f] p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#071d35]">
                Lernen Sie uns kennen
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-[#071d35]/75">
                Besuchen Sie eine Gemeinde, stellen Sie Fragen oder bestellen
                Sie kostenloses Bibelmaterial.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <Link
                href="/gemeinden"
                className="inline-flex items-center justify-center rounded-md bg-[#071d35] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
              >
                Gemeinde finden
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