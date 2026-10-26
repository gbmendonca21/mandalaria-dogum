import { getChatGPTUser } from "../../chatgpt-auth";
import { database, errorResponse, json } from "../../../lib/neon";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return json({ authenticated: false, admin: false });
    const sql = database();
    const rows = await sql.query(
      "SELECT role FROM admin_memberships WHERE email = $1 LIMIT 1",
      [user.email.toLowerCase()],
    );
    return json({
      authenticated: true,
      email: user.email,
      displayName: user.displayName,
      admin: rows.length > 0,
      role: rows[0]?.role ?? null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
