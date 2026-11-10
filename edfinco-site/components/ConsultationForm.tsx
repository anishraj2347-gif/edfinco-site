"use client";

// Accessible, compliant two-step lead-capture form. Posts JSON to same-origin routes only
// (no inline scripts — this is a client component, so handlers run fine under the strict CSP).
//   Step 1 → /api/consultation/start : contact details + consent to be contacted. The student is told
//            we may contact them even if they don't finish, so a step-1-only request is a consented lead.
//   Step 2 → /api/consultation       : study plans, tied to step 1 by a one-time token.
// No guaranteed/visa/loan-promise language: "we help you compare, the lender decides".
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { CONSULTATION } from "@/lib/content";
import { IconArrowRight, IconCheck } from "./Icons";
import styles from "./consultationForm.module.css";

const C = CONSULTATION.form;

type Status = "idle" | "submitting" | "success" | "error";
type FieldKey = "studentName" | "email" | "phone" | "destination" | "studyLevel" | "intake" | "consent";
type FieldErrors = Partial<Record<FieldKey, string>>;
interface Contact {
  studentName: string;
  email: string;
  phone: string;
  consent: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-.\s]{6,20}$/;

export default function ConsultationForm() {
  const uid = useId();
  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<"" | "rate" | "expired">("");
  const [contact, setContact] = useState<Contact>({ studentName: "", email: "", phone: "", consent: false });
  const [token, setToken] = useState("");
  const [reference, setReference] = useState("");
  const statusRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const fieldId = (name: string) => `${uid}-${name}`;
  const errId = (name: string) => `${uid}-${name}-err`;
  const describedBy = (name: FieldKey) => (errors[name] ? errId(name) : undefined);
  const isInvalid = (name: FieldKey) => (errors[name] ? true : undefined);
  const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

  function focusFirstError(form: HTMLFormElement, found: FieldErrors) {
    const el = form.elements.namedItem(Object.keys(found)[0]) as HTMLElement | null;
    el?.focus();
  }

  function goToStep(next: 1 | 2) {
    setStep(next);
    setErrors({});
    setStatus("idle");
    // Move focus to the new step's heading so screen readers announce it.
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function post(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; ref?: unknown; token?: unknown } | null;
    return { res, data };
  }

  async function submitStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const next: Contact = {
      studentName: val(fd, "studentName"),
      email: val(fd, "email"),
      phone: val(fd, "phone"),
      consent: fd.get("consent") === "on",
    };
    const found: FieldErrors = {};
    if (next.studentName.length < 1 || next.studentName.length > 100) found.studentName = C.errors.studentName;
    if (!EMAIL_RE.test(next.email) || next.email.length > 254) found.email = C.errors.email;
    if (!PHONE_RE.test(next.phone)) found.phone = C.errors.phone;
    if (!next.consent) found.consent = C.errors.consent;
    setContact(next);
    if (Object.keys(found).length) {
      setErrors(found);
      setStatus("error");
      focusFirstError(form, found);
      return;
    }
    setErrors({});
    setNotice("");
    setStatus("submitting");
    try {
      const { res, data } = await post("/api/consultation/start", {
        ...next,
        company: val(fd, "company"), // honeypot — real users leave it empty
        ...(token ? { token } : {}),
      });
      if (res.ok && data?.ok && typeof data.token === "string") {
        setToken(data.token);
        if (typeof data.ref === "string") setReference(data.ref);
        goToStep(2);
      } else {
        setNotice(res.status === 429 ? "rate" : "");
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  async function submitStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const plan = {
      destination: val(fd, "destination"),
      studyLevel: val(fd, "studyLevel"),
      intake: val(fd, "intake"),
      coBorrower: val(fd, "coBorrower"),
      message: val(fd, "message"),
    };
    const found: FieldErrors = {};
    if (!C.destinationOptions.includes(plan.destination)) found.destination = C.errors.destination;
    if (!C.studyLevelOptions.includes(plan.studyLevel)) found.studyLevel = C.errors.studyLevel;
    if (plan.intake.length < 1 || plan.intake.length > 60) found.intake = C.errors.intake;
    if (Object.keys(found).length) {
      setErrors(found);
      setStatus("error");
      focusFirstError(form, found);
      return;
    }
    setErrors({});
    setNotice("");
    setStatus("submitting");
    try {
      const { res, data } = await post("/api/consultation", { ...plan, token, company: val(fd, "company") });
      if (res.ok && data?.ok) {
        if (typeof data.ref === "string" && /^EDF-[A-Z0-9]{6}$/.test(data.ref)) setReference(data.ref);
        setStatus("success");
        window.requestAnimationFrame(() => statusRef.current?.focus());
      } else if (res.status === 410) {
        // The step-1 link expired: confirm contact details again (values are kept).
        setToken("");
        setNotice("expired");
        setStep(1);
        setStatus("error");
        window.requestAnimationFrame(() => headingRef.current?.focus());
      } else {
        setNotice(res.status === 429 ? "rate" : "");
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={styles.success} role="status" aria-live="polite" tabIndex={-1} ref={statusRef}>
        <span className={styles.successIcon} aria-hidden="true">
          <IconCheck width={28} height={28} />
        </span>
        <h2 className={styles.successTitle}>{C.successTitle}</h2>
        <p className={styles.successBody}>{C.successBody}</p>
        {reference && (
          <p className={styles.successBody}>
            {C.referenceLabel}: <strong>{reference}</strong>
          </p>
        )}
      </div>
    );
  }

  const fieldError = (name: FieldKey) =>
    errors[name] ? (
      <p id={errId(name)} className={styles.fieldError} role="alert">
        {errors[name]}
      </p>
    ) : null;

  const liveRegion = (
    <div aria-live="polite" tabIndex={-1} className={styles.liveRegion}>
      {notice === "expired" ? (
        <p className={styles.formError} role="alert">
          {C.expiredBody}
        </p>
      ) : status === "error" && Object.keys(errors).length > 0 ? (
        <p className={styles.formError} role="alert">
          {C.errors.generic}
        </p>
      ) : status === "error" ? (
        <p className={styles.formError} role="alert">
          {notice === "rate" ? (
            C.rateLimitedBody
          ) : (
            <>
              <strong>{C.errorTitle}.</strong> {C.errorBody}
            </>
          )}
        </p>
      ) : null}
    </div>
  );

  const honeypot = (
    <div className={styles.hp} aria-hidden="true">
      <label htmlFor={fieldId(`company${step}`)}>Company (leave blank)</label>
      <input id={fieldId(`company${step}`)} type="text" name="company" tabIndex={-1} autoComplete="off" />
    </div>
  );

  const stepHeader = (title: string) => (
    <div>
      <div className={styles.stepBar}>
        <p className={styles.stepLabel}>{C.stepLabel.replace("{n}", String(step))}</p>
        {step === 2 && (
          <button type="button" className={styles.backBtn} onClick={() => goToStep(1)}>
            {C.editContactLabel}
          </button>
        )}
      </div>
      <div className={styles.progress} aria-hidden="true" style={{ marginTop: 8 }}>
        <div className={styles.progressFill} style={{ width: step === 1 ? "50%" : "100%" }} />
      </div>
      <h2 className={styles.stepTitle} tabIndex={-1} ref={headingRef}>
        {title}
      </h2>
    </div>
  );

  if (step === 1) {
    return (
      <form key="step1" className={styles.form} onSubmit={submitStep1} noValidate aria-describedby={`${uid}-intro`}>
        {stepHeader(C.step1Title)}
        <p id={`${uid}-intro`} className={styles.intro}>
          {C.intro}
        </p>
        {liveRegion}
        {honeypot}

        <div className={styles.grid}>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label htmlFor={fieldId("studentName")} className={styles.label}>
              {C.labels.studentName} <span className={styles.req} aria-hidden="true">*</span>
            </label>
            <input
              id={fieldId("studentName")}
              name="studentName"
              type="text"
              required
              maxLength={100}
              autoComplete="name"
              defaultValue={contact.studentName}
              placeholder={C.placeholders.studentName}
              className={styles.input}
              aria-required="true"
              aria-invalid={isInvalid("studentName")}
              aria-describedby={describedBy("studentName")}
            />
            {fieldError("studentName")}
          </div>

          <div className={styles.field}>
            <label htmlFor={fieldId("email")} className={styles.label}>
              {C.labels.email} <span className={styles.req} aria-hidden="true">*</span>
            </label>
            <input
              id={fieldId("email")}
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              inputMode="email"
              defaultValue={contact.email}
              placeholder={C.placeholders.email}
              className={styles.input}
              aria-required="true"
              aria-invalid={isInvalid("email")}
              aria-describedby={describedBy("email")}
            />
            {fieldError("email")}
          </div>

          <div className={styles.field}>
            <label htmlFor={fieldId("phone")} className={styles.label}>
              {C.labels.phone} <span className={styles.req} aria-hidden="true">*</span>
            </label>
            <input
              id={fieldId("phone")}
              name="phone"
              type="tel"
              required
              maxLength={20}
              autoComplete="tel"
              inputMode="tel"
              defaultValue={contact.phone}
              placeholder={C.placeholders.phone}
              className={styles.input}
              aria-required="true"
              aria-invalid={isInvalid("phone")}
              aria-describedby={describedBy("phone")}
            />
            {fieldError("phone")}
          </div>
        </div>

        <div className={styles.consentRow}>
          <input
            id={fieldId("consent")}
            name="consent"
            type="checkbox"
            required
            defaultChecked={contact.consent}
            className={styles.checkbox}
            aria-required="true"
            aria-invalid={isInvalid("consent")}
            aria-describedby={`${describedBy("consent") ?? ""} ${uid}-note ${uid}-privacy`.trim()}
          />
          <label htmlFor={fieldId("consent")} className={styles.consentLabel}>
            {C.consentLabel} <span className={styles.req} aria-hidden="true">*</span>
          </label>
        </div>
        {fieldError("consent")}
        <p id={`${uid}-note`} className={styles.stepNote}>
          {C.step1Note}
        </p>
        {/* "privacy policy" links to /privacy. Owner action required: that page's legal content
            must still be completed by a qualified lawyer before launch (see lib/content.ts PRIVACY). */}
        <p id={`${uid}-privacy`} className={styles.privacyNote}>
          {C.privacyNote.before} <Link href={C.privacyNote.linkHref}>{C.privacyNote.linkLabel}</Link>{" "}
          {C.privacyNote.after}
        </p>

        <button type="submit" className="btn btn-primary" disabled={status === "submitting"}>
          {status === "submitting" ? C.submittingLabel : C.continueLabel}
          {status !== "submitting" && <IconArrowRight width={18} height={18} />}
        </button>
      </form>
    );
  }

  return (
    <form key="step2" className={styles.form} onSubmit={submitStep2} noValidate aria-describedby={`${uid}-intro2`}>
      {stepHeader(C.step2Title)}
      <p id={`${uid}-intro2`} className={styles.intro}>
        {C.step2Intro}
      </p>
      {liveRegion}
      {honeypot}

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor={fieldId("destination")} className={styles.label}>
            {C.labels.destination} <span className={styles.req} aria-hidden="true">*</span>
          </label>
          <select
            id={fieldId("destination")}
            name="destination"
            required
            defaultValue=""
            className={styles.select}
            aria-required="true"
            aria-invalid={isInvalid("destination")}
            aria-describedby={describedBy("destination")}
          >
            <option value="" disabled>
              {C.placeholders.destination}
            </option>
            {C.destinationOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {fieldError("destination")}
        </div>

        <div className={styles.field}>
          <label htmlFor={fieldId("studyLevel")} className={styles.label}>
            {C.labels.studyLevel} <span className={styles.req} aria-hidden="true">*</span>
          </label>
          <select
            id={fieldId("studyLevel")}
            name="studyLevel"
            required
            defaultValue=""
            className={styles.select}
            aria-required="true"
            aria-invalid={isInvalid("studyLevel")}
            aria-describedby={describedBy("studyLevel")}
          >
            <option value="" disabled>
              {C.placeholders.studyLevel}
            </option>
            {C.studyLevelOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {fieldError("studyLevel")}
        </div>

        <div className={styles.field}>
          <label htmlFor={fieldId("intake")} className={styles.label}>
            {C.labels.intake} <span className={styles.req} aria-hidden="true">*</span>
          </label>
          <input
            id={fieldId("intake")}
            name="intake"
            type="text"
            required
            maxLength={60}
            placeholder={C.placeholders.intake}
            className={styles.input}
            aria-required="true"
            aria-invalid={isInvalid("intake")}
            aria-describedby={describedBy("intake")}
          />
          {fieldError("intake")}
        </div>

        <div className={styles.field}>
          <label htmlFor={fieldId("coBorrower")} className={styles.label}>
            {C.labels.coBorrower} <span className={styles.optional}>{C.optionalTag}</span>
          </label>
          <input
            id={fieldId("coBorrower")}
            name="coBorrower"
            type="text"
            maxLength={60}
            placeholder={C.placeholders.coBorrower}
            className={styles.input}
          />
        </div>

        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label htmlFor={fieldId("message")} className={styles.label}>
            {C.labels.message} <span className={styles.optional}>{C.optionalTag}</span>
          </label>
          <textarea
            id={fieldId("message")}
            name="message"
            rows={4}
            maxLength={2000}
            placeholder={C.placeholders.message}
            className={styles.textarea}
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={status === "submitting"}>
        {status === "submitting" ? C.submittingLabel : C.submitLabel}
        {status !== "submitting" && <IconArrowRight width={18} height={18} />}
      </button>
    </form>
  );
}
