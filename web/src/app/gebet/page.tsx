import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Church,
  Clock,
  HeartHandshake,
  Lock,
  MapPin,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

const prayerFocus = [
  {
    title: "Familien & Jugend",
    description:
      "Wir beten für starke Familien, Kinder, Jugendliche und geistliches Wachstum.",
  },
  {
    title: "Gemeinden in der Schweiz",
    description:
      "Wir beten für unsere Gemeinden in Zürich, Genève und Bern und für ihre Aufgaben.",
  },
  {
    title: "Mission & Bibelstudien",
    description:
      "Wir beten für Menschen, die Gottes Wort kennenlernen und Jesus Christus begegnen möchten.",
  },
];

const prayerMeetings = [
  {
    title: "Gemeinsames Gebet",
    church: "Gemeinden in der Schweiz",
    date: "Regelmässig",
    time: "Nach lokaler Absprache",
    location: "Zürich, Genève und Bern",
  },
  {
    title: "Gebet für Familien",
    church: "Schweizweit",
    date: "Aktuell",
    time: "Privat und gemeinsam",
    location: "In den Gemeinden und Familien",
  },
];

export default function GebetPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#071d35] px-6 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(214,166,63,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(73,107,63,0.35),_transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f0d28a]">
            Gebet
          </p>

          <h1 className="max-w-4xl text-4xl font-bold md:text-6xl">
            Gebet verbindet
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Gemeinsam bringen wir unsere Anliegen vor Gott. Gebetsanliegen
            werden vertraulich behandelt und sind standardmässig nicht
            öffentlich sichtbar.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#gebetsanliegen"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#d6a63f] px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-[#c99631]"
            >
              Gebetsanliegen senden
              <ArrowRight size={18} />
            </a>

            <a
              href="#gebetstreffen"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-[#071d35] shadow-sm hover:bg-white/90"
            >
              Gebetstreffen ansehen
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
            Aktuelle Schwerpunkte
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Wofür wir gemeinsam beten
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#475569]">
            Diese öffentlichen Schwerpunkte sind allgemein formuliert. Private
            Namen und persönliche Details werden nicht öffentlich angezeigt.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {prayerFocus.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-sm"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ea] text-[#496b3f]">
                <HeartHandshake size={28} />
              </div>

              <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
              <p className="mt-3 leading-7 text-[#475569]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="gebetstreffen" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
                Gebetstreffen
              </p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                Gemeinsam beten
              </h2>
              <p className="mt-4 max-w-2xl text-[#475569]">
                Öffentliche Gebetstreffen können später direkt aus Church
                Connect veröffentlicht werden.
              </p>
            </div>

            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 font-semibold text-[#0b2341] hover:underline"
            >
              Kontakt aufnehmen
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {prayerMeetings.map((meeting) => (
              <article
                key={meeting.title}
                className="rounded-3xl border border-[#e5dfd0] bg-[#f8f6f1] p-7"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0b2341] text-white">
                  <Church size={28} />
                </div>

                <h3 className="mt-5 text-2xl font-bold">{meeting.title}</h3>
                <p className="mt-2 text-[#496b3f]">{meeting.church}</p>

                <div className="mt-5 space-y-3 text-sm text-[#475569]">
                  <p className="flex gap-3">
                    <CalendarDays size={18} className="text-[#d6a63f]" />
                    {meeting.date}
                  </p>

                  <p className="flex gap-3">
                    <Clock size={18} className="text-[#d6a63f]" />
                    {meeting.time}
                  </p>

                  <p className="flex gap-3">
                    <MapPin size={18} className="text-[#496b3f]" />
                    {meeting.location}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="gebetsanliegen" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d6a63f] text-[#071d35]">
                <Send size={24} />
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  Gebetsanliegen senden
                </h2>
                <p className="text-[#475569]">
                  Teilen Sie uns mit, wofür wir beten dürfen.
                </p>
              </div>
            </div>

            <form className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Ihr Name, optional
                </label>
                <input
                  type="text"
                  placeholder="z. B. Maria"
                  className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  E-Mail, optional
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Ihr Anliegen
                </label>
                <textarea
                  rows={6}
                  placeholder="Wofür dürfen wir beten?"
                  className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Sichtbarkeit
                </label>
                <select className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]">
                  <option>Nur an die Gemeindeleitung senden</option>
                  <option>Anonym mit der Gemeinde teilen</option>
                  <option>Ich möchte zuerst kontaktiert werden</option>
                </select>
              </div>

              <label className="flex gap-3 text-sm text-[#475569]">
                <input type="checkbox" className="mt-1" />
                Ich bin einverstanden, dass meine Angaben zur Bearbeitung des
                Gebetsanliegens verwendet werden.
              </label>

              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0b2341] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
              >
                Anliegen vorbereiten
                <ArrowRight size={18} />
              </button>

              <p className="text-xs leading-5 text-[#64748b]">
                Hinweis: Die technische Übermittlung wird später mit Supabase
                verbunden. Bis dahin ist dieses Formular vorbereitet, aber noch
                nicht aktiv.
              </p>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-[#0b2341] p-7 text-white">
              <ShieldCheck className="text-[#d6a63f]" size={38} />
              <h3 className="mt-5 text-2xl font-bold">
                Datenschutz und Vertrauen
              </h3>
              <p className="mt-4 leading-7 text-white/75">
                Gebetsanliegen sind sehr persönlich. Deshalb werden sie
                vertraulich behandelt und nicht automatisch auf der Website
                veröffentlicht.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e5dfd0] bg-white p-7">
              <Lock className="text-[#496b3f]" size={38} />
              <h3 className="mt-5 text-2xl font-bold">
                Privat als Standard
              </h3>
              <ul className="mt-4 space-y-3 text-[#475569]">
                <li>Private Anliegen bleiben privat.</li>
                <li>Namen werden nicht öffentlich angezeigt.</li>
                <li>Öffentliche Anliegen brauchen klare Freigabe.</li>
                <li>Leiter sehen nur, was sie sehen dürfen.</li>
              </ul>
            </div>

            <div className="rounded-3xl bg-[#496b3f] p-7 text-white">
              <Users className="text-[#f0d28a]" size={38} />
              <h3 className="mt-5 text-2xl font-bold">
                Gebet in Church Connect
              </h3>
              <p className="mt-4 leading-7 text-white/80">
                Später können Gebetsanliegen in der App einer Gemeinde
                zugeordnet und sicher verwaltet werden.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
        <div className="rounded-[2rem] bg-[#d6a63f] p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_0.7fr] md:items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#071d35]">
                Wir beten gerne für Sie
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-[#071d35]/75">
                Haben Sie ein Anliegen, wünschen Sie ein Gespräch oder möchten
                Sie eine Gemeinde besuchen? Nehmen Sie gerne Kontakt auf.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#071d35] px-6 py-3 font-semibold text-white hover:bg-[#12365f]"
              >
                Kontakt aufnehmen
                <ArrowRight size={18} />
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