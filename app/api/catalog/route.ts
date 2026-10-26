import { getCatalog } from "../../../lib/catalog";
import { errorResponse, json } from "../../../lib/neon";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await getCatalog());
  } catch (error) {
    return errorResponse(error);
  }
}
