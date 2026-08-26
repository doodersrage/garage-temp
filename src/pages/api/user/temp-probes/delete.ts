import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import { deleteUserTempProbe } from "../../../../lib/userTempConfig";

import {
  redirectUnlessEditor,
  requireHouseholdEditor,
} from "../../../../lib/householdAuth";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/temperature";

  const editor = await requireHouseholdEditor(user.id);
  const blocked = redirectUnlessEditor(editor, redirectTo, redirect);
  if (blocked) return blocked;

  const probeId = formData.get("probe_id")?.toString().trim() ?? "";

  if (!probeId) {
    return new Response("Probe id is required", { status: 400 });
  }

  const { error } = await deleteUserTempProbe(user.id, probeId);

  if (error) {
    return redirect(`${redirectTo}?probes_error=1`);
  }

  return redirect(`${redirectTo}?probe_deleted=1`);
};
