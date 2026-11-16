import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "./lib/auth";

// O retorno do Google troca o verificador por uma sessão no domínio da loja.
// As demais visitas à vitrine continuam públicas e não consultam a autenticação.
export async function proxy(request: NextRequest) {
  if (!request.nextUrl.searchParams.has("neon_auth_session_verifier")) {
    return NextResponse.next();
  }
  return getAuth().middleware({ publicRoutes: ["/"] })(request);
}

export const config = { matcher: ["/"] };
