import { getRuntimeEnv } from "./runtimeEnv";

export type PlanPriceDisplay = {
  monthly: string | null;
  annual: string | null;
  annualMonthlyEquivalent: string | null;
  annualSavingsPct: number | null;
};

function parseDisplayAmount(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const value = Number(raw.trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function buildPriceDisplay(monthlyRaw?: string, annualRaw?: string): PlanPriceDisplay {
  const monthly = parseDisplayAmount(monthlyRaw);
  const annual = parseDisplayAmount(annualRaw);

  if (monthly == null && annual == null) {
    return {
      monthly: null,
      annual: null,
      annualMonthlyEquivalent: null,
      annualSavingsPct: null,
    };
  }

  const annualMonthlyEquivalent =
    annual != null ? formatUsd(annual / 12) : null;
  const annualSavingsPct =
    monthly != null && annual != null && monthly * 12 > 0
      ? Math.round((1 - annual / (monthly * 12)) * 100)
      : null;

  return {
    monthly: monthly != null ? formatUsd(monthly) : null,
    annual: annual != null ? formatUsd(annual) : null,
    annualMonthlyEquivalent,
    annualSavingsPct,
  };
}

export function getMemberPriceDisplay(): PlanPriceDisplay {
  return buildPriceDisplay(
    getRuntimeEnv("STRIPE_DISPLAY_MEMBER_MONTHLY"),
    getRuntimeEnv("STRIPE_DISPLAY_MEMBER_ANNUAL"),
  );
}

export function getProPriceDisplay(): PlanPriceDisplay {
  return buildPriceDisplay(
    getRuntimeEnv("STRIPE_DISPLAY_PRO_MONTHLY"),
    getRuntimeEnv("STRIPE_DISPLAY_PRO_ANNUAL"),
  );
}
