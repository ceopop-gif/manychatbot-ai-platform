import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { FileStorage } from "./types";

let client: S3Client | undefined;

function getConfig() {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket) throw new Error("S3_BUCKET is required");

  return {
    bucket,
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    region: process.env.S3_REGION?.trim() || "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  };
}

function getClient() {
  const config = getConfig();
  client ??= new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        }
      : undefined,
  });
  return { client, bucket: config.bucket };
}

export function getStorage(): FileStorage {
  return {
    async put(key, value, contentType) {
      const { client: s3, bucket } = getClient();
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: new Uint8Array(value),
        ContentType: contentType,
      }));
    },
    async get(key) {
      const { client: s3, bucket } = getClient();
      try {
        const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!response.Body) return null;
        return {
          body: response.Body.transformToWebStream(),
          size: Number(response.ContentLength ?? 0),
        };
      } catch (error) {
        if (error instanceof NoSuchKey || (error as { name?: string }).name === "NotFound") return null;
        throw error;
      }
    },
    async delete(key) {
      const { client: s3, bucket } = getClient();
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}