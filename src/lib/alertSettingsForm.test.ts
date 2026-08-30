import { describe, expect, it } from "vitest";
import { DEFAULT_ALERT_SETTINGS, type AlertSettings } from "./alerts";
import type { AlertRule } from "./alertRules";
import type { Entitlements } from "./entitlements";
import {
  buildAlertSettingsFromFormData,
  objectToFormData,
  prepareAlertSettingsFormData,
} from "./alertSettingsForm";

const proEntitlements: Entitlements = {
  tier: "pro",
  canDownloadCsv: true,
  canUseSms: true,
  canUsePush: true,
  canUseOutboundWebhook: true,
  canCreateShareLinks: true,
  canUseClaimsPack: true,
  canUsePortfolio: true,
  canUseForecastAlerts: true,
  canUseNwsAlerts: true,
  maxDevices: 24,
  maxOwnedHouseholds: 50,
  historyDays: 365,
};

const freeEntitlements: Entitlements = {
  tier: "free",
  canDownloadCsv: false,
  canUseSms: false,
  canUsePush: false,
  canUseOutboundWebhook: false,
  canCreateShareLinks: false,
  canUseClaimsPack: false,
  canUsePortfolio: false,
  canUseForecastAlerts: false,
  canUseNwsAlerts: false,
  maxDevices: 2,
  maxOwnedHouseholds: 1,
  historyDays: 7,
};

describe("buildAlertSettingsFromFormData", () => {
  it("persists checked booleans through Astro action round-trip", () => {
    const source = new FormData();
    source.set("alerts_enabled", "true");
    source.set("channel_email", "true");
    source.set("alert_email", "alerts@example.com");
    source.set("freeze_threshold_f", "33");
    source.set("alert_rules_json", "[]");
    source.set("alert_playbooks_json", "[]");
    source.set("channel_severity_json", "{}");
    source.set("alert_templates_json", "{}");
    source.set("space_channel_routing_json", "{}");

    const prepared = prepareAlertSettingsFormData(source);
    const roundTrip = objectToFormData(
      Object.fromEntries(prepared.entries()) as Record<string, unknown>,
    );
    const settings = buildAlertSettingsFromFormData(
      roundTrip,
      DEFAULT_ALERT_SETTINGS,
      proEntitlements,
    );

    expect(settings.enabled).toBe(true);
    expect(settings.channelEmail).toBe(true);
    expect(settings.email).toBe("alerts@example.com");
    expect(settings.freezeThresholdF).toBe(33);
  });

  it("treats omitted checkboxes as off after prepareAlertSettingsFormData", () => {
    const existing = {
      ...DEFAULT_ALERT_SETTINGS,
      enabled: true,
      channelEmail: true,
      email: "keep@example.com",
    };
    const source = new FormData();
    source.set("alert_email", "keep@example.com");
    source.set("freeze_threshold_f", "32");
    source.set("alert_rules_json", "[]");
    source.set("alert_playbooks_json", "[]");
    source.set("channel_severity_json", "{}");
    source.set("alert_templates_json", "{}");
    source.set("space_channel_routing_json", "{}");

    const prepared = prepareAlertSettingsFormData(source);
    const settings = buildAlertSettingsFromFormData(
      prepared,
      existing,
      proEntitlements,
    );

    expect(settings.enabled).toBe(false);
    expect(settings.channelEmail).toBe(false);
    expect(settings.email).toBe("keep@example.com");
  });

  it("preserves existing values when optional text keys are absent", () => {
    const existing = {
      ...DEFAULT_ALERT_SETTINGS,
      email: "saved@example.com",
      discordWebhookUrl: "https://discord.test/hook",
      freezeThresholdF: 31,
    };
    const source = new FormData();
    source.set("alerts_enabled", "true");
    source.set("alert_rules_json", "[]");
    source.set("alert_playbooks_json", "[]");

    const settings = buildAlertSettingsFromFormData(
      prepareAlertSettingsFormData(source),
      existing,
      proEntitlements,
    );

    expect(settings.email).toBe("saved@example.com");
    expect(settings.discordWebhookUrl).toBe("https://discord.test/hook");
    expect(settings.freezeThresholdF).toBe(31);
  });

  it("preserves JSON blobs when keys are missing from partial saves", () => {
    const alertRules: AlertRule[] = [
      {
        id: "rule-1",
        enabled: true,
        name: "Garage freeze",
        all: [{ type: "temp_below", value: 32, labelIncludes: "Garage" }],
      },
    ];
    const existing: AlertSettings = {
      ...DEFAULT_ALERT_SETTINGS,
      alertRules,
      channelSeverity: { threshold: ["email", "discord"] },
    };
    const source = new FormData();
    source.set("alerts_enabled", "true");

    const settings = buildAlertSettingsFromFormData(
      prepareAlertSettingsFormData(source),
      existing,
      proEntitlements,
    );

    expect(settings.alertRules).toEqual(alertRules);
    expect(settings.channelSeverity).toEqual(existing.channelSeverity);
  });

  it("gates pro-only channels by entitlements", () => {
    const source = new FormData();
    source.set("channel_sms", "true");
    source.set("channel_push", "true");
    source.set("sms_phone", "+15551234567");

    const settings = buildAlertSettingsFromFormData(
      prepareAlertSettingsFormData(source),
      DEFAULT_ALERT_SETTINGS,
      freeEntitlements,
    );

    expect(settings.channelSms).toBe(false);
    expect(settings.channelPush).toBe(false);
  });

  it("gates forecast and NWS alerts by entitlements", () => {
    const source = new FormData();
    source.set("forecast_freeze_enabled", "true");
    source.set("nws_freeze_alerts_enabled", "true");

    const freeSettings = buildAlertSettingsFromFormData(
      prepareAlertSettingsFormData(source),
      DEFAULT_ALERT_SETTINGS,
      freeEntitlements,
    );
    expect(freeSettings.forecastFreezeEnabled).toBe(false);
    expect(freeSettings.nwsFreezeAlertsEnabled).toBe(false);

    const proSettings = buildAlertSettingsFromFormData(
      prepareAlertSettingsFormData(source),
      DEFAULT_ALERT_SETTINGS,
      proEntitlements,
    );
    expect(proSettings.forecastFreezeEnabled).toBe(true);
    expect(proSettings.nwsFreezeAlertsEnabled).toBe(true);
  });
});
