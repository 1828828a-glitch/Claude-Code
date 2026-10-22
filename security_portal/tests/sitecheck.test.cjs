// サイトのリスクチェックの判定と、ネットワークへの問い合わせ先を確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const C = require("../site/assets/sitecheck.js");
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "../site/data/sitecheck.json"), "utf8"));
const NOW = "2026-10-22T09:00:00Z";

const base = (over = {}) => Object.assign({
  host: "www.example.co.jp",
  domain: "example.co.jp",
  dns: { txt: ["v=spf1 include:_spf.example.jp -all"], dmarc: ["v=DMARC1; p=reject"], mx: ["10 mx.example.co.jp."], caa: [] },
  certs: [{ names: ["www.example.co.jp", "example.co.jp"], issuer: "Let's Encrypt", notBefore: "2026-10-01T00:00:00Z", notAfter: "2026-12-30T00:00:00Z" }],
  cnames: {}
}, over);
const codes = (r) => r.items.map((i) => i.code);
const status = (r, code) => r.items.find((i) => i.code === code).status;

test("入力：URLでもドメインでも、ホストと登録ドメインに直す", () => {
  assert.deepEqual(C.normalize("https://www.example.co.jp/news?id=1", cfg), { ok: true, host: "www.example.co.jp", domain: "example.co.jp" });
  assert.deepEqual(C.normalize("Shop.Example.com", cfg), { ok: true, host: "shop.example.com", domain: "example.com" });
  assert.deepEqual(C.normalize("example.jp", cfg), { ok: true, host: "example.jp", domain: "example.jp" });
  assert.equal(C.normalize("例え.jp", cfg).ok, true, "日本語ドメインはpunycodeにして受け付ける");
});

test("入力：IPアドレス・1語だけ・http以外は受け付けない", () => {
  ["192.168.0.1", "localhost", "ftp://example.jp", "", "http://[::1]/"].forEach((x) => assert.equal(C.normalize(x, cfg).ok, false, x));
});

test("TXTの引用符と分割をつなぎ直す", () => {
  assert.equal(C.cleanTxt('"v=spf1 include:a.example " "-all"'), "v=spf1 include:a.example -all");
  assert.equal(C.cleanTxt("v=DMARC1; p=none"), "v=DMARC1; p=none");
});

test("SPF：なし・複数・+all・?all・-all", () => {
  const r = (txt) => C.evaluate(base({ dns: Object.assign(base().dns, { txt }) }), cfg, NOW);
  assert.equal(status(r([]), "spf_missing"), "bad");
  assert.equal(status(r(["v=spf1 -all", "v=spf1 ~all"]), "spf_multiple"), "warn");
  assert.equal(status(r(["v=spf1 +a include:x.example all"]), "spf_pass_all"), "bad");
  assert.equal(status(r(["v=spf1 +a:mail.example ?all"]), "spf_soft"), "warn");
  assert.equal(status(r(["v=spf1 +a:sv.example +mx ~all"]), "spf_ok"), "ok", "+a: は all ではない");
});

test("DMARC：なし・p=none・pct<100・reject", () => {
  const r = (dmarc) => C.evaluate(base({ dns: Object.assign(base().dns, { dmarc }) }), cfg, NOW);
  assert.equal(status(r([]), "dmarc_missing"), "bad");
  assert.equal(status(r(["v=DMARC1; p=none; rua=mailto:x@example.jp"]), "dmarc_none"), "warn");
  assert.equal(status(r(["v=DMARC1; p=quarantine; pct=50"]), "dmarc_partial"), "warn");
  assert.equal(status(r(["v=DMARC1;p=reject"]), "dmarc_ok"), "ok");
  assert.equal(status(r(["v=DMARC1; rua=mailto:x@example.jp"]), "dmarc_invalid"), "warn");
});

test("証明書：eMudhra（emSign）を見つけたら要対応", () => {
  const rep = C.evaluate(base({ certs: [{ names: ["www.example.co.jp"], issuer: "eMudhra Technologies Limited", notBefore: "2026-01-01T00:00:00Z", notAfter: "2027-01-01T00:00:00Z" }] }), cfg, NOW);
  assert.equal(status(rep, "cert_emudhra"), "bad");
  assert.equal(rep.items[0].code, "cert_emudhra", "要対応が先頭に来る");
});

test("証明書：期限が近い・見つからない・ワイルドカードで覆われる", () => {
  const soon = C.evaluate(base({ certs: [{ names: ["www.example.co.jp"], issuer: "X", notBefore: "2026-08-01T00:00:00Z", notAfter: "2026-11-01T00:00:00Z" }] }), cfg, NOW);
  assert.ok(codes(soon).includes("cert_expiring"));
  const none = C.evaluate(base({ certs: [{ names: ["shop.example.co.jp"], issuer: "X", notBefore: "2026-08-01T00:00:00Z", notAfter: "2027-01-01T00:00:00Z" }] }), cfg, NOW);
  assert.ok(codes(none).includes("cert_none"));
  const wild = C.evaluate(base({ certs: [{ names: ["*.example.co.jp"], issuer: "X", notBefore: "2026-08-01T00:00:00Z", notAfter: "2027-01-01T00:00:00Z" }] }), cfg, NOW);
  assert.ok(codes(wild).includes("cert_ok"));
  const expired = C.evaluate(base({ certs: [{ names: ["www.example.co.jp"], issuer: "X", notBefore: "2025-01-01T00:00:00Z", notAfter: "2026-01-01T00:00:00Z" }] }), cfg, NOW);
  assert.ok(codes(expired).includes("cert_none"), "期限切れの証明書は数えない");
});

