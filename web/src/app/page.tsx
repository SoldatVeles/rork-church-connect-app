import { churches } from "@/data/churches";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="relative overflow-hidden bg-[#0b2341] text-white">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
            Offizielle Website
          </p>

          <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
            Siebenten-Tags-Adventisten Reformbewegung Schweiz
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
            Eine Gemeinschaft im Glauben, verbunden durch Gottes Wort, Gebet,
            Mission und den Sabbat.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="/gemeinden"
              className="rounded-md bg-[#d6a63f] px-6 py-3 text-center font-semibold text-[#0b2341] shadow-sm hover:bg-[#c7942d]"
            >
              Gemeinde finden
            </a>

            <a
              href="/veranstaltungen"
              className="rounded-md bg-white px-6 py-3 text-center font-semibold text-[#0b2341] shadow-sm hover:bg-white/90"
            >
              Veranstaltungen ansehen
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
            Gemeinden
          </p>
          <h2 className="mt-3 text-3xl font-bold">
            Unsere Gemeinden in der Schweiz
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#334155]">
            Besuchen Sie uns in einer unserer Gemeinden. Jeder ist herzlich
            willkommen.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {churches.map((church) => (
            <article
              key={church.slug}
              className="rounded-2xl border border-[#e5dfd0] bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#496b3f] text-white">
                ✦
              </div>

              <h3 className="text-xl font-bold">{church.name}</h3>

              <p className="mt-3 text-[#334155]">
                {church.address}
                <br />
                {church.postalCode} {church.city}
              </p>

              <p className="mt-3 text-sm text-[#64748b]">{church.note}</p>

              <div className="mt-5 flex gap-2">
                {church.languages.map((language) => (
                  <span
                    key={language}
                    className="rounded-full bg-[#eef3ea] px-3 py-1 text-xs font-semibold text-[#496b3f]"
                  >
                    {language}
                  </span>
                ))}
              </div>

              <a
                href={`/gemeinden#${church.slug}`}
                className="mt-6 inline-block font-semibold text-[#0b2341] hover:underline"
              >
                Mehr erfahren →
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e5dfd0] p-6">
            <h3 className="text-xl font-bold">Bibel</h3>
            <p className="mt-3 text-[#334155]">
              Wir glauben an die Heilige Schrift als Gottes inspiriertes Wort
              und Grundlage unseres Glaubens.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e5dfd0] p-6">
            <h3 className="text-xl font-bold">Sabbat</h3>
            <p className="mt-3 text-[#334155]">
              Der siebente Tag ist der Sabbat des Herrn — ein Tag der Ruhe,
              Anbetung und Gemeinschaft.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e5dfd0] p-6">
            <h3 className="text-xl font-bold">Mission</h3>
            <p className="mt-3 text-[#334155]">
              Wir möchten Menschen mit Jesus Christus verbinden und die gute
              Nachricht weitergeben.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}