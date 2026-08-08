import Link from "next/link";
import { Mail, MapPin, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="bg-[#071d35] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Impressum
          </p>

          <h1 className="max-w-4xl text-[clamp(2rem,7vw,5rem)] font-extrabold leading-[1.03] tracking-[-0.04em]">
            Rechtliche Angaben
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Angaben gemäss den Anforderungen an Transparenz und Kontaktmöglichkeit
            für diese Website.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[1fr_0.8fr] lg:px-8">
        <div className="rounded-3xl border border-[#e5dfd0] bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Website-Betreiber</h2>

          <div className="mt-6 space-y-5 text-[#475569]">
            <div>
              <p className="font-semibold text-[#0b2341]">Name</p>
              <p>{siteConfig.name}</p>
            </div>

            <div>
              <p className="font-semibold text-[#0b2341]">Adresse</p>
              <p>
                {siteConfig.address.street}
                <br />
                {siteConfig.address.postalCode} {siteConfig.address.city}
                <br />
                {siteConfig.address.country}
              </p>
            </div>

            <div>
              <p className="font-semibold text-[#0b2341]">E-Mail</p>
              <a
                href={`mailto:${siteConfig.email}`}
                className="font-semibold text-[#0b2341] underline"
              >
                {siteConfig.email}
              </a>
            </div>

            <div>
              <p className="font-semibold text-[#0b2341]">Telefon</p>
              <p>{siteConfig.publicContact.name}, {siteConfig.publicContact.role}</p>
              <a
                href={`tel:${siteConfig.publicContact.phoneHref}`}
                className="font-semibold text-[#0b2341] underline"
              >
                {siteConfig.publicContact.phone}
              </a>
            </div>

            <div>
              <p className="font-semibold text-[#0b2341]">Domain</p>
              <p>{siteConfig.domain}</p>
            </div>

            <div>
              <p className="font-semibold text-[#0b2341]">
                Verantwortlich für den Inhalt
              </p>
              <p>{siteConfig.responsible.name}</p>
              <p>{siteConfig.responsible.role}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-[#0b2341] p-7 text-white">
            <ShieldCheck className="text-[#d6a63f]" size={38} />
            <h2 className="mt-5 text-2xl font-bold">Transparenz</h2>
            <p className="mt-4 leading-7 text-white/75">
              Die Angaben auf dieser Seite nennen den Betreiber, die
              verantwortliche Person sowie die direkten Kontaktmöglichkeiten
              der Website.
            </p>
          </div>

          <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7">
            <Mail className="text-[#d6a63f]" size={38} />
            <h2 className="mt-5 text-2xl font-bold">Kontakt</h2>
            <p className="mt-4 text-[#475569]">
              Für Fragen zur Website oder zu den Inhalten kontaktieren Sie uns
              bitte per E-Mail.
            </p>

            <a
              href={`mailto:${siteConfig.email}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b2341] px-5 py-3 font-semibold text-white"
            >
              <Mail size={18} />
              {siteConfig.email}
            </a>
          </div>

          <div className="rounded-3xl bg-[#496b3f] p-7 text-white">
            <MapPin className="text-[#f0d28a]" size={38} />
            <h2 className="mt-5 text-2xl font-bold">Gemeinden</h2>
            <p className="mt-4 leading-7 text-white/80">
              Die Standorte unserer Gemeinden finden Sie auf der Gemeindeseite.
            </p>

            <Link
              href="/gemeinden"
              className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-[#496b3f]"
            >
              Gemeinden ansehen
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}