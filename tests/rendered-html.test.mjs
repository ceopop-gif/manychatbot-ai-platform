import assert from "node:assert/strict";
import { readFile, unlink, writeFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders the public ChatMarathon landing page without starter preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  const testWorkerUrl = new URL(`../dist/server/index.test-${process.pid}-${Date.now()}.mjs`, import.meta.url);
  const source = await readFile(workerUrl, "utf8");
  await writeFile(testWorkerUrl, source.replace('import { env } from "cloudflare:workers";', "const env = {};"));
  try {
    const { default: worker } = await import(testWorkerUrl.href);
    const response = await worker.fetch(
      new Request("http://localhost/", {
        headers: {
          accept: "text/html",
          "oai-authenticated-user-id": "test-user",
          "oai-authenticated-user-email": "test@example.com",
        },
      }),
      {
        ASSETS: {
          fetch: async () => new Response("Not found", { status: 404 }),
        },
      },
      {
        waitUntil() {},
        passThroughOnException() {},
      },
    );
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get("content-type") ?? "",
      /^text\/html\b/i,
    );
    const html = await response.text();
    assert.match(html, /ChatMarathon/);
    assert.match(html, /MULTI LINE OA \+ AI/);
    assert.match(html, /เข้าสู่ระบบ/);
    assert.match(html, /href=["']\/admin["']/);
    assert.doesNotMatch(html, developmentPreviewMeta);
  } finally {
    await unlink(testWorkerUrl);
  }
});
