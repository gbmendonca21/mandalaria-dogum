import { getAuth } from "../../../lib/auth";
import { database, errorResponse, json } from "../../../lib/neon";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: session } = await getAuth().getSession({ query: { disableCookieCache: "true" } });
    const user = session?.user;
    if (!user) return json({ authenticated: false, admin: false });
    const sql = database();
    const rows = await sql.query(
      "SELECT role, email_verification_required FROM admin_memberships WHERE email = $1 LIMIT 1",
      [user.email.toLowerCase()],
    );
    const emailVerificationRequired = rows[0]?.role !== "owner" || rows[0]?.email_verification_required !== false;
    return json({
      authenticated: true,
      emailVerified: user.emailVerified,
      emailVerificationRequired,
      email: user.email,
      displayName: user.name || user.email,
      admin: (user.emailVerified || !emailVerificationRequired) && rows.length > 0,
      role: rows[0]?.role ?? null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
