import { S3Client } from "@aws-sdk/client-s3";
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

  return new S3Client({
    region: env.AWS_REGION,
    endpoint: env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}
