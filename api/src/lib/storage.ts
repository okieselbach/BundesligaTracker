import { BlobServiceClient } from "@azure/storage-blob";

const CONTAINER_NAME = "sync";

function getClient(): BlobServiceClient {
  const connStr = process.env.STORAGE_CONNECTION_STRING;
  if (!connStr) throw new Error("STORAGE_CONNECTION_STRING not configured");
  return BlobServiceClient.fromConnectionString(connStr);
}

function getContainer() {
  return getClient().getContainerClient(CONTAINER_NAME);
}

export async function uploadJson(blobPath: string, data: unknown): Promise<void> {
  const blob = getContainer().getBlockBlobClient(blobPath);
  const body = JSON.stringify(data);
  await blob.upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: { blobContentType: "application/json" },
  });
}

export async function downloadJson<T>(blobPath: string): Promise<T | null> {
  const blob = getContainer().getBlockBlobClient(blobPath);
  try {
    const response = await blob.download(0);
    const chunks: Buffer[] = [];
    if (response.readableStreamBody) {
      for await (const chunk of response.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf-8")) as T;
  } catch (err: unknown) {
    if (err instanceof Object && "statusCode" in err && (err as { statusCode: number }).statusCode === 404) {
      return null;
    }
    throw err;
  }
}

export async function blobExists(blobPath: string): Promise<boolean> {
  const blob = getContainer().getBlockBlobClient(blobPath);
  return blob.exists();
}

export async function countBlobsWithPrefix(prefix: string): Promise<number> {
  const container = getContainer();
  let count = 0;
  for await (const _blob of container.listBlobsFlat({ prefix })) {
    count++;
  }
  return count;
}
