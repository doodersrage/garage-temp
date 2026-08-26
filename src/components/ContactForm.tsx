import { useState } from "preact/hooks";

export default function Form() {
  const [responseMessage, setResponseMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      const data = await response.json();
      if (!response.ok) {
        setIsError(true);
        setResponseMessage(data.message ?? "Something went wrong. Please try again.");
        return;
      }
      setIsError(false);
      setResponseMessage(data.message ?? "Message sent.");
      (e.target as HTMLFormElement).reset();
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
        <textarea class="form-textarea" name="message" id="message" placeholder="How can we help?" required />
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
