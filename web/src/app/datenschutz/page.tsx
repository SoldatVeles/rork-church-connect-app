import Link from "next/link";
import {
  ArrowRight,
  Cookie,
  Database,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import { siteConfig } from "@/config/site";

const privacyItems = [
  {
    title: "Kontaktanfragen",
    description:
      "Wenn Sie uns kontaktieren, verwenden wir Ihre Angaben zur Bearbeitung Ihrer Anfrage.",
    icon: Mail,
  },
  {
    title: "Gebetsanliegen",
    description:
      "Gebetsanliegen werden vertraulich behandelt und nicht automatisch öffentlich veröffentlicht.",
    icon: Lock,
  },
  {
    title: "Kostenlose Bücher",
    description:
      "Bestellangaben werden verwendet, um das gewünschte Material zuzustellen oder Rückfragen zu klären.",
    icon: UserCheck,
  },
  {
    title: "Technische Daten",
    description:
      "Beim Besuch einer Website können technische Daten wie IP-Adresse, Browser oder Zeitpunkt des Zugriffs verarbeitet werden.",
    icon: Database,
  },
];

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="bg-[#071d35] px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Datenschutz
          </p>

          <h1 className="max-w-4xl text-4xl font-bold md:text-6xl">
            Datenschutzerklärung
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Wir behandeln persönliche Angaben vertraulich und verwenden sie nur
            für die vorgesehenen Zwecke.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-10 rounded-3xl bg-[#d6a63f] p-7 text-[#071d35]">
          <ShieldCheck size={38} />
          <h2 className="mt-5 text-2xl font-bold">
            Entwurf für die erste Website-Version
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-[#071d35]/75">
            Diese Datenschutzerklärung ist vorbereitet und muss vor dem
            öffentlichen Launch mit den finalen Angaben ergänzt werden:
            verantwortliche Stelle, Hosting, Formulare, Supabase, E-Mail,
            Cookies, Analytics und allfällige Drittanbieter.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {privacyItems.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-sm"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ea] text-[#496b3f]">
                  <Icon size={28} />
                </div>

                <h2 className="mt-5 text-xl font-bold">{item.title}</h2>
                <p className="mt-3 leading-7 text-[#475569]">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-8">
            <h2 className="text-2xl font-bold">Verantwortliche Stelle</h2>
            <p className="mt-4 leading-7 text-[#475569]">
              Verantwortlich für die Datenbearbeitung auf dieser Website ist:
            </p>

            <div className="mt-5 rounded-2xl bg-white p-5 text-[#475569]">
              <p className="font-semibold text-[#0b2341]">{siteConfig.name}</p>
              <p>[Offizielle Adresse ergänzen]</p>
              <p>[PLZ Ort], Schweiz</p>
              <a
                href={`mailto:${siteConfig.email}`}
                className="font-semibold text-[#0b2341] underline"
              >
                {siteConfig.email}
              </a>
            </div>
          </div>

          <div className="rounded-3xl bg-[#0b2341] p-8 text-white">
            <Lock className="text-[#d6a63f]" size={38} />
            <h2 className="mt-5 text-2xl font-bold">Private by default</h2>
            <p className="mt-4 leading-7 text-white/75">
              Für Church Connect und die Website gilt: persönliche Inhalte wie
              Gebetsanliegen oder Mitgliederdaten sind nicht öffentlich, ausser
              sie werden bewusst und ausdrücklich freigegeben.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl bg-[#496b3f] p-8 text-white">
            <Cookie className="text-[#f0d28a]" size={38} />
            <h2 className="mt-5 text-2xl font-bold">Cookies und Dienste</h2>
            <p className="mt-4 leading-7 text-white/80">
              In der ersten Version sollten wir möglichst ohne Tracking starten.
              Falls später Analytics, Karten, YouTube-Einbettungen oder andere
              Drittanbieter verwendet werden, muss diese Erklärung erweitert
              werden.
            </p>
          </div>

          <div className="rounded-3xl border border-[#e5dfd0] bg-white p-8">
            <h2 className="text-2xl font-bold">Ihre Rechte</h2>
            <p className="mt-4 leading-7 text-[#475569]">
              Betroffene Personen können Auskunft über ihre Daten verlangen und
              je nach Situation Berichtigung, Löschung oder Einschränkung der
              Bearbeitung verlangen. Anfragen können an die Kontaktadresse
              gesendet werden.
            </p>

            <a
              href={`mailto:${siteConfig.email}`}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#0b2341] px-5 py-3 font-semibold text-white"
            >
              Datenschutz-Anfrage senden
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
        <div className="rounded-[2rem] bg-[#d6a63f] p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#071d35]">
                Fragen zum Datenschutz?
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-[#071d35]/75">
                Kontaktieren Sie uns, wenn Sie Fragen zur Bearbeitung Ihrer
                Daten haben.
              </p>
            </div>

            <div className="flex md:justify-end">
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center rounded-md bg-[#071d35] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
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