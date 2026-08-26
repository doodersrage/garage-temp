import type { IngestStatRow } from "./ingestStats";

export type IngestAbuseRow = IngestStatRow & {
  errorRate: number;
  total: number;
};

export function flagIngestAbuse(rows: IngestStatRow[], minTotal = 5): IngestAbuseRow[] {
  return rows
    .map((row) => {
      const total = row.success_count + row.error_count;
      const errorRate = total > 0 ? row.error_count / total : 0;
      return { ...row, total, errorRate };
    })
    .filter((row) => row.total >= minTotal && row.errorRate >= 0.5)
    .sort((a, b) => b.errorRate - a.errorRate);
}
