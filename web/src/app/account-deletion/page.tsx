import { Mail, ShieldCheck, Trash2 } from "lucide-react";

import { siteConfig } from "@/config/site";

export default function AccountDeletionPage() {
  const subject = "Church Connect – Konto löschen";

  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="bg-[#071d35] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">Church Connect</p>
          <h1 className="max-w-4xl text-[clamp(2rem,7vw,5rem)] font-extrabold leading-[1.03] tracking-[-0.04em]">Konto und Daten löschen</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">Sie können die Löschung Ihres Church-Connect-Kontos jederzeit verlangen.</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-sm sm:p-10">
          <Trash2 className="text-[#b91c1c]" size={38} />
          <h2 className="mt-5 text-2xl font-bold">Am einfachsten in der App</h2>
          <p className="mt-4 leading-7 text-[#475569]">Öffnen Sie in Church Connect <strong>Profil → Datenschutz &amp; Sicherheit → Konto löschen</strong>. Nach Ihrer Bestätigung wird das Konto und die direkt damit verbundenen privaten Daten gelöscht.</p>

          <h2 className="mt-10 text-2xl font-bold">Ohne Zugang zur App</h2>
          <p className="mt-4 leading-7 text-[#475569]">Wenn Sie die App nicht mehr öffnen können, senden Sie uns bitte eine E-Mail von der Adresse, die Sie für Church Connect verwendet haben. Schreiben Sie im Betreff „{subject}“. Wir bestätigen die Anfrage und löschen das Konto nach einer kurzen Identitätsprüfung.</p>

          <a href={`mailto:${siteConfig.email}?subject=${encodeURIComponent(subject)}`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b2341] px-5 py-3 font-semibold text-white"><Mail size={18} />Löschung per E-Mail anfragen</a>
        </div>

        <div className="mt-8 rounded-3xl bg-[#eef3ea] p-7">
          <ShieldCheck className="text-[#496b3f]" size={34} />
          <h2 className="mt-4 text-xl font-bold">Was geschieht mit Beiträgen?</h2>
          <p className="mt-3 leading-7 text-[#475569]">Private Kontodaten und Chat-Nachrichten werden gelöscht. Gemeinsame Gebetsanliegen können ohne Ihren Namen in der Gemeinde erhalten bleiben, wenn dies für den Gebetszusammenhang erforderlich ist. Weitere Informationen finden Sie in unserer Datenschutzerklärung.</p>
        </div>
      </section>
    </main>
  );
}
