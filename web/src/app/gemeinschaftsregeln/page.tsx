import Link from "next/link";
import { HeartHandshake, ShieldCheck, UsersRound } from "lucide-react";

import { siteConfig } from "@/config/site";

const rules = [
  "Behandle andere Menschen respektvoll – auch bei unterschiedlichen Meinungen.",
  "Teile keine beleidigenden, bedrohenden, diskriminierenden, sexuellen oder rechtswidrigen Inhalte.",
  "Veröffentliche keine persönlichen Angaben anderer Personen ohne deren Einwilligung.",
  "Nutze Gebetsanliegen und Chats nicht für Werbung, Spam oder politische Kampagnen.",
  "Melde Inhalte, die gegen diese Regeln verstossen. Die Gemeindeleitung prüft Meldungen zeitnah.",
];

export default function CommunityRulesPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="bg-[#071d35] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">Church Connect</p>
          <h1 className="max-w-4xl text-[clamp(2rem,7vw,5rem)] font-extrabold leading-[1.03] tracking-[-0.04em]">Gemeinschaftsregeln</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">Damit Church Connect ein geschützter und ermutigender Ort für unsere Gemeinden bleibt.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="rounded-3xl bg-[#496b3f] p-8 text-white">
          <HeartHandshake className="text-[#f0d28a]" size={38} />
          <h2 className="mt-5 text-2xl font-bold">Miteinander verbunden</h2>
          <p className="mt-4 leading-7 text-white/80">Die App verbindet Mitglieder im Glauben, im Gebet und im Dienst. Diese Regeln gelten für Gebetsanliegen, Church Chats und jedes andere von Mitgliedern erstellte Material.</p>
        </div>

        <div className="rounded-3xl border border-[#e5dfd0] bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3"><UsersRound className="text-[#d6a63f]" size={30} /><h2 className="text-2xl font-bold">Unsere Regeln</h2></div>
          <ol className="mt-6 space-y-4 pl-5 text-[#475569] marker:font-bold marker:text-[#0b2341]">
            {rules.map((rule) => <li key={rule} className="pl-2 leading-7">{rule}</li>)}
          </ol>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-8 sm:p-10">
          <ShieldCheck className="text-[#496b3f]" size={38} />
          <h2 className="mt-5 text-2xl font-bold">Moderation und Folgen</h2>
          <p className="mt-4 max-w-3xl leading-7 text-[#475569]">Gemeldete Inhalte werden von der zuständigen Gemeindeleitung geprüft. Inhalte können entfernt und Konten bei Missbrauch vorübergehend oder dauerhaft gesperrt werden. Bei akuter Gefahr wenden Sie sich bitte an die örtlichen Notrufstellen.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link href="/datenschutz" className="rounded-xl bg-[#0b2341] px-5 py-3 font-semibold text-white">Datenschutz lesen</Link><a href={`mailto:${siteConfig.email}?subject=Church%20Connect%20Meldung`} className="rounded-xl border border-[#0b2341] px-5 py-3 font-semibold text-[#0b2341]">Kontakt aufnehmen</a></div>
        </div>
      </section>
    </main>
  );
}
