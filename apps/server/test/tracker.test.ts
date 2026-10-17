import { test } from "node:test";
import { strict as assert } from "node:assert";
import { isGrabUrl, isExpired } from "../src/index.js";
test("accepts supported Grab share URLs only", () => {
  assert.equal(isGrabUrl("https://app.grab.com/s/abc123"), true);
  assert.equal(isGrabUrl("https://sharelocation.grab.com/o/abc123"), true);
  assert.equal(isGrabUrl("https://evil.example/s/abc123"), false);
  assert.equal(isGrabUrl("http://app.grab.com/s/abc123"), false);
  assert.equal(isGrabUrl("https://app.grab.com/s/abc123.evil"), false);
  assert.equal(
    isGrabUrl("https://app.grab.com/s/abc123?next=https://evil.example"),
    false,
  );
  assert.equal(isGrabUrl("https://app.grab.com/s/abc123#fragment"), false);
  assert.equal(isGrabUrl("https://app.grab.com:443/s/abc123"), false);
  assert.equal(isGrabUrl("https://user@app.grab.com/s/abc123"), false);
  assert.equal(
    isGrabUrl("https://sharelocation.grab.com.evil/o/abc123"),
    false,
  );
});
test("poller expiry is terminal at 90 minutes", () => {
  const now = Date.now();
  assert.equal(
    isExpired(new Date(now - 90 * 60 * 1000).toISOString(), now),
    true,
  );
  assert.equal(
    isExpired(new Date(now - 89 * 60 * 1000).toISOString(), now),
    false,
  );
});
