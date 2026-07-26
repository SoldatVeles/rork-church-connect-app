"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { createSupabaseClient } from "@/lib/supabase/client";
import type { PrayerSubmissionChurch } from "@/lib/website-churches";

type WebsiteRequestFormProps = {
  variant: "contact" | "book";
  churches?: PrayerSubmissionChurch[];
};

type SubmissionStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const errorMessages: Record<string, string> = {
  invalid_church: "Bitte wählen Sie eine gültige Gemeinde aus.",
  invalid_email: "Bitte prüfen Sie Ihre E-Mail-Adresse.",
  invalid_form_timing:
    "Das Formular konnte noch nicht gesendet werden. Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.",
  invalid_request: "Die Anfrage konnte nicht verarbeitet werden.",
  invalid_submission: "Bitte prüfen Sie alle Pflichtfelder.",
  rate_limited:
    "Es wurden bereits mehrere Anfragen gesendet. Bitte versuchen Sie es später erneut.",
  service_unavailable:
    "Die Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es später erneut.",
};

export function WebsiteRequestForm({
  variant,
  churches = [],
}: WebsiteRequestFormProps) {
  const formStartedAt = useRef(new Date().toISOString());
  const [status, setStatus] = useState<SubmissionStatus>({ kind: "idle" });
  const isBookRequest = variant === "book";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "submitting" });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      submissionType: isBookRequest ? "book_request" : "contact",
      groupId: String(formData.get("groupId") ?? ""),
      locale: "de",
      requesterName: String(formData.get("requesterName") ?? ""),
      requesterEmail: String(formData.get("requesterEmail") ?? ""),
      postalAddress: String(formData.get("postalAddress") ?? ""),
      topic: String(formData.get("topic") ?? ""),
      message: String(formData.get("message") ?? ""),
      privacyConsent: formData.get("privacyConsent") === "on",
      formStartedAt: formStartedAt.current,
      company: String(formData.get("company") ?? ""),
    };

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.functions.invoke(
        "submit-website-request",
        { body: payload },
      );

      if (error) {
        let errorCode = "service_unavailable";

        try {
          const context = error.context as Response | undefined;
          const body = await context?.json();
          if (typeof body?.error === "string") errorCode = body.error;
        } catch {
          // The generic fallback intentionally avoids exposing internals.
        }

        throw new Error(
          errorMessages[errorCode] ?? errorMessages.service_unavailable,
        );
      }

      form.reset();
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
          {isBookRequest
            ? "Ihre Buchanfrage wurde sicher übermittelt. Unser Team prüft die Anfrage und meldet sich bei Bedarf per E-Mail."
            : "Ihre Kontaktanfrage wurde sicher übermittelt. Die zuständige Person wird sich so bald wie möglich bei Ihnen melden."}
        </p>
        <button
          type="button"
          className="mt-6 font-semibold text-[#0b2341] underline"
          onClick={() => setStatus({ kind: "idle" })}
        >
          Eine weitere Anfrage senden
        </button>
      </div>
    );
  }

  const isSubmitting = status.kind === "submitting";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="absolute -left-[10000px]" aria-hidden="true">
        <label htmlFor={`${variant}-company`}>Firma</label>
        <input
          id={`${variant}-company`}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {!isBookRequest ? (
        <div>
          <label
            htmlFor="contact-church"
            className="mb-2 block text-sm font-semibold"
          >
            Empfänger
          </label>
          <select
            id="contact-church"
            name="groupId"
            defaultValue=""
            className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
          >
            <option value="">Schweizer Leitung / allgemein</option>
            {churches.map((church) => (
              <option key={church.groupId} value={church.groupId}>
                {church.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label
          htmlFor={`${variant}-name`}
          className="mb-2 block text-sm font-semibold"
        >
          Vorname und Name
        </label>
        <input
          id={`${variant}-name`}
          name="requesterName"
          type="text"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          placeholder="Ihr Name"
          className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
        />
      </div>

      <div>
        <label
          htmlFor={`${variant}-email`}
          className="mb-2 block text-sm font-semibold"
        >
          E-Mail-Adresse
        </label>
        <input
          id={`${variant}-email`}
          name="requesterEmail"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="name@example.com"
          className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
        />
      </div>

      {isBookRequest ? (
        <div>
          <label
            htmlFor="book-address"
            className="mb-2 block text-sm font-semibold"
          >
            Postadresse
          </label>
          <textarea
            id="book-address"
            name="postalAddress"
            rows={3}
            required
            minLength={5}
            maxLength={500}
            autoComplete="street-address"
            placeholder={"Strasse und Hausnummer\nPLZ und Ort"}
            className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
          />
        </div>
      ) : null}

      <div>
        <label
          htmlFor={`${variant}-topic`}
          className="mb-2 block text-sm font-semibold"
        >
          {isBookRequest ? "Gewünschtes Material" : "Anliegen"}
        </label>
        <select
          id={`${variant}-topic`}
          name="topic"
          required
          defaultValue=""
          className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
        >
          <option value="" disabled>
            Bitte auswählen
          </option>
          {isBookRequest ? (
            <>
              <option value="bible_study_material">
                Bibelstudienmaterial
              </option>
              <option value="christian_book">Christliches Buch</option>
              <option value="sabbath">Material über den Sabbat</option>
              <option value="health_family">
                Material über Gesundheit und Familie
              </option>
              <option value="not_sure">Ich bin nicht sicher</option>
            </>
          ) : (
            <>
              <option value="visit_church">
                Ich möchte eine Gemeinde besuchen
              </option>
              <option value="bible_study">
                Ich möchte ein Bibelstudium
              </option>
              <option value="prayer_request">
                Ich habe eine Frage zum Thema Gebet
              </option>
              <option value="free_books">
                Ich habe eine Frage zu kostenlosen Büchern
              </option>
              <option value="general">Allgemeine Frage</option>
            </>
          )}
        </select>
      </div>

      <div>
        <label
          htmlFor={`${variant}-message`}
          className="mb-2 block text-sm font-semibold"
        >
          {isBookRequest ? "Nachricht, optional" : "Nachricht"}
        </label>
        <textarea
          id={`${variant}-message`}
          name="message"
          rows={isBookRequest ? 5 : 6}
          required={!isBookRequest}
          minLength={isBookRequest ? 2 : 10}
          maxLength={4000}
          placeholder={
            isBookRequest
              ? "Ihre Nachricht oder Frage"
              : "Wie können wir Ihnen helfen?"
          }
          className="w-full rounded-xl border border-[#e5dfd0] bg-[#f8f6f1] px-4 py-3 outline-none focus:border-[#d6a63f]"
        />
      </div>

      <label className="flex gap-3 text-sm text-[#475569]">
        <input
          name="privacyConsent"
          type="checkbox"
          required
          className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-[#0b2341]"
        />
        <span>
          Ich bin einverstanden, dass meine Angaben zur Bearbeitung meiner
          Anfrage verwendet werden. Weitere Informationen stehen in der{" "}
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
        {isSubmitting
          ? "Wird sicher gesendet..."
          : isBookRequest
            ? "Buchanfrage senden"
            : "Anfrage senden"}
        {!isSubmitting ? <ArrowRight size={18} /> : null}
      </button>

      <p className="text-xs leading-5 text-[#64748b]">
        Die Übermittlung ist verschlüsselt. Zum Schutz vor Missbrauch wird nur
        ein täglich wechselnder technischer Prüfwert gespeichert, keine rohe
        IP-Adresse.
      </p>
    </form>
  );
}