test("名前：テスト用・期間限定らしき名前と、外部サービスを指す名前を拾う", () => {
  const rep = C.evaluate(base({
    certs: base().certs.concat([
      { names: ["campaign2024.example.co.jp", "stg-shop.example.co.jp", "shop.example.co.jp", "testimonial.example.co.jp"], issuer: "X", notBefore: "2026-08-01T00:00:00Z", notAfter: "2027-01-01T00:00:00Z" }
    ]),
    cnames: { "campaign2024.example.co.jp": "foo.netlify.app.", "shop.example.co.jp": "shops.myshopify.com" }
  }), cfg, NOW);
  const flagged = rep.hosts.filter((h) => h.flagged).map((h) => h.name);
  assert.deepEqual(flagged.sort(), ["campaign2024.example.co.jp", "stg-shop.example.co.jp"], "testimonial は test ではない");
  assert.equal(status(rep, "hosts_flagged"), "warn");
  assert.equal(status(rep, "cname_thirdparty"), "warn");
  assert.equal(rep.hosts.filter((h) => h.thirdParty).length, 2);
});

test("問い合わせに失敗した項目は「確認できず」にし、安全とは言わない", () => {
  const rep = C.evaluate(base({ dns: null, certs: null }), cfg, NOW);
  assert.deepEqual(codes(rep).sort(), ["cert_unknown", "dns_unknown"]);
  assert.equal(rep.counts.ok, 0);
});

test("サンプルのデータは、要対応・要確認を含む見本になっている", () => {
  const s = cfg.sample;
  const t = C.normalize(s.input, cfg);
  const rep = C.evaluate(Object.assign({ host: t.host, domain: t.domain }, s), cfg, s.now);
  assert.ok(rep.counts.warn >= 2);
  assert.ok(rep.hosts.some((h) => h.flagged));
  assert.ok(C.vendorMemo(rep, cfg).includes("example.jp"));
});

test("collect：設定した問い合わせ先にだけ、GETで問い合わせる", async () => {
  const seen = [];
  const allowed = cfg.doh.map((d) => d.url).concat(cfg.ct.map((c) => c.url));
  const fakeFetch = async (url, init) => {
    seen.push({ url, init });
    const u = new URL(url);
    if (u.hostname === "dns.google") {
      const name = u.searchParams.get("name");
      const type = u.searchParams.get("type");
      const ans = { TXT: name.startsWith("_dmarc.") ? '"v=DMARC1; p=none"' : '"v=spf1 -all"', MX: "10 mx.example.co.jp.", CAA: '0 issue "letsencrypt.org"', CNAME: "foo.github.io." }[type];
      const code = { TXT: 16, MX: 15, CAA: 257, CNAME: 5 }[type];
      return { ok: true, json: async () => ({ Status: 0, Answer: [{ type: code, data: ans }] }) };
    }
    if (u.hostname === "crt.sh") {
      return { ok: true, json: async () => [{ issuer_name: "C=US, O=Let's Encrypt, CN=R12", common_name: "www.example.co.jp", name_value: "www.example.co.jp\nlp.example.co.jp", not_before: "2026-10-01T00:00:00", not_after: "2099-12-30T00:00:00" }] };
    }
    throw new Error("unexpected " + url);
  };
  const steps = [];
  const raw = await C.collect({ host: "www.example.co.jp", domain: "example.co.jp" }, cfg, { fetch: fakeFetch, onStep: (s, st) => steps.push(s + ":" + st) });
  seen.forEach(({ url, init }) => {
    assert.ok(allowed.some((a) => url.startsWith(a)), url);
    assert.equal(init.method, undefined, "GETだけ");
    assert.equal(init.credentials, "omit");
  });
  assert.deepEqual(steps, ["dns:run", "dns:done", "ct:run", "ct:done", "names:run", "names:done"]);
  assert.equal(raw.dns.caa[0], '0 issue "letsencrypt.org"');
  assert.equal(raw.cnames["lp.example.co.jp"], "foo.github.io");
  const rep = C.evaluate(raw, cfg);
  assert.ok(codes(rep).includes("caa_ok"));
  assert.ok(codes(rep).includes("cname_thirdparty"));
});

test("collect：DNSが全部失敗しても止まらず、証明書の確認は続ける", async () => {
  const fakeFetch = async (url) => {
    if (url.includes("crt.sh")) return { ok: true, json: async () => [] };
    return { ok: false, status: 503, json: async () => ({}) };
  };
  const raw = await C.collect({ host: "www.example.co.jp", domain: "example.co.jp" }, cfg, { fetch: fakeFetch });
  assert.equal(raw.dns, null);
  assert.deepEqual(raw.certs, []);
});
