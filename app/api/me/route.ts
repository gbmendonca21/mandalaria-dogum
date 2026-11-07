import { getAuth } from "../../../lib/auth";
import { database, errorResponse, json } from "../../../lib/neon";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: session } = await getAuth().getSession();
    const user = session?.user;
    if (!user) return json({ authenticated: false, admin: false });
    const sql = database();
    const rows = await sql.query(
      "SELECT role FROM admin_memberships WHERE email = $1 LIMIT 1",
      [user.email.toLowerCase()],
    );
    return json({
      authenticated: true,
      emailVerified: user.emailVerified,
      email: user.email,
      displayName: user.name || user.email,
      admin: user.emailVerified && rows.length > 0,
      role: rows[0]?.role ?? null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
