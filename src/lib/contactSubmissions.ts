import { createServerClient } from "./supabase";

export type ContactSubmission = {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
  status: string;
};

export type PaginatedContactSubmissions = {
  submissions: ContactSubmission[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  error: string | null;
};

export type ContactFilters = {
  status?: string;
  search?: string;
};

export const CONTACTS_PAGE_SIZE = 20;

const CONTACTS_SELECT = "id, name, email, message, created_at, status";

export function formatContactTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function getContactMessageText(message: string): string {
  const trimmed = message.trim();
  if (!trimmed.startsWith('"') && !trimmed.startsWith("{")) {
    return message;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "string") {
      return parsed;
    }
  } catch {
    // Fall through to raw message.
  }

  return message;
}

export async function fetchContactSubmissions(
  page = 1,
  pageSize = CONTACTS_PAGE_SIZE,
  filters: ContactFilters = {},
): Promise<PaginatedContactSubmissions> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServerClient();
  let query = supabase.from("contacts").select(CONTACTS_SELECT, { count: "exact" });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `name.ilike.${term},email.ilike.${term},message.ilike.${term}`,
    );
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return {
      submissions: [],
      page: safePage,
      pageSize,
      totalCount: 0,
      totalPages: 0,
      error: error.message,
    };
  }

  const totalCount = count ?? 0;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

  return {
    submissions: (data ?? []) as ContactSubmission[],
    page: safePage,
    pageSize,
    totalCount,
    totalPages,
    error: null,
  };
}

const EXPORT_BATCH_SIZE = 1000;

export async function fetchAllContactSubmissions(): Promise<{
  submissions: ContactSubmission[];
  error: string | null;
}> {
  const supabase = createServerClient();
  const submissions: ContactSubmission[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("contacts")
      .select(CONTACTS_SELECT)
      .order("created_at", { ascending: false })
      .range(from, from + EXPORT_BATCH_SIZE - 1);

    if (error) {
      return { submissions: [], error: error.message };
    }

    if (!data || data.length === 0) {
      break;
    }

    submissions.push(...(data as ContactSubmission[]));

    if (data.length < EXPORT_BATCH_SIZE) {
      break;
    }

    from += EXPORT_BATCH_SIZE;
  }

  return { submissions, error: null };
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildContactsCsv(submissions: ContactSubmission[]): string {
  const headers = ["submitted_at", "name", "email", "status", "message"];

  const rows = submissions.map((submission) =>
    [
      new Date(submission.created_at).toISOString(),
      submission.name,
      submission.email,
      submission.status,
      getContactMessageText(submission.message),
    ]
      .map(escapeCsvField)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}
