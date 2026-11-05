import { getAuth } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
const call = (method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH") =>
  async (request: Request, context: unknown) => {
    const handler = getAuth().handler()[method] as (request: Request, context: unknown) => Promise<Response>;
    return handler(request, context);
  };
export const GET = call("GET");
export const POST = call("POST");
export const PUT = call("PUT");
export const DELETE = call("DELETE");
export const PATCH = call("PATCH");
