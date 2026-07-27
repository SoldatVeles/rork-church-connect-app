import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Download,
  FileText,
  Gift,
  Globe2,
  HeartHandshake,
  Search,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";

import { resources, resourceTopics } from "@/data/resources";
import { siteConfig } from "@/config/site";

const icons = [
  Gift,
  BookOpenText,
  FileText,
  BookOpenText,
  Video,
  Users,
];

export default function RessourcenPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(73,107,63,0.35),_transparent_35%)]" />

        <div className="relative mx-auto max-w-6xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Ressourcen
          </p>

          <h1 className="max-w-4xl text-[clamp(2rem,7vw,5rem)] font-extrabold leading-[1.03] tracking-[-0.04em]">
            Christliche Ressourcen für Bibelstudium und Glauben
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Hier finden Besucher Bibelmaterial, Informationen zum Glauben,
            kostenlose Bücher und später auch Predigten, Downloads und
            Studienmaterial.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Link
              href={siteConfig.freeBooks.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-[#c99631]"
            >
              Kostenlose Bücher bestellen
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/kontakt"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-white/90"
            >
              Bibelstudium anfragen
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
            Übersicht
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Verfügbare Ressourcen
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#475569]">
            Diese Seite ist vorbereitet, damit später PDFs, Videos, Links und
            Downloads zentral verwaltet werden können.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource, index) => {
            const Icon = icons[index] ?? BookOpenText;

            return (
              <article
                key={resource.title}
                className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ea] text-[#496b3f]">
                    <Icon size={28} />
                  </div>

                  <span className="rounded-full bg-[#f8f6f1] px-3 py-1 text-xs font-semibold text-[#64748b]">
                    {resource.type}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-bold">{resource.title}</h3>

                <p className="mt-3 leading-7 text-[#475569]">
                  {resource.description}
                </p>

                <Link
                  href={resource.href}
                  className="mt-6 inline-flex items-center gap-2 font-semibold text-[#0b2341] hover:underline"
                >
                  {resource.buttonLabel}
                  <ArrowRight size={16} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Themen
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Themen für Bibelstudium und Glauben
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-[#475569]">
              Besucher sollen schnell das Thema finden, das sie interessiert.
              Später können diese Themen mit echten Artikeln, PDF-Dateien oder
              Videos verbunden werden.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {resourceTopics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-2 text-sm font-semibold text-[#0b2341]"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-[#0b2341] p-8 text-white">
            <Search className="text-[#d6a63f]" size={42} />

            <h3 className="mt-6 text-2xl font-bold">
              Später: Ressourcen durchsuchen
            </h3>

            <p className="mt-4 leading-7 text-white/75">
              In einer späteren Version können Besucher nach Sprache, Thema,
              Dateityp oder Gemeinde filtern.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4">
                <Download className="text-[#f0d28a]" />
                <p className="mt-3 font-semibold">PDF-Downloads</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <Video className="text-[#f0d28a]" />
                <p className="mt-3 font-semibold">Videos & Predigten</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <Globe2 className="text-[#f0d28a]" />
                <p className="mt-3 font-semibold">Mehrere Sprachen</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <FileText className="text-[#f0d28a]" />
                <p className="mt-3 font-semibold">Bibelstudien</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl bg-[#496b3f] p-8 text-white">
            <Gift className="text-[#f0d28a]" size={42} />

            <h2 className="mt-6 text-3xl font-bold">
              Kostenlose Bücher bestellen
            </h2>

            <p className="mt-4 leading-7 text-white/80">
              Eine der wichtigsten Funktionen der Website ist, dass Besucher
              kostenlos christliche Literatur bestellen können. Dies soll
              Menschen ermutigen, die Bibel persönlich zu studieren.
            </p>

            <Link
              href={siteConfig.freeBooks.href}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#496b3f]"
            >
              Zur Buchbestellung
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7">
              <ShieldCheck className="text-[#d6a63f]" size={38} />
              <h3 className="mt-5 text-2xl font-bold">
                Inhalt verantwortungsvoll veröffentlichen
              </h3>
              <p className="mt-4 leading-7 text-[#475569]">
                Ressourcen sollten später von verantwortlichen Personen geprüft
                und freigegeben werden, bevor sie öffentlich erscheinen.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7">
              <HeartHandshake className="text-[#496b3f]" size={38} />
              <h3 className="mt-5 text-2xl font-bold">
                Menschen zum nächsten Schritt führen
              </h3>
              <p className="mt-4 leading-7 text-[#475569]">
                Jede Ressource sollte Besucher einladen: zum Bibelstudium, zur
                Gemeinde, zum Gebet oder zum persönlichen Gespräch.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
        <div className="rounded-[2rem] bg-[#d6a63f] p-6 sm:p-8 md:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] md:items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#071d35]">
                Möchten Sie mehr erfahren?
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-[#071d35]/75">
                Wir senden gerne kostenloses Material zu oder vermitteln ein
                persönliches Bibelstudium.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap md:justify-end">
              <Link
                href={siteConfig.freeBooks.href}
                className="inline-flex items-center justify-center rounded-xl bg-[#071d35] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
              >
                Bücher bestellen
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