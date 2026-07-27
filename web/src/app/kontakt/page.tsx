import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Church,
  HeartHandshake,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
} from "lucide-react";

import { WebsiteRequestForm } from "@/components/WebsiteRequestForm";
import { churches } from "@/data/churches";
import { siteConfig } from "@/config/site";
import { getPrayerSubmissionChurches } from "@/lib/website-churches";

const contactOptions = [
  {
    title: "Ich möchte eine Gemeinde besuchen",
    description:
      "Finden Sie eine Gemeinde in Ihrer Nähe und nehmen Sie Kontakt auf.",
    href: "/gemeinden",
    icon: Church,
  },
  {
    title: "Ich möchte ein Bibelstudium",
    description:
      "Gerne helfen wir Ihnen, die Bibel besser kennenzulernen.",
    href: "/kontakt#formular",
    icon: BookOpenText,
  },
  {
    title: "Ich habe ein Gebetsanliegen",
    description:
      "Teilen Sie uns vertraulich mit, wofür wir beten dürfen.",
    href: "/gebet#gebetsanliegen",
    icon: HeartHandshake,
  },
  {
    title: "Ich möchte kostenlose Bücher",
    description:
      "Bestellen Sie kostenlos christliche Bücher und Studienmaterial.",
    href: siteConfig.freeBooks.href,
    icon: BookOpenText,
  },
];

export default async function KontaktPage() {
  const submissionChurches = await getPrayerSubmissionChurches();

  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(73,107,63,0.35),_transparent_35%)]" />

        <div className="relative mx-auto max-w-6xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Kontakt
          </p>

          <h1 className="max-w-4xl text-[clamp(2rem,7vw,5rem)] font-extrabold leading-[1.03] tracking-[-0.04em]">
            Wir freuen uns, von Ihnen zu hören
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Haben Sie Fragen, möchten Sie eine Gemeinde besuchen, ein
            Bibelstudium beginnen oder ein Gebetsanliegen teilen? Nehmen Sie
            gerne Kontakt mit uns auf.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <a
              href="#formular"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-[#c99631]"
            >
              Kontaktformular öffnen
              <ArrowRight size={18} />
            </a>

            <Link
              href="/gemeinden"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-white/90"
            >
              Gemeinde finden
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
            Wie können wir helfen?
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Wählen Sie Ihr Anliegen
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#475569]">
            Besucher sollen schnell den richtigen nächsten Schritt finden.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {contactOptions.map((option) => {
            const Icon = option.icon;

            return (
              <Link
                key={option.title}
                href={option.href}
                className="rounded-3xl border border-[#e5dfd0] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ea] text-[#496b3f]">
                  <Icon size={28} />
                </div>

                <h3 className="mt-5 text-lg font-bold">{option.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#475569]">
                  {option.description}
                </p>

                <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b2341]">
                  Weiter
                  <ArrowRight size={16} />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        id="formular"
        className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8"
      >
        <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d6a63f] text-[#071d35]">
              <Send size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-bold">Kontaktformular</h2>
              <p className="text-[#475569]">
                Schreiben Sie uns Ihr Anliegen.
              </p>
            </div>
          </div>

          <WebsiteRequestForm
            variant="contact"
            churches={submissionChurches}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-[#0b2341] p-7 text-white">
            <MessageCircle className="text-[#d6a63f]" size={38} />
            <h3 className="mt-5 text-2xl font-bold">Direkter Kontakt</h3>
            <p className="mt-4 leading-7 text-white/75">
              Für allgemeine Fragen können Sie uns über die offizielle
              Kontaktadresse erreichen.
            </p>

            <a
              href={`mailto:${siteConfig.email}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#071d35]"
            >
              <Mail size={18} />
              {siteConfig.email}
            </a>
          </div>

          <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7">
            <ShieldCheck className="text-[#496b3f]" size={38} />
            <h3 className="mt-5 text-2xl font-bold">
              Datenschutz und Vertrauen
            </h3>
            <p className="mt-4 leading-7 text-[#475569]">
              Persönliche Angaben werden vertraulich behandelt und nur zur
              Bearbeitung der Anfrage verwendet. Öffentliche Veröffentlichung
              erfolgt nicht automatisch.
            </p>
          </div>

          <div className="rounded-3xl bg-[#496b3f] p-7 text-white">
            <BookOpenText className="text-[#f0d28a]" size={38} />
            <h3 className="mt-5 text-2xl font-bold">
              Kostenloses Studienmaterial
            </h3>
            <p className="mt-4 leading-7 text-white/80">
              Gerne senden wir kostenlos christliche Bücher oder Bibelmaterial
              zu.
            </p>

            <Link
              href={siteConfig.freeBooks.href}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#496b3f]"
            >
              Bücher bestellen
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
              Standorte
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Unsere Gemeinden
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {churches.map((church) => (
              <article
                key={church.slug}
                className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b2341] text-white">
                  <MapPin size={24} />
                </div>

                <h3 className="mt-5 text-xl font-bold">{church.name}</h3>

                <p className="mt-3 text-[#475569]">
                  {church.address}
                  <br />
                  {church.postalCode} {church.city}
                  <br />
                  {church.country}
                </p>

                <p className="mt-3 rounded-lg bg-white p-3 text-sm text-[#64748b]">
                  {church.note}
                </p>

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
    </main>
  );
}