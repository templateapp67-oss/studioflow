import assert from "node:assert/strict";
import {
  assertSafeOutboundUrl,
  safeOutboundFetch,
  SsrfBlockedError,
} from "../_shared/safeOutbound.ts";

const blocked = [
  ["http://example.com/", "http scheme"],
  ["ftp://example.com/", "ftp scheme"],
  ["file:///etc/passwd", "file scheme"],
  ["ws://example.com/", "ws scheme"],
  ["https://", "no host"],
  ["https://user:pass@example.com/", "userinfo"],
  ["https://localhost/", "localhost"],
  ["https://localhost./", "trailing-dot localhost"],
  ["https://api.localhost/", "localhost subdomain"],
  ["https://127.0.0.1/", "loopback v4"],
  ["https://127.1/", "loopback shorthand"],
  ["https://0.0.0.0/", "this-host v4"],
  ["https://2130706433/", "decimal 127.0.0.1"],
  ["https://0x7f000001/", "hex 127.0.0.1"],
  ["https://10.0.0.1/", "RFC1918 10/8"],
  ["https://172.16.0.1/", "RFC1918 172.16/12 start"],
  ["https://172.31.255.255/", "RFC1918 172.16/12 end"],
  ["https://192.168.0.1/", "RFC1918 192.168/16"],
  ["https://169.254.169.254/latest/meta-data", "link-local cloud metadata"],
  ["https://100.64.0.1/", "CGNAT start"],
  ["https://100.127.255.255/", "CGNAT end"],
  ["https://192.0.2.1/", "TEST-NET-1"],
  ["https://198.51.100.5/", "TEST-NET-2"],
  ["https://203.0.113.9/", "TEST-NET-3"],
  ["https://198.18.0.1/", "benchmarking range"],
  ["https://224.0.0.1/", "multicast"],
  ["https://240.0.0.1/", "reserved"],
  ["https://[::]/", "IPv6 unspecified"],
  ["https://[::1]/", "IPv6 loopback"],
  ["https://[::ffff:127.0.0.1]/", "v4-mapped loopback"],
  ["https://[::ffff:10.1.2.3]/", "v4-mapped RFC1918"],
  ["https://[64:ff9b::7f00:1]/", "NAT64 of 127.0.0.1"],
  ["https://[2002:0a00::1]/", "6to4 of 10.0.0.0"],
  ["https://[2001:db8::1]/", "IPv6 documentation range"],
  ["https://[fd00::1]/", "unique local"],
  ["https://[fe80::1]/", "link-local"],
  ["https://[ff02::1]/", "multicast"],
  ["https://[100::1]/", "discard-only"],
] as const;

for (const [input, label] of blocked) {
  Deno.test(`safeOutbound: blocks ${label}`, () => {
    assert.throws(() => assertSafeOutboundUrl(input), SsrfBlockedError);
  });
}

const allowed = [
  "https://example.com/path?q=1",
  "https://project.supabase.co/storage/v1/object/public/site-images/x.webp",
  "https://example.com./",
  "https://172.15.255.255/",
  "https://11.0.0.1/",
  "https://100.63.255.255/",
  "https://[::ffff:8.8.8.8]/",
  "https://[2001:4860:4860::8888]/",
  "https://[2606:4700:4700::1111]/",
  "https://api.resend.com/emails",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini:generateContent",
] as const;

for (const input of allowed) {
  Deno.test(`safeOutbound: allows ${input}`, () => {
    const url = assertSafeOutboundUrl(input);
    assert.equal(url.protocol, "https:");
  });
}

Deno.test("safeOutboundFetch: guard runs before fetch and forces redirect manual", async () => {
  let calls = 0;
  let seenRedirect: unknown;
  const spy = ((_input: unknown, init?: RequestInit) => {
    calls += 1;
    seenRedirect = init?.redirect;
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as typeof fetch;
  await assert.rejects(
    () => safeOutboundFetch("http://169.254.169.254/latest", {}, spy),
    SsrfBlockedError,
  );
  assert.equal(calls, 0, "blocked URL never reaches the network");
  const response = await safeOutboundFetch("https://api.resend.com/emails", { method: "POST" }, spy);
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(seenRedirect, "manual");
});

Deno.test("safeOutboundFetch: a redirect response comes back, never followed", async () => {
  const redirecting = ((_input: unknown, _init?: RequestInit) =>
    Promise.resolve(
      new Response(null, { status: 301, headers: { Location: "https://169.254.169.254/" } }),
    )) as typeof fetch;
  const response = await safeOutboundFetch("https://example.com/", {}, redirecting);
  assert.equal(response.status, 301, "3xx is surfaced to the caller, not followed");
});
