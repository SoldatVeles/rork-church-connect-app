import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Church,
  Heart,
  MapPin,
  MessageCircleHeart,
  Search,
  Smartphone,
  Users,
} from "lucide-react";

import { siteConfig } from "@/config/site";
import type { WebsiteChurch } from "@/lib/website-churches";
import { getWebsiteChurches } from "@/lib/website-churches";
import { getWebsiteEvents } from "@/lib/website-events";

export const dynamic = "force-dynamic";

const churchImages: Record<string, string> = {
  zuerich: "/images/website/city-zurich.webp",
  zurich: "/images/website/city-zurich.webp",
  geneve: "/images/website/city-geneva.webp",
  genf: "/images/website/city-geneva.webp",
  bern: "/images/website/city-bern.webp",
};

const eventImages = [
  "/images/website/open-bible-study.webp",
  "/images/website/event-family.webp",
  "/images/website/event-youth-mountains.webp",
  "/images/website/community-prayer.webp",
];

function getChurchImage(church: WebsiteChurch): string {
  const key = `${church.slug} ${church.name} ${church.city}`.toLowerCase();

  if (key.includes("genève") || key.includes("geneve") || key.includes("genf")) {
    return churchImages.geneve;
  }

  if (key.includes("bern")) return churchImages.bern;

  return churchImages.zuerich;
}

