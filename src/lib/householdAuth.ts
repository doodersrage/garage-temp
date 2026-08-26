import {
  canEditHousehold,
  getUserHouseholdId,
  getUserHouseholdRole,
  type HouseholdRole,
} from "./households";

export type HouseholdEditorContext = {
  householdId: string;
  role: HouseholdRole;
};

export async function getHouseholdEditorContext(
  userId: string,
): Promise<HouseholdEditorContext | null> {
  const householdId = await getUserHouseholdId(userId);
  if (!householdId) return null;
  const role = await getUserHouseholdRole(userId, householdId);
  if (!role) return null;
  return { householdId, role };
}

export async function requireHouseholdEditor(
  userId: string,
): Promise<{ ok: true; ctx: HouseholdEditorContext } | { ok: false; error: string }> {
  const ctx = await getHouseholdEditorContext(userId);
  if (!ctx) {
    return { ok: false, error: "No household" };
  }
  if (!canEditHousehold(ctx.role)) {
    return { ok: false, error: "viewer" };
  }
  return { ok: true, ctx };
}

/** Redirect helper for form POST routes when the user is a viewer. */
export function redirectUnlessEditor(
  editor: Awaited<ReturnType<typeof requireHouseholdEditor>>,
  redirectTo: string,
  redirect: (url: string) => Response,
): Response | null {
  if (editor.ok) return null;
  if (editor.error === "viewer") {
    return redirect(`${redirectTo}?error=viewer`);
  }
  return redirect(`${redirectTo}?error=1`);
}
