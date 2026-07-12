import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Church,
  Globe2,
  Lock,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";

const appFeatures = [
  {
    title: "Gemeinden verbinden",
    description:
      "Mitglieder, Pastoren und Gemeindeleiter können innerhalb ihrer Gemeinde besser informiert bleiben.",
    icon: Church,
  },
  {
    title: "Veranstaltungen verwalten",
    description:
      "Öffentliche und interne Veranstaltungen können zentral geplant und später auf der Website angezeigt werden.",
    icon: CalendarDays,
  },
  {
    title: "Gebetsanliegen sicher teilen",
    description:
      "Gebetsanliegen bleiben privat und werden nur entsprechend der gewählten Sichtbarkeit geteilt.",
    icon: Lock,
  },
  {
    title: "Schweizweite Übersicht",
    description:
      "Die Gemeinden in der Schweiz können gemeinsame Informationen und öffentliche Termine sichtbar machen.",
    icon: Globe2,
  },
];

export default function AppPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-6 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(73,107,63,0.35),_transparent_35%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
              Church Connect App
            </p>

            <h1 className="max-w-4xl text-4xl font-bold md:text-6xl">
              Die interne Plattform für unsere Gemeinden
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
              Church Connect soll die Gemeinden unterstützen: mit
              Veranstaltungen, Gebetsanliegen, Sabbatplanung, Mitgliedern und
              sicherer Kommunikation.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-[#c99631]"
              >
                Zugang anfragen
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/ueber-uns"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-white/90"
              >
                Mehr über uns
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <div className="rounded-[1.5rem] bg-[#f8f6f1] p-6 text-[#0b2341]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#496b3f]">
                    Vorschau
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">Church Connect</h2>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b2341] text-white">
                  <Smartphone size={24} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-[#d6a63f]">
                    Nächster Sabbat
                  </p>
                  <h3 className="mt-2 font-bold">Sabbatgottesdienst</h3>
                  <p className="mt-1 text-sm text-[#475569]">
                    Planung, Rollen, Teilnahme und Informationen.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-[#496b3f]">
                    Gebetsanliegen
                  </p>
                  <h3 className="mt-2 font-bold">Privat und geschützt</h3>
                  <p className="mt-1 text-sm text-[#475569]">
                    Sichtbarkeit wird bewusst gewählt.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#0b2341] p-5 text-white shadow-sm">
                  <p className="text-sm text-white/70">
                    Öffentliche Inhalte können später auf sdarm.ch erscheinen.
                  </p>
                  <p className="mt-3 font-semibold text-[#f0d28a]">
                    App + Website verbunden
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
            Funktionen
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Wofür Church Connect gedacht ist
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#475569]">
            Die App ist der interne Bereich. Die Website zeigt nur Informationen,
            die bewusst öffentlich freigegeben wurden.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {appFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-sm"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ea] text-[#496b3f]">
                  <Icon size={28} />
                </div>

                <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#475569]">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="rounded-3xl bg-[#496b3f] p-8 text-white">
            <ShieldCheck className="text-[#f0d28a]" size={42} />
            <h2 className="mt-6 text-3xl font-bold">
              Datenschutz zuerst
            </h2>
            <p className="mt-4 leading-7 text-white/80">
              Mitgliederinformationen, interne Anliegen und private
              Gebetsanliegen gehören nicht automatisch auf die öffentliche
              Website. Öffentlich sichtbar wird nur, was bewusst freigegeben
              wurde.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6">
              <Lock className="text-[#d6a63f]" size={32} />
              <h3 className="mt-4 text-xl font-bold">Privat</h3>
              <p className="mt-3 text-[#475569]">
                Interne Inhalte bleiben in der App geschützt.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6">
              <Users className="text-[#d6a63f]" size={32} />
              <h3 className="mt-4 text-xl font-bold">Gemeinde</h3>
              <p className="mt-3 text-[#475569]">
                Inhalte können nur für bestimmte Gemeinden sichtbar sein.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6">
              <Globe2 className="text-[#d6a63f]" size={32} />
              <h3 className="mt-4 text-xl font-bold">Öffentlich</h3>
              <p className="mt-3 text-[#475569]">
                Freigegebene Veranstaltungen erscheinen auf sdarm.ch.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6">
              <ShieldCheck className="text-[#d6a63f]" size={32} />
              <h3 className="mt-4 text-xl font-bold">Kontrolliert</h3>
              <p className="mt-3 text-[#475569]">
                Leiter entscheiden bewusst, was veröffentlicht wird.
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
                App-Zugang für Mitglieder
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-[#071d35]/75">
                Die App ist für Mitglieder und Verantwortliche gedacht. Besucher
                können über die Website Kontakt aufnehmen oder eine Gemeinde
                besuchen.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center rounded-md bg-[#071d35] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
              >
                Zugang anfragen
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