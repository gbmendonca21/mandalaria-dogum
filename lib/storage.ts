import { AwsClient } from "aws4fetch";
import { env } from "cloudflare:workers";

export const MEDIA_BUCKET = "mandalaria-media";

export function getStorageClient() {
  if (
    !env.AWS_ACCESS_KEY_ID ||
    !env.AWS_SECRET_ACCESS_KEY ||
    !env.AWS_ENDPOINT_URL_S3 ||
    !env.AWS_REGION
  ) {
    return null;
  }

  const client = new AwsClient({
    service: "s3",
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  });
  const endpoint = env.AWS_ENDPOINT_URL_S3.replace(/\/$/, "");
  const objectUrl = (key: string) => `${endpoint}/${MEDIA_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
  return {
    get: (key: string) => client.fetch(objectUrl(key)),
    put: (key: string, body: Uint8Array, contentType: string) => client.fetch(objectUrl(key), {
      method: "PUT",
      headers: { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" },
      body: body as BodyInit,
    }),
  };
}
