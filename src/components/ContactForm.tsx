import { useState } from "preact/hooks";

export default function Form() {
  const [responseMessage, setResponseMessage] = useState("");

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const response = await fetch("/api/contact", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      setResponseMessage(data.message ?? "Something went wrong. Please try again.");
      return;
    }
    if (data.message) {
      setResponseMessage(data.message);
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
      <button class="btn-primary" type="submit">Send message</button>
      {responseMessage && (
        <p class="alert-success">
          {responseMessage}
        </p>
      )}
    </form>
  );
}
