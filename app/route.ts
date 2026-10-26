import siteHtml from "../legacy-index.html?raw";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(siteHtml, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
