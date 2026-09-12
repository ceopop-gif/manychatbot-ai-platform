import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const webhook = await readFile(new URL("../app/api/webhooks/line/[webhookKey]/route.ts", import.meta.url), "utf8");
const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
const channels = await readFile(new URL("../app/api/channel-accounts/route.ts", import.meta.url), "utf8");

test("LINE webhook persists once and defers AI work", () => {
  assert.match(webhook, /event\.webhookEventId\?\.trim\(\) \|\| event\.message\?\.id/);
  assert.match(webhook, /\.onConflictDoNothing\(\)\.returning/);
  assert.match(webhook, /executionContext\.waitUntil\(background\)/);
  assert.match(webhook, /unreadCount: sql`\$\{conversations\.unreadCount\} \+ 1`/);
  assert.doesNotMatch(webhook, /unreadCount: 0,\n\s+status: "open"/);
  assert.match(schema, /uniqueIndex\("idx_messages_owner_external_event"\)/);
});

test("LINE connection is active only after webhook verification", () => {
  const pendingPosition = channels.indexOf('status: "pending"');
  const testPosition = channels.indexOf('/v2/bot/channel/webhook/test');
  const activePosition = channels.indexOf('status: "active"', testPosition);
  assert.ok(pendingPosition >= 0 && pendingPosition < testPosition);
  assert.ok(testPosition < activePosition);
  assert.match(channels, /testResult\.success !== true/);
});
