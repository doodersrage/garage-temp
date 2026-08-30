import { useEffect, useState } from "preact/hooks";
import { trackProductEvent } from "../lib/productAnalytics";
import { CONTACT_HONEYPOT_FIELD, CONTACT_MAX_MESSAGE_CHARS } from "../lib/contactLimits";

const ANDROID_TOPIC_MESSAGE =
  "Please send me a note when the ThermalTrace Android app is live on Google Play.";

const SUCCESS_MESSAGE =
  "Thanks — we got your message. We usually reply within 1–2 business days.";

function topicDefaultMessage(topic: string | null): string {
  if (topic === "android") return ANDROID_TOPIC_MESSAGE;
  return "";
}

function resetTurnstile(): void {
  const api = (window as { turnstile?: { reset: () => void } }).turnstile;
  api?.reset();
}

export default function Form() {
  const [responseMessage, setResponseMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const seeded = topicDefaultMessage(params.get("topic"));
    if (seeded) setMessage(seeded);
  }, []);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResponseMessage("");
    setIsError(false);

    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const response = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setIsError(true);
        setResponseMessage(data.message ?? "Something went wrong. Please try again.");
        resetTurnstile();
        return;
      }
      setIsError(false);
      setResponseMessage(data.message ?? SUCCESS_MESSAGE);
      trackProductEvent("generate_lead", { form_id: "contact" });
      form.reset();
      setMessage("");
      resetTurnstile();
    } catch {
      setIsError(true);
      setResponseMessage("Something went wrong. Please try again.");
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form class="form-panel animate-blurred-fade-in" onSubmit={submit}>
      <div class="form-field">
        <label class="form-label" for="name">
          Name<sup>*</sup>
        </label>
        <input
          class="form-input"
          type="text"
          name="name"
          id="name"
          placeholder="Your name"
          autoComplete="name"
          required
          maxLength={120}
        />
      </div>
      <div class="form-field">
        <label class="form-label" for="email">
          Email<sup>*</sup>
        </label>
        <input
          class="form-input"
          type="email"
          name="email"
          id="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          maxLength={254}
        />
      </div>
      <div class="form-field">
        <label class="form-label" for="message">
          Message<sup>*</sup>
        </label>
        <textarea
          class="form-textarea"
          name="message"
          id="message"
          placeholder="How can we help? For probe issues, include board, sensors, expected vs observed readings, and feed URLs."
          required
          minLength={10}
          maxLength={CONTACT_MAX_MESSAGE_CHARS}
          value={message}
          onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
        />
      </div>
      <div class="sr-only" aria-hidden="true">
        <label for={CONTACT_HONEYPOT_FIELD}>Company</label>
        <input
          type="text"
          name={CONTACT_HONEYPOT_FIELD}
          id={CONTACT_HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div class="form-field">
        <div class="cf-turnstile" data-sitekey={import.meta.env.TURNSTILE_SITE_KEY}></div>
        <p class="form-hint mb-0">Protected by Cloudflare Turnstile.</p>
      </div>
      <button class="btn-primary" type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send message"}
      </button>
      {responseMessage && (
        <p class={isError ? "alert-warning" : "alert-success"} role="status">
          {responseMessage}
        </p>
      )}
    </form>
  );
}
