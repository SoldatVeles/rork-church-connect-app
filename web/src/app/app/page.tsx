import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Apple,
  ArrowRight,
  CalendarDays,
  Globe2,
  Heart,
  House,
  Lock,
  Play,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";

const appFeatures = [
  {
    title: "Gemeinschaft",
    description:
      "Aktuelles aus der Gemeinde, hilfreiche Informationen und ein Ort, um verbunden zu bleiben.",
    icon: House,
  },
  {
    title: "Termine",
    description:
      "Sabbat, Veranstaltungen und wichtige Anlässe übersichtlich an einem Ort.",
    icon: CalendarDays,
  },
  {
    title: "Gebet",
    description:
      "Anliegen bewusst und geschützt teilen – nur mit den Menschen, für die sie bestimmt sind.",
    icon: Heart,
  },
];

function StoreCard({
  store,
  label,
  icon,
}: Readonly<{
  store: string;
  label: string;
  icon: ReactNode;
}>) {
  return (
    <div
      aria-label={`${store}: ${label}`}
      className="flex min-h-14 items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-left shadow-sm"
    >
      <span className="flex h-8 w-8 items-center justify-center text-white">
        {icon}
      </span>
      <span>
        <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-white/55">
          {label}
        </span>
        <span className="block text-sm font-bold text-white">{store}</span>
      </span>
    </div>
  );
}

export default function AppPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-4 py-12 text-white sm:px-6 sm:py-16 lg:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_15%,_rgba(214,166,63,0.28),_transparent_30%),radial-gradient(circle_at_10%_100%,_rgba(73,107,63,0.45),_transparent_36%)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:gap-14">
          <div className="py-2">
            <div className="mb-6 flex items-center gap-3">
              <Image
                src="/images/website/church-connect-app-icon.png"
                alt="Church Connect App-Logo"
                width={64}
                height={64}
                className="h-14 w-14 rounded-2xl shadow-[0_12px_28px_rgba(0,0,0,0.28)]"
              />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#f0d28a]">
                  Church Connect
                </p>
                <p className="mt-1 text-sm text-white/65">Ihre Gemeinde. Immer dabei.</p>
              </div>
            </div>

            <p className="inline-flex rounded-full border border-[#f0d28a]/30 bg-[#d6a63f]/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#f0d28a]">
              Jetzt in der Testphase
            </p>

            <h1 className="mt-5 max-w-xl text-[clamp(2.25rem,6vw,4.7rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
              Gemeinde.
              <br />
              Verbunden.
              <br />
              Immer dabei.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
              Church Connect bringt Gemeinschaft, Termine und Gebet in eine
              ruhige, geschützte App – für das Leben Ihrer Gemeinde.
            </p>

            <div className="mt-8 grid max-w-md gap-3 sm:grid-cols-2">
              <StoreCard
                label="Bald im"
                store="App Store"
                icon={<Apple size={27} strokeWidth={2.1} />}
              />
              <StoreCard
                label="Bald bei"
                store="Google Play"
                icon={<Play size={26} fill="currentColor" strokeWidth={0} />}
              />
            </div>

            <p className="mt-3 text-sm text-white/58">
              Der öffentliche Download folgt nach Abschluss der Tests.
            </p>

            <Link
              href="/kontakt"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d6a63f] px-6 py-3 font-bold text-[#071d35] transition hover:bg-[#e3b956]"
            >
              Testzugang anfragen
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="relative mx-auto w-full max-w-3xl">
            <div className="absolute inset-x-10 inset-y-8 rounded-[2.5rem] bg-[#d6a63f]/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#f8f6f1] p-2 shadow-[0_32px_80px_rgba(0,0,0,0.35)] sm:p-3">
              <Image
                src="/images/website/church-connect-preview-phones.png"
                alt="Vorschau von Church Connect mit Startseite, Terminen und Gebetsanliegen"
                width={1536}
                height={1024}
                priority
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="h-auto w-full rounded-[1.45rem]"
              />
            </div>
            <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-white/55">
              Startseite · Termine · Gebet
            </p>
          </div>
        </div>
      </section>

      <section className="site-container py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8e6a1d]">
            Für das Gemeindeleben
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
            Alles Wichtige, angenehm übersichtlich
          </h2>
          <p className="mt-4 leading-7 text-[#5c6878]">
            Church Connect hilft Mitgliedern und Verantwortlichen, informiert
            zu bleiben und miteinander verbunden zu sein.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {appFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-[0_18px_45px_rgba(7,29,53,0.07)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef3ea] text-[#496b3f]">
                  <Icon size={24} />
                </div>
                <h3 className="mt-5 text-xl font-extrabold">{feature.title}</h3>
                <p className="mt-3 leading-7 text-[#5c6878]">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[#e5dfd0] bg-white py-14 sm:py-20">
        <div className="site-container grid items-stretch gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="rounded-3xl bg-[#496b3f] p-8 text-white sm:p-10">
            <ShieldCheck className="text-[#f0d28a]" size={42} />
            <h2 className="mt-6 text-3xl font-extrabold tracking-[-0.035em]">
              Datenschutz zuerst
            </h2>
            <p className="mt-4 leading-7 text-white/80">
              Interne Informationen, Mitgliederangaben und private
              Gebetsanliegen gehören nicht automatisch auf die öffentliche
              Website. Sichtbar wird nur, was bewusst freigegeben wird.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6">
              <Lock className="text-[#d6a63f]" size={30} />
              <h3 className="mt-4 text-lg font-extrabold">Privat</h3>
              <p className="mt-2 text-sm leading-6 text-[#5c6878]">
                Geschützte Inhalte bleiben in der App.
              </p>
            </div>
            <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6">
              <Users className="text-[#d6a63f]" size={30} />
              <h3 className="mt-4 text-lg font-extrabold">Gemeinde</h3>
              <p className="mt-2 text-sm leading-6 text-[#5c6878]">
                Informationen erreichen die richtigen Menschen.
              </p>
            </div>
            <div className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-6">
              <Globe2 className="text-[#d6a63f]" size={30} />
              <h3 className="mt-4 text-lg font-extrabold">Öffentlich</h3>
              <p className="mt-2 text-sm leading-6 text-[#5c6878]">
                Nur freigegebene Inhalte erscheinen auf staref.ch.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="site-container py-14 sm:py-20">
        <div className="grid items-center gap-7 rounded-[2rem] bg-[#d6a63f] p-7 sm:p-10 lg:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-[#071d35] text-white">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.025em] text-[#071d35] sm:text-3xl">
                Church Connect kommt bald.
              </h2>
              <p className="mt-2 max-w-2xl leading-7 text-[#071d35]/75">
                Wir bereiten die Veröffentlichung für App Store und Google Play
                vor. Bis dahin können Sie einen Testzugang anfragen.
              </p>
            </div>
          </div>

          <Link
            href="/kontakt"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#071d35] px-6 py-3 font-bold text-white transition hover:bg-[#12365f]"
          >
            Kontakt aufnehmen
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
