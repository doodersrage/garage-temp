import { useEffect, useState } from "preact/hooks";
import { trackProductEvent } from "../lib/productAnalytics";

const ANDROID_TOPIC_MESSAGE =
  "Please send me a note when the ThermalTrace Android app is live on Google Play.";

function topicDefaultMessage(topic: string | null): string {
  if (topic === "android") return ANDROID_TOPIC_MESSAGE;
  return "";
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
      const formData = new FormData(e.target as HTMLFormElement);
      const response = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setIsError(true);
        setResponseMessage(data.message ?? "Something went wrong. Please try again.");
        return;
      }
      setIsError(false);
      setResponseMessage(data.message ?? "Message sent.");
      trackProductEvent("generate_lead", { form_id: "contact" });
      (e.target as HTMLFormElement).reset();
      setMessage("");
    } catch {
      setIsError(true);
      setResponseMessage("Something went wrong. Please try again.");
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
        <input class="form-input" type="text" name="name" id="name" placeholder="Your name" required />
      </div>
      <div class="form-field">
        <label class="form-label" for="email">
          Email<sup>*</sup>
        </label>
        <input class="form-input" type="email" name="email" id="email" placeholder="you@example.com" required />
      </div>
      <div class="form-field">
        <label class="form-label" for="message">
          Message<sup>*</sup>
        </label>
        <textarea
          class="form-textarea"
          name="message"
          id="message"
          placeholder="How can we help?"
          required
          value={message}
          onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
        />
      </div>
      <div class="form-field">
        <div class="cf-turnstile" data-sitekey={import.meta.env.TURNSTILE_SITE_KEY}></div>
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
