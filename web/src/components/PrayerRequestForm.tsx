"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Send } from "lucide-react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { createSupabaseClient } from "@/lib/supabase/client";
import type { PrayerSubmissionChurch } from "@/lib/website-churches";

type PrayerRequestFormProps = {
  churches: PrayerSubmissionChurch[];
};

type SubmissionStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const errorMessages: Record<string, string> = {
  email_required:
    "Bitte geben Sie eine E-Mail-Adresse an, wenn Sie zuerst kontaktiert werden möchten.",
  invalid_church: "Bitte wählen Sie eine gültige Gemeinde aus.",
  invalid_email: "Bitte prüfen Sie Ihre E-Mail-Adresse.",
  invalid_form_timing:
    "Das Formular konnte noch nicht gesendet werden. Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.",
  invalid_request: "Die Anfrage konnte nicht verarbeitet werden.",
  invalid_submission: "Bitte prüfen Sie alle Pflichtfelder.",
  rate_limited:
    "Es wurden bereits mehrere Anliegen gesendet. Bitte versuchen Sie es später erneut.",
  service_unavailable:
    "Das Anliegen konnte gerade nicht gesendet werden. Bitte versuchen Sie es später erneut.",
};

export function PrayerRequestForm({ churches }: PrayerRequestFormProps) {
  const formStartedAt = useRef(new Date().toISOString());
  const [status, setStatus] = useState<SubmissionStatus>({ kind: "idle" });
  const [sharingPreference, setSharingPreference] =
    useState("leaders_only");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "submitting" });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      groupId: String(formData.get("groupId") ?? ""),
      locale: "de",
      requesterName: String(formData.get("requesterName") ?? ""),
      requesterEmail: String(formData.get("requesterEmail") ?? ""),
      title: String(formData.get("title") ?? ""),
      details: String(formData.get("details") ?? ""),
      sharingPreference: String(
        formData.get("sharingPreference") ?? "leaders_only",
      ),
      privacyConsent: formData.get("privacyConsent") === "on",
      formStartedAt: formStartedAt.current,
      company: String(formData.get("company") ?? ""),
    };

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.functions.invoke(
        "submit-website-prayer",
        { body: payload },
      );

      if (error) {
        let errorCode = "service_unavailable";

        try {
          const context = error.context as Response | undefined;
          const body = await context?.json();
          if (typeof body?.error === "string") errorCode = body.error;
        } catch {
          // The generic fallback below intentionally avoids exposing internals.
        }

        throw new Error(
          errorMessages[errorCode] ?? errorMessages.service_unavailable,
        );
      }

      form.reset();
      setSharingPreference("leaders_only");
      formStartedAt.current = new Date().toISOString();
      setStatus({ kind: "success" });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : errorMessages.service_unavailable,
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div
        className="rounded-3xl border border-[#bbd4b5] bg-[#eef3ea] p-8 text-center"
        role="status"
      >
        <CheckCircle2 className="mx-auto text-[#496b3f]" size={44} />
        <h2 className="mt-5 text-2xl font-bold">Vielen Dank</h2>
        <p className="mt-3 leading-7 text-[#475569]">
          Ihr Gebetsanliegen wurde vertraulich an die ausgewählte Gemeinde
          übermittelt. Es wird nicht automatisch in der App oder auf der
          Website veröffentlicht.
        </p>
        <button
          type="button"
          className="mt-6 font-semibold text-[#0b2341] underline"
          onClick={() => setStatus({ kind: "idle" })}
        >
          Ein weiteres Anliegen senden
        </button>
      </div>
    );
  }

  const isSubmitting = status.kind === "submitting";

  return (
    <div className="contents">
      <div className="hidden">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d6a63f] text-[#071d35]">
          <Send size={24} />
        </div>

        <div>
          <h2 className="text-2xl font-bold">Gebetsanliegen senden</h2>
          <p className="text-[#475569]">
            Teilen Sie uns mit, wofür wir beten dürfen.
          </p>
        </div>
      </div>

      {churches.length === 0 ? (
        <div className="rounded-2xl bg-[#fff7ed] p-5 text-[#9a3412]">
          Das sichere Formular ist vorübergehend nicht verfügbar. Bitte nehmen
          Sie über unsere{" "}
          <Link href="/kontakt" className="font-semibold underline">
            Kontaktseite
          </Link>{" "}
          Verbindung mit uns auf.
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="absolute -left-[10000px]" aria-hidden="true">
            <label htmlFor="company">Firma</label>
            <input
              id="company"
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="prayer-church"
              className="mb-2 block text-sm font-semibold"
            >
              Gemeinde
            </label>
            <select
              id="prayer-church"
              name="groupId"
              required
              defaultValue=""
              className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
            >
              <option value="" disabled>
                Gemeinde auswählen
              </option>
              {churches.map((church) => (
                <option key={church.groupId} value={church.groupId}>
                  {church.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="prayer-name"
              className="mb-2 block text-sm font-semibold"
            >
              Ihr Name, optional
            </label>
            <input
              id="prayer-name"
              name="requesterName"
              type="text"
              maxLength={120}
              autoComplete="name"
              placeholder="z. B. Maria"
              className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
            />
          </div>

          <div>
            <label
              htmlFor="prayer-email"
              className="mb-2 block text-sm font-semibold"
            >
              E-Mail, optional
            </label>
            <input
              id="prayer-email"
              name="requesterEmail"
              type="email"
              maxLength={254}
              autoComplete="email"
              required={sharingPreference === "contact_first"}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
            />
          </div>

          <div>
            <label
              htmlFor="prayer-title"
              className="mb-2 block text-sm font-semibold"
            >
              Kurzer Titel
            </label>
            <input
              id="prayer-title"
              name="title"
              type="text"
              required
              minLength={5}
              maxLength={120}
              placeholder="Worum geht es?"
              className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
            />
          </div>

          <div>
            <label
              htmlFor="prayer-details"
              className="mb-2 block text-sm font-semibold"
            >
              Ihr Anliegen
            </label>
            <textarea
              id="prayer-details"
              name="details"
              rows={6}
              required
              minLength={10}
              maxLength={4000}
              placeholder="Wofür dürfen wir beten?"
              className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
            />
          </div>

          <div>
            <label
              htmlFor="prayer-sharing"
              className="mb-2 block text-sm font-semibold"
            >
              Wie dürfen wir damit umgehen?
            </label>
            <select
              id="prayer-sharing"
              name="sharingPreference"
              value={sharingPreference}
              onChange={(event) => setSharingPreference(event.target.value)}
              className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
            >
              <option value="leaders_only">
                Nur an die Gemeindeleitung senden
              </option>
              <option value="church_anonymous">
                Darf anonym mit der Gemeinde geteilt werden
              </option>
              <option value="contact_first">
                Ich möchte zuerst kontaktiert werden
              </option>
            </select>
            <p className="mt-2 text-xs leading-5 text-[#64748b]">
              Eine Veröffentlichung auf der öffentlichen Website erfolgt
              niemals automatisch.
            </p>
          </div>

          <label className="flex gap-3 text-sm text-[#475569]">
            <input
              name="privacyConsent"
              type="checkbox"
              required
              className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-[#0b2341]"
            />
            <span>
              Ich bin einverstanden, dass meine Angaben zur Bearbeitung des
              Gebetsanliegens verwendet werden. Weitere Informationen stehen
              in der{" "}
              <Link href="/datenschutz" className="font-semibold underline">
                Datenschutzerklärung
              </Link>
              .
            </span>
          </label>

          {status.kind === "error" ? (
            <p
              className="rounded-xl bg-[#fff1f2] p-4 text-sm text-[#b91c1c]"
              role="alert"
            >
              {status.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b2341] px-6 py-3 font-semibold text-white hover:bg-[#12365f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Wird sicher gesendet..." : "Anliegen senden"}
            {!isSubmitting ? <ArrowRight size={18} /> : null}
          </button>

          <p className="text-xs leading-5 text-[#64748b]">
            Die Übermittlung ist verschlüsselt. Zum Schutz vor Missbrauch wird
            nur ein täglich wechselnder technischer Prüfwert gespeichert, keine
            rohe IP-Adresse.
          </p>
        </form>
      )}
    </div>
  );
}
