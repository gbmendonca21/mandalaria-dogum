import { requireAdmin } from "../../../../lib/admin";
import { getCatalog } from "../../../../lib/catalog";
import { errorResponse, json } from "../../../../lib/neon";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
    return json(await getCatalog(true));
  } catch (error) {
    return errorResponse(error);
  }
}