export default async function Home() {
  const [churches, events] = await Promise.all([
    getWebsiteChurches(),
    getWebsiteEvents(),
  ]);

  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="site-container pb-14 pt-6 sm:pb-20 sm:pt-9">
        <div className="grid overflow-hidden rounded-[2rem] bg-[#071d35] shadow-[0_30px_90px_rgba(7,29,53,0.18)] lg:grid-cols-[0.72fr_1.28fr]">
          <div className="flex flex-col justify-center p-7 text-white sm:p-10 lg:p-10">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-[#f0d28a]">
              Willkommen bei staref.ch
            </p>

            <h1 className="max-w-xl hyphens-auto text-[clamp(1.75rem,9vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-0.045em] lg:text-[clamp(2.7rem,4vw,4.1rem)]">
              <span className="block">Gemeinschaft</span>
              <span className="block">im Glauben</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
              In Jesus Christus verbunden, durch Gottes Wort gestärkt und
              gemeinsam für Menschen in der Schweiz da.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/gemeinden"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d6a63f] px-6 py-3 font-bold text-[#071d35] transition hover:bg-[#e3b956]"
              >
                Gemeinde finden
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/ueber-uns"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/8 px-6 py-3 font-bold text-white transition hover:bg-white/15"
              >
                Mehr über uns
              </Link>
            </div>

            <blockquote className="mt-9 border-l-2 border-[#d6a63f] pl-4 text-sm leading-6 text-white/68">
              „Siehe, wie fein und lieblich ist&apos;s, wenn Brüder einträchtig
              beieinander wohnen.“
              <cite className="mt-2 block not-italic text-[#f0d28a]">
                Psalm 133,1
              </cite>
            </blockquote>
          </div>

          <div className="relative min-h-[18rem] sm:min-h-[22rem] lg:min-h-[35rem]">
            <Image
              src="/images/website/hero-community-zurich.webp"
              alt="Eine generationenübergreifende Gemeinschaft vor der Zürcher Altstadt und den Schweizer Alpen"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover object-right"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071d35]/25 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#071d35]/22 lg:to-transparent" />
          </div>
        </div>
      </section>

      <section className="site-container pb-14 sm:pb-20">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8e6a1d]">
              Unsere Standorte
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
              Gemeinden in der Schweiz
            </h2>
          </div>

          <Link
            href="/gemeinden"
            className="inline-flex items-center gap-2 font-bold text-[#36532e] hover:underline"
          >
            Alle Gemeinden ansehen
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {churches.map((church) => (
            <article
              key={church.slug}
              className="group overflow-hidden rounded-2xl border border-[#e5dfd0] bg-white shadow-[0_18px_45px_rgba(7,29,53,0.07)]"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={getChurchImage(church)}
                  alt={`Stadtansicht für ${church.name}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#496b3f] text-white shadow-lg">
                  <Church size={21} />
                </div>
              </div>

              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8e6a1d]">
                  {church.region}
                </p>
                <h3 className="mt-2 text-xl font-extrabold">{church.name}</h3>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#5c6878]">
                  {church.description}
                </p>
                <p className="mt-4 flex items-start gap-2 text-sm text-[#475569]">
                  <MapPin className="mt-0.5 text-[#496b3f]" size={16} />
                  <span>
                    {church.address}, {church.postalCode} {church.city}
                  </span>
                </p>
                <Link
                  href={`/gemeinden#${church.slug}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#36532e] hover:underline"
                >
                  Mehr erfahren
                  <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#ebe4d7] bg-white py-14 sm:py-20">
        <div className="site-container">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8e6a1d]">
                Gemeinsam unterwegs
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
                Veranstaltungen
              </h2>
            </div>

            <Link
              href="/veranstaltungen"
              className="inline-flex items-center gap-2 font-bold text-[#36532e] hover:underline"
            >
              Alle Veranstaltungen
              <ArrowRight size={17} />
            </Link>
          </div>

          {events.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {events.slice(0, 4).map((event, index) => (
                <article
                  key={event.slug}
                  className="group overflow-hidden rounded-2xl border border-[#e5dfd0] bg-[#fdfcf9]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={eventImages[index % eventImages.length]}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-[#496b3f] px-3 py-1.5 text-xs font-bold text-white shadow-md">
                      {event.type}
                    </span>
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-bold text-[#8e6a1d]">
                      {event.date}
                    </p>
                    <h3 className="mt-2 text-lg font-extrabold leading-snug">
                      {event.title}
                    </h3>
                    <div className="mt-4 space-y-2 text-sm text-[#5c6878]">
                      <p className="flex gap-2">
                        <CalendarDays className="mt-0.5 text-[#8e6a1d]" size={15} />
                        <span>{event.time}</span>
                      </p>
                      <p className="flex gap-2">
                        <MapPin className="mt-0.5 text-[#496b3f]" size={15} />
                        <span>{event.location}</span>
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#e5dfd0] bg-[#f8f6f1] p-8 text-center">
              <CalendarDays className="mx-auto text-[#496b3f]" size={34} />
              <h3 className="mt-4 text-xl font-extrabold">
                Neue Termine werden bald veröffentlicht
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-[#5c6878]">
                Sobald eine Gemeinde eine Veranstaltung freigibt, erscheint sie
                hier.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="site-container py-14 sm:py-20">
        <div className="grid overflow-hidden rounded-[1.75rem] border border-[#e5dfd0] bg-white shadow-[0_20px_60px_rgba(7,29,53,0.08)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[22rem]">
            <Image
              src="/images/website/community-prayer.webp"
              alt="Menschen verschiedener Generationen beten gemeinsam"
              fill
              sizes="(max-width: 1024px) 100vw, 52vw"
              className="object-cover"
            />
          </div>

          <div className="flex flex-col justify-center p-7 sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8e6a1d]">
              Gebet
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
              Gebet verbindet
            </h2>
            <p className="mt-4 leading-7 text-[#5c6878]">
              Gott hört uns. Im Gebet bringen wir persönliche Anliegen vor ihn,
              tragen einander und teilen Dank und Hoffnung.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div>
                <MessageCircleHeart className="text-[#496b3f]" size={25} />
                <p className="mt-2 text-sm font-bold">Anliegen einreichen</p>
              </div>
              <div>
                <Users className="text-[#496b3f]" size={25} />
                <p className="mt-2 text-sm font-bold">Füreinander beten</p>
              </div>
              <div>
                <Heart className="text-[#496b3f]" size={25} />
                <p className="mt-2 text-sm font-bold">Dank teilen</p>
              </div>
            </div>

            <Link
              href="/gebet#gebetsanliegen"
              className="mt-8 inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-xl bg-[#d6a63f] px-6 py-3 font-bold text-[#071d35] hover:bg-[#e3b956]"
            >
              Gebetsanliegen senden
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="site-container pb-14 sm:pb-20">
        <div className="grid overflow-hidden rounded-[1.75rem] border border-[#e5dfd0] bg-[#eef3ea] lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col justify-center p-7 sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#496b3f]">
              Glaube vertiefen
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
              Gottes Wort entdecken
            </h2>
            <p className="mt-4 leading-7 text-[#526174]">
              Die Bibel ist Grundlage unseres Glaubens und Wegweiser für jeden
              Tag. Entdecken Sie Bibelstudien, Andachten und kostenlose Bücher.
            </p>

            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm font-bold text-[#36532e]">
              <span className="inline-flex items-center gap-2">
                <BookOpenText size={18} />
                Bibel lesen
              </span>
              <span className="inline-flex items-center gap-2">
                <Search size={18} />
                Bibelstudien
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/ressourcen"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#496b3f] px-6 py-3 font-bold text-white hover:bg-[#36532e]"
              >
                Ressourcen entdecken
                <ArrowRight size={17} />
              </Link>
              <Link
                href={siteConfig.freeBooks.href}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#496b3f]/20 bg-white px-6 py-3 font-bold text-[#36532e] hover:bg-[#f8f6f1]"
              >
                Kostenlose Bücher
              </Link>
            </div>
          </div>

          <div className="relative min-h-[22rem]">
            <Image
              src="/images/website/open-bible-study.webp"
              alt="Eine geöffnete Bibel mit Notizbuch in warmem Morgenlicht"
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="site-container pb-14 sm:pb-20">
        <div className="grid items-center gap-7 overflow-hidden rounded-[1.75rem] bg-[#071d35] p-7 text-white sm:p-9 lg:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-[#d6a63f] text-[#071d35]">
              <Smartphone size={24} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#f0d28a]">
                Church Connect
              </p>
              <h2 className="mt-1 text-2xl font-extrabold">
                Ihre Gemeinde. Immer dabei.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/72">
                Bleiben Sie über Veranstaltungen, Gebetsanliegen und das Leben
                Ihrer Gemeinde verbunden.
              </p>
            </div>
          </div>

          <Link
            href="/app"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d6a63f] px-6 py-3 font-bold text-[#071d35] hover:bg-[#e3b956]"
          >
            App kennenlernen
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
