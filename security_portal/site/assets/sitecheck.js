/* サイトのリスクチェック。公開DNSと証明書の公開記録（CT）だけを読み、サイトに攻撃を試みることはしない。
   collect() がネットワークから材料を集め、evaluate() が判定する（evaluate はネットワークに触れない） */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PortalSiteCheck = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- 入力 ----------

  function registrable(host, cfg) {
    const labels = host.split(".");
    const multi = cfg.multi_level_suffixes.some((s) => host.endsWith("." + s));
    return labels.slice(multi ? -3 : -2).join(".");
  }

  function normalize(input, cfg) {
    let raw = String(input || "").trim();
    if (!raw) return { ok: false, error: "サイトのアドレスを入れてください。" };
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = "https://" + raw;
    let url;
    try { url = new URL(raw); } catch (e) { return { ok: false, error: "アドレスの形が読み取れませんでした。例：https://www.example.co.jp/" }; }
    if (!/^https?:$/.test(url.protocol)) return { ok: false, error: "http または https のアドレスを入れてください。" };
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) return { ok: false, error: "IPアドレスではなく、ドメイン名（例：www.example.co.jp）を入れてください。" };
    if (!host.includes(".") || host.length > 253 || !/^[a-z0-9.-]+$/.test(host)) return { ok: false, error: "ドメイン名として読み取れませんでした。例：www.example.co.jp" };
    const domain = registrable(host, cfg);
    if (domain.split(".").length < 2) return { ok: false, error: "ドメイン名として読み取れませんでした。" };
    return { ok: true, host, domain };
  }

  // ---------- 返ってきたデータの読み取り ----------

  // TXTは引用符つき・複数の文字列に分かれて返ることがあるので、1本の文字列に戻す
  function cleanTxt(data) {
    const s = String(data).trim();
    const parts = s.match(/"((?:[^"\\]|\\.)*)"/g);
    if (!parts) return s;
    return parts.map((p) => p.slice(1, -1).replace(/\\(.)/g, "$1")).join("");
  }

  function parseDoh(json, type) {
    const codes = { TXT: 16, MX: 15, CAA: 257, CNAME: 5, A: 1 };
    if (!json || typeof json.Status !== "number") throw new Error("bad dns response");
    if (json.Status === 3) return [];
    if (json.Status !== 0) throw new Error("dns status " + json.Status);
    return (json.Answer || []).filter((a) => a.type === codes[type]).map((a) => (type === "TXT" ? cleanTxt(a.data) : String(a.data).trim()));
  }

  function issuerName(s) {
    const m = /(?:^|,\s*)O=("?)([^,"]+)\1/.exec(s || "");
    const cn = /(?:^|,\s*)CN=([^,]+)/.exec(s || "");
    return (m && m[2]) || (cn && cn[1]) || String(s || "");
  }

  function parseCrtsh(json) {
    if (!Array.isArray(json)) throw new Error("bad crt.sh response");
    return json.map((c) => ({
      names: String(c.name_value || "").split(/\s+/).concat(c.common_name ? [c.common_name] : []).filter(Boolean),
      issuer: issuerName(c.issuer_name),
      notBefore: c.not_before + (/Z$/.test(c.not_before) ? "" : "Z"),
      notAfter: c.not_after + (/Z$/.test(c.not_after) ? "" : "Z")
    }));
  }

  function parseCertspotter(json) {
    if (!Array.isArray(json)) throw new Error("bad certspotter response");
    return json.map((c) => ({
      names: c.dns_names || [],
      issuer: (c.issuer && (c.issuer.friendly_name || issuerName(c.issuer.name))) || "",
      notBefore: c.not_before,
      notAfter: c.not_after
    }));
  }

  // ---------- 判定 ----------

  function tokens(label) {
    return label.split(/[.-]/).map((t) => t.replace(/\d+$/, "")).filter(Boolean);
  }

  function flagHost(name, domain, cfg) {
    const left = name.slice(0, -(domain.length + 1));
    if (!left) return false;
    return tokens(left).some((t) => cfg.host_flags.includes(t));
  }

  function thirdParty(target, cfg) {
    const t = target.toLowerCase().replace(/\.$/, "");
    return cfg.third_party_cname.some((s) => t === s || t.endsWith("." + s));
  }

  function covers(certName, host) {
    const n = certName.toLowerCase();
    if (n === host) return true;
    if (n.startsWith("*.")) {
      const base = n.slice(2);
      return host.endsWith("." + base) && host.split(".").length === base.split(".").length + 1;
    }
    return false;
  }

  function fill(text, vars) {
    return String(text).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  }

  function item(cfg, code, vars) {
    const m = cfg.messages[code];
    return {
      code,
      status: m.status,
      title: fill(m.title, vars),
      found: fill(m.found, vars),
      why: m.why,
      todo: m.todo.slice(),
      link: m.link
    };
  }

  function ymd(iso) {
    const d = new Date(iso);
    return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
  }

  function evalSpf(cfg, domain, txt) {
    const spf = txt.filter((t) => /^v=spf1(\s|$)/i.test(t));
    if (!spf.length) return item(cfg, "spf_missing", { domain });
    if (spf.length > 1) return item(cfg, "spf_multiple", { domain, n: spf.length });
    const m = /(?:^|\s)([+~?-]?)all(?:\s|$)/i.exec(spf[0]);
    const all = m ? (m[1] || "+") + "all" : "（指定なし）";
    if (m && (m[1] === "" || m[1] === "+")) return item(cfg, "spf_pass_all", { domain, all });
    if (!m || m[1] === "?") return item(cfg, "spf_soft", { domain, all });
    return item(cfg, "spf_ok", { domain, all });
  }

  function dmarcTags(rec) {
    const tags = {};
    rec.split(";").forEach((part) => {
      const i = part.indexOf("=");
      if (i > 0) tags[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
    });
    return tags;
  }

  function evalDmarc(cfg, domain, recs) {
    const d = recs.filter((t) => /^v=DMARC1/i.test(t));
    if (!d.length) return item(cfg, "dmarc_missing", { domain });
    const tags = dmarcTags(d[0]);
    const p = (tags.p || "").toLowerCase();
    if (!["none", "quarantine", "reject"].includes(p)) return item(cfg, "dmarc_invalid", { domain });
    if (p === "none") return item(cfg, "dmarc_none", { domain, p });
    const pct = tags.pct != null ? Number(tags.pct) : 100;
    if (pct < 100) return item(cfg, "dmarc_partial", { domain, p, pct });
    return item(cfg, "dmarc_ok", { domain, p });
  }

  // raw: { host, domain, dns:{txt,dmarc,mx,caa}|null, certs:[...]|null, cnames:{host:target} }
  function evaluate(raw, cfg, now) {
    const t = now ? new Date(now).getTime() : Date.now();
    const { host, domain } = raw;
    const items = [];

    if (raw.dns) {
      items.push(evalSpf(cfg, domain, raw.dns.txt));
      items.push(evalDmarc(cfg, domain, raw.dns.dmarc));
      if (!raw.dns.mx.length) items.push(item(cfg, "mx_none", { domain }));
    } else {
      items.push(item(cfg, "dns_unknown", {}));
    }

    let hosts = [];
    if (raw.certs) {
      const current = raw.certs.filter((c) => new Date(c.notAfter).getTime() > t);
      const emu = current.filter((c) => /emudhra|emsign/i.test(c.issuer));
      if (emu.length) {
        const names = [...new Set(emu.flatMap((c) => c.names.map((n) => n.toLowerCase())))];
        items.push(item(cfg, "cert_emudhra", { list: names.join("、") }));
      }
      const mine = current.filter((c) => c.names.some((n) => covers(n, host)));
      if (!mine.length) {
        items.push(item(cfg, "cert_none", { host }));
      } else {
        const best = mine.slice().sort((a, b) => new Date(b.notAfter) - new Date(a.notAfter))[0];
        const days = (new Date(best.notAfter).getTime() - t) / 86400000;
        const vars = { host, issuer: best.issuer, date: ymd(best.notAfter) };
        items.push(item(cfg, days < cfg.expiring_days ? "cert_expiring" : "cert_ok", vars));
      }

      const names = [...new Set(current.flatMap((c) => c.names.map((n) => n.toLowerCase().replace(/^\*\./, ""))))]
        .filter((n) => n === domain || n.endsWith("." + domain))
        .sort();
      const cnames = raw.cnames || {};
      hosts = names.map((n) => ({
        name: n,
        flagged: flagHost(n, domain, cfg),
        cname: cnames[n] || "",
        thirdParty: cnames[n] ? thirdParty(cnames[n], cfg) : false
      }));
      const flagged = hosts.filter((h) => h.flagged);
      if (flagged.length) items.push(item(cfg, "hosts_flagged", { n: flagged.length, list: flagged.map((h) => h.name).join("、") }));
      if (hosts.length > cfg.many_hosts) items.push(item(cfg, "hosts_many", { n: hosts.length }));
      else if (hosts.length > 1 && !flagged.length) items.push(item(cfg, "hosts_listed", { n: hosts.length }));
      const tp = hosts.filter((h) => h.thirdParty);
      if (tp.length) items.push(item(cfg, "cname_thirdparty", { n: tp.length, list: tp.map((h) => `${h.name} → ${h.cname}`).join("、") }));
    } else {
      items.push(item(cfg, "cert_unknown", {}));
    }

    if (raw.dns) {
      const caa = raw.dns.caa.map((r) => (/issue(wild)?\s+"?([^"\s;]+)/i.exec(r) || [])[2]).filter(Boolean);
      items.push(caa.length ? item(cfg, "caa_ok", { list: [...new Set(caa)].join("、") }) : item(cfg, "caa_none", { domain }));
    }

    const order = { bad: 0, warn: 1, unknown: 2, ok: 3, info: 4 };
    items.sort((a, b) => order[a.status] - order[b.status]);
    const counts = { bad: 0, warn: 0, ok: 0, info: 0, unknown: 0 };
    items.forEach((i) => { counts[i.status]++; });
    return { host, domain, checkedAt: new Date(t).toISOString(), items, hosts, counts };
  }

  // ---------- ネットワーク ----------

  async function getJson(fetchFn, url, timeoutMs, headers) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const r = await fetchFn(url, { headers: headers || {}, signal: ctrl ? ctrl.signal : undefined, credentials: "omit", referrerPolicy: "no-referrer" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function dns(fetchFn, cfg, name, type) {
    let last;
    for (const r of cfg.doh) {
      try {
        const url = `${r.url}?name=${encodeURIComponent(name)}&type=${type}`;
        const json = await getJson(fetchFn, url, cfg.timeout_ms.dns, r.style === "cloudflare" ? { accept: "application/dns-json" } : {});
        return parseDoh(json, type);
      } catch (e) { last = e; }
    }
    throw last || new Error("dns failed");
  }

  async function certs(fetchFn, cfg, domain) {
    for (const src of cfg.ct) {
      try {
        if (src.style === "crtsh") {
          const q = (term) => `${src.url}?q=${encodeURIComponent(term)}&output=json&exclude=expired`;
          const [subs, apex] = await Promise.all([
            getJson(fetchFn, q("%." + domain), cfg.timeout_ms.ct),
            getJson(fetchFn, q(domain), cfg.timeout_ms.ct)
          ]);
          return parseCrtsh(subs.concat(apex));
        }
        if (src.style === "certspotter") {
          const url = `${src.url}?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names&expand=issuer`;
          return parseCertspotter(await getJson(fetchFn, url, cfg.timeout_ms.ct));
        }
      } catch (e) { /* 次の情報源へ */ }
    }
    return null;
  }

  async function pool(list, size, fn) {
    const out = new Array(list.length);
    let i = 0;
    const workers = Array.from({ length: Math.min(size, list.length) }, async () => {
      while (i < list.length) { const k = i++; out[k] = await fn(list[k]); }
    });
    await Promise.all(workers);
    return out;
  }

  // target: normalize() の結果。onStep(step, state) で進み具合を知らせる
  async function collect(target, cfg, opts = {}) {
    const fetchFn = opts.fetch || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null);
    const step = opts.onStep || (() => {});
    const raw = { host: target.host, domain: target.domain, dns: null, certs: null, cnames: {} };

    step("dns", "run");
    try {
      const [txt, dmarc, mx, caa] = await Promise.all([
        dns(fetchFn, cfg, target.domain, "TXT"),
        dns(fetchFn, cfg, "_dmarc." + target.domain, "TXT"),
        dns(fetchFn, cfg, target.domain, "MX"),
        dns(fetchFn, cfg, target.domain, "CAA")
      ]);
      raw.dns = { txt, dmarc, mx, caa };
      step("dns", "done");
    } catch (e) { step("dns", "fail"); }

    step("ct", "run");
    raw.certs = await certs(fetchFn, cfg, target.domain);
    step("ct", raw.certs ? "done" : "fail");

    if (raw.certs) {
      step("names", "run");
      const now = Date.now();
      const names = [...new Set(raw.certs.filter((c) => new Date(c.notAfter).getTime() > now)
        .flatMap((c) => c.names.map((n) => n.toLowerCase().replace(/^\*\./, ""))))]
        .filter((n) => n.endsWith("." + target.domain))
        .slice(0, cfg.max_cname_lookups);
      const res = await pool(names, 5, async (n) => {
        try { return (await dns(fetchFn, cfg, n, "CNAME"))[0] || ""; } catch (e) { return ""; }
      });
      names.forEach((n, i) => { if (res[i]) raw.cnames[n] = res[i].replace(/\.$/, ""); });
      step("names", "done");
    }
    return raw;
  }

  // ---------- 共有用の文 ----------

  function summaryLines(report, cfg) {
    return report.items
      .filter((i) => i.status === "bad" || i.status === "warn")
      .map((i) => `${cfg.status_labels[i.status]}：${i.title}`);
  }

  // 制作会社に送る確認依頼の文面（ドメイン名を含む）
  function vendorMemo(report, cfg) {
    const lines = report.items.filter((i) => i.status === "bad" || i.status === "warn");
    const out = [`${report.domain} のサイトとメールの設定を、外から見える公開情報（DNSと証明書の公開記録）で確かめたところ、次の点が見つかりました。`, "対応が必要かどうかと、対応する場合の予定を教えてください。", ""];
    lines.forEach((i, k) => {
      out.push(`${k + 1}. 【${cfg.status_labels[i.status]}】${i.title}`);
      out.push(`   ${i.found}`);
    });
    if (!lines.length) out.push("（対応が必要な項目は見つかりませんでした）");
    return out.join("\n");
  }

  return { normalize, registrable, cleanTxt, parseDoh, parseCrtsh, parseCertspotter, flagHost, thirdParty, covers, evaluate, collect, summaryLines, vendorMemo };
});
