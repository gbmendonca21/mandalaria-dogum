import { getAuth } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
const call = (method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH") =>
  async (request: Request, context: unknown) => {
    // Password changes and resets must invalidate every revoked session immediately.
    // The SDK's signed session snapshot otherwise stays valid for its cache TTL.
    if (method === "GET" && new URL(request.url).pathname.replace(/\/+$/, "") === "/api/auth/get-session") {
      const url = new URL(request.url);
      url.searchParams.set("disableCookieCache", "true");
      request = new Request(url, request);
    }
    const handler = getAuth().handler()[method] as (request: Request, context: unknown) => Promise<Response>;
    return handler(request, context);
  };
export const GET = call("GET");
export const POST = call("POST");
export const PUT = call("PUT");
export const DELETE = call("DELETE");
export const PATCH = call("PATCH");
