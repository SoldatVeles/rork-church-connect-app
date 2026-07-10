import { churches } from "@/data/churches";

export default function GemeindenPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0b2341]">
      <section className="bg-[#0b2341] px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-[#d6a63f]">
            Gemeinden
          </p>
          <h1 className="max-w-3xl text-4xl font-bold md:text-6xl">
            Unsere Gemeinden in der Schweiz
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/85">
            Finden Sie eine Gemeinde in Ihrer Nähe und besuchen Sie uns am
            Sabbat.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {churches.map((church) => (
            <article
              id={church.slug}
              key={church.slug}
              className="rounded-2xl border border-[#e5dfd0] bg-white p-6 shadow-sm"
            >
              <h2 className="text-2xl font-bold">{church.name}</h2>

              <p className="mt-4 text-[#334155]">
                {church.address}
                <br />
                {church.postalCode} {church.city}
                <br />
                {church.country}
              </p>

              <p className="mt-4 rounded-lg bg-[#f8f6f1] p-3 text-sm text-[#334155]">
                {church.note}
              </p>

              <div className="mt-5">
                <p className="text-sm font-semibold">Sprachen</p>
                <div className="mt-2 flex gap-2">
                  {church.languages.map((language) => (
                    <span
                      key={language}
                      className="rounded-full bg-[#eef3ea] px-3 py-1 text-xs font-semibold text-[#496b3f]"
                    >
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}