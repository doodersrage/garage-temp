import { describe, expect, it } from "vitest";
import { aboutJourneys, getJourneysForSlug } from "./aboutJourneys";
import { getAboutPage } from "./aboutPages";
import { getAboutFaqs } from "./aboutFaqs";
import { getExpandedAboutContent } from "./aboutExpandedContent";

describe("aboutJourneys", () => {
  it("defines five job-based journeys with resolvable steps", () => {
    expect(aboutJourneys).toHaveLength(5);
    for (const journey of aboutJourneys) {
      expect(journey.steps.length).toBeGreaterThanOrEqual(3);
      for (const step of journey.steps) {
        expect(getAboutPage(step.slug), step.slug).toBeTruthy();
      }
    }
  });

  it("returns journey context for cold-snap playbook", () => {
    const matches = getJourneysForSlug("cold-snap-playbook");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.nextStep?.slug).toBe("alert-channel-cookbook");
  });
});

describe("about gap guides", () => {
  it("ships content for new product playbooks", () => {
    for (const slug of [
      "cold-snap-playbook",
      "alert-channel-cookbook",
      "household-sharing-walkthrough",
    ]) {
      expect(getAboutPage(slug)?.parentSlug).toBe("accounts-and-dashboard");
      expect(getExpandedAboutContent(slug)?.length).toBeGreaterThan(2);
      expect(getAboutFaqs(slug).length).toBeGreaterThan(0);
    }
  });

  it("ships FAQs for high-intent journey steps", () => {
    for (const slug of [
      "freeze-protection-thresholds",
      "temperature-probe-case-study",
      "dht22-sensor-overview",
      "ingest-and-webhooks",
      "kit-qr-onboarding",
      "esp32-freeze-kit",
      "accounts-and-dashboard",
      "install-pwa",
    ]) {
      expect(getAboutFaqs(slug).length).toBeGreaterThan(0);
    }
  });
});
