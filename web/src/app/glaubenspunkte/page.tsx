import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Church,
  Cross,
  Globe2,
  HeartHandshake,
  HelpCircle,
  Home,
  Leaf,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { beliefs, beliefHighlights } from "@/data/beliefs";
import { siteConfig } from "@/config/site";

const icons = [
  BookOpenText,
  Cross,
  HeartHandshake,
  HeartHandshake,
  CalendarDays,
  Sparkles,
  Church,
  Leaf,
  Home,
  ShieldCheck,
  Globe2,
  Sparkles,
];

export default function GlaubenspunktePage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(73,107,63,0.35),_transparent_35%)]" />

        <div className="relative mx-auto max-w-6xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Glaubenspunkte
          </p>

          <h1 className="max-w-4xl text-[clamp(2.35rem,7vw,5rem)] font-extrabold leading-[1.03] tracking-[-0.04em]">
            Was wir glauben
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Unser Glaube gründet sich auf die Heilige Schrift, auf Jesus
            Christus und auf die Hoffnung seiner baldigen Wiederkunft.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Link
              href="/kontakt"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-[#c99631]"
            >
              Fragen stellen
              <ArrowRight size={18} />
            </Link>

            <Link
              href={siteConfig.freeBooks.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-white/90"
            >
              Kostenlose Bücher bestellen
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
            Grundlage unseres Glaubens
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Biblische Glaubenspunkte
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-[#475569]">
            Diese Übersicht ist eine kurze, leicht verständliche Einführung für
            Besucher. Eine ausführlichere Version mit weiteren Bibelstellen kann
            später ergänzt werden.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {beliefs.map((belief, index) => {
            const Icon = icons[index] ?? BookOpenText;

            return (
              <article
                key={belief.title}
                className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ea] text-[#496b3f]">
                  <Icon size={28} />
                </div>

                <h3 className="mt-5 text-xl font-bold">{belief.title}</h3>

                <p className="mt-2 text-sm font-semibold text-[#d6a63f]">
                  {belief.verse}
                </p>

                <p className="mt-4 leading-7 text-[#475569]">
                  {belief.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Praktischer Glaube
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Was uns wichtig ist
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {beliefHighlights.map((item, index) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1]"
              >
                <div className="h-32 bg-[linear-gradient(135deg,#0b2341,#496b3f)] p-6 text-white">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                    {index === 0 && <BookOpenText size={26} />}
                    {index === 1 && <ShieldCheck size={26} />}
                    {index === 2 && <HeartHandshake size={26} />}
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

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl bg-[#496b3f] p-8 text-white">
            <BookOpenText className="text-[#f0d28a]" size={42} />
            <h2 className="mt-6 text-3xl font-bold">
              Bibelstudium anfragen
            </h2>
            <p className="mt-4 leading-7 text-white/80">
              Möchten Sie die Bibel besser kennenlernen? Gerne vermitteln wir
              ein persönliches Bibelstudium oder senden Ihnen kostenloses
              Studienmaterial.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#496b3f]"
              >
                Kontakt aufnehmen
                <ArrowRight size={18} />
              </Link>

              <Link
                href={siteConfig.freeBooks.href}
                className="inline-flex items-center justify-center rounded-xl bg-[#d6a63f] px-5 py-3 font-semibold text-[#071d35]"
              >
                Kostenlose Bücher
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-[#e5dfd0] bg-white p-8">
            <HelpCircle className="text-[#d6a63f]" size={42} />
            <h2 className="mt-6 text-3xl font-bold">Häufige Fragen</h2>

            <div className="mt-6 space-y-4">
              <details className="rounded-2xl border border-[#e5dfd0] bg-[#f8f6f1] p-5">
                <summary className="cursor-pointer font-bold">
                  Muss ich alles glauben, bevor ich eine Gemeinde besuche?
                </summary>
                <p className="mt-3 leading-7 text-[#475569]">
                  Nein. Jeder Besucher ist willkommen. Sie dürfen kommen,
                  zuhören, Fragen stellen und die Gemeinde kennenlernen.
                </p>
              </details>

              <details className="rounded-2xl border border-[#e5dfd0] bg-[#f8f6f1] p-5">
                <summary className="cursor-pointer font-bold">
                  Kann ich ein persönliches Bibelstudium erhalten?
                </summary>
                <p className="mt-3 leading-7 text-[#475569]">
                  Ja. Über das Kontaktformular können Sie ein Bibelstudium oder
                  weiteres Material anfragen.
                </p>
              </details>

              <details className="rounded-2xl border border-[#e5dfd0] bg-[#f8f6f1] p-5">
                <summary className="cursor-pointer font-bold">
                  Wo finde ich die ausführlichen Glaubensgrundsätze?
                </summary>
                <p className="mt-3 leading-7 text-[#475569]">
                  Diese Seite ist zunächst eine kurze Besucherübersicht. Eine
                  ausführlichere Fassung mit weiteren Bibelstellen kann später
                  ergänzt werden.
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
        <div className="rounded-[2rem] bg-[#0b2341] p-8 text-white md:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.7fr] md:items-center">
            <div>
              <Users className="text-[#d6a63f]" size={40} />
              <h2 className="mt-5 text-3xl font-bold">
                Lernen Sie uns persönlich kennen
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-white/75">
                Der beste Weg, unseren Glauben kennenzulernen, ist ein Besuch
                in einer Gemeinde, ein persönliches Gespräch oder ein
                gemeinsames Bibelstudium.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap md:justify-end">
              <Link
                href="/gemeinden"
                className="inline-flex items-center justify-center rounded-xl bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] hover:bg-[#c99631]"
              >
                Gemeinde finden
              </Link>

              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-[#071d35] hover:bg-white/90"
              >
                Kontakt aufnehmen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}