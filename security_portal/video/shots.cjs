// 紹介動画に使う画面を、実際のサイトから撮る（390x844、2倍の解像度）
// 先に site/ をローカルで配信しておく: cd security_portal/site && python3 -m http.server 8765
// 使い方: node security_portal/video/shots.cjs [出力先]（既定は security_portal/video/shots）
const path = require("node:path");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const OUT = process.argv[2] || path.join(__dirname, "shots");
const BASE = process.env.BASE_URL || "http://127.0.0.1:8765/";
const PROFILE = { P1: "事業会社のブランド・マーケティング担当", P2: "10〜49", P3: "個人の判断で使っている", P4: ["顧客の個人情報（会員・応募者など）"] };
const ANS = { Q1: 2, Q2: 1, Q3: 2, Q4: 1, Q5: 0, Q6: 2, Q7: 2, Q8: 1, Q9: 2, Q10: 0, Q11: 1, Q12: 2, Q13: 0, Q14: 1, Q15: 1, Q16: 2, Q17: 2, Q18: 0 };

(async () => {
  require("node:fs").mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const hideNews = () => p.addStyleTag({ content: "#news-slot{display:none!important}" });
  const shot = (name) => p.screenshot({ path: `${OUT}/${name}.png` });
  // 見出しが固定ヘッダーの下に来るように少し戻してから撮る
  const at = async (sel, name, offset = 96) => {
    await p.evaluate(([s, o]) => { document.querySelector(s).scrollIntoView(); window.scrollBy(0, -o); }, [sel, offset]);
    await p.waitForTimeout(150);
    await shot(name);
  };
  const setState = (st) => p.evaluate((s) => sessionStorage.setItem("pac-portal:diag:v1", JSON.stringify(s)), st);

  await p.goto(BASE, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await shot("home");

  // 設問7（サイトの更新）の画面
  const partial = Object.fromEntries(Object.entries(ANS).slice(0, 6));
  await setState({ step: "quiz", p: 3, q: 6, profile: PROFILE, answers: partial, utm: {}, route: "neglect" });
  await p.goto(BASE + "#check"); await p.reload({ waitUntil: "networkidle" }); await hideNews();
  await p.waitForTimeout(200);
  await shot("question");

  // 結果（リスク指数68・レベル3）と放置シミュレーション
  await setState({ step: "result", p: 3, q: 17, profile: PROFILE, answers: ANS, utm: {}, route: "neglect" });
  await p.reload({ waitUntil: "networkidle" }); await hideNews();
  await p.waitForTimeout(200);
  await shot("result-status");
  await at("#guard-title", "result-guard");
  await at("#weak-title", "result-weak");
  await at("#sim-title", "sim-neglect");
  await p.click("[data-act=route][data-route=fixed]");
  await p.waitForTimeout(150); await hideNews();
  await at("#sim-title", "sim-fixed");

  // 止める？通す？
  await p.goto(BASE + "#game"); await p.waitForTimeout(200); await hideNews();
  await shot("game-title");
  await p.click("[data-act=game-start]"); await p.waitForTimeout(150);
  await shot("game-card");
  await p.click("[data-act=choose][data-choice=pass]"); await p.waitForTimeout(150);
  await shot("game-feedback");
  await p.click("[data-act=game-next]");
  for (let k = 1; k < 10; k++) {
    await p.click(k % 3 ? "[data-act=choose][data-choice=stop]" : "[data-act=choose][data-choice=pass]");
    await p.click("[data-act=game-next]");
  }
  await p.waitForTimeout(150);
  await shot("game-end");
  await at("#year-title", "game-year");

  for (const v of ["cases", "now", "about"]) {
    await p.goto(BASE + "#" + v); await p.waitForTimeout(200); await hideNews(); await shot(v);
  }
  await p.goto(BASE + "#risk-C"); await p.waitForTimeout(200); await hideNews(); await at("#risk-C", "risks", 0);
  await p.goto(BASE + "#ask"); await p.waitForTimeout(200); await hideNews();
  await p.click("[data-act=example][data-i='0']"); await p.waitForTimeout(150);
  await at("#len-note", "ask", 330);
  await b.close();
  console.log("shots:", OUT);
})();
