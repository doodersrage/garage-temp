import type { NotifyPayload } from "./notify";

export type AlertTemplateMap = Partial<
  Record<string, { title?: string; body?: string }>
>;

export function interpolateTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = vars[key];
    return val != null ? String(val) : "";
  });
}

export function applyAlertTemplates(
  payload: NotifyPayload,
  templates: AlertTemplateMap,
): NotifyPayload {
  const kind = payload.kind ?? "generic";
  const tpl = templates[kind];
  if (!tpl) return payload;

  const vars = {
    title: payload.title,
    body: payload.body,
    kind,
  };

  return {
    ...payload,
    title: tpl.title ? interpolateTemplate(tpl.title, vars) : payload.title,
    body: tpl.body ? interpolateTemplate(tpl.body, vars) : payload.body,
  };
}

export function parseAlertTemplates(raw: unknown): AlertTemplateMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as AlertTemplateMap;
}
