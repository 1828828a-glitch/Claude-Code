"""AI向けの要約 llms.txt と llms-full.txt を data/*.json から作る

「AIに聞く」ボタンで開いた外部のAIは、JavaScriptで描く画面を読めないことが多い。
そこで、設問・事例・リスクと対策・今すぐできることを Markdown にして site/ 直下に置く。
データを直したら作り直す: python3 security_portal/tools/build_llms.py
"""
import json
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / "site"


def load(name):
    return json.loads((SITE / "data" / f"{name}.json").read_text(encoding="utf-8"))


q, cases, risks, actions, news, config = (load(n) for n in ("questions", "cases", "risks", "actions", "news", "config"))
base = config["site_url"] or "./"
org = config["org"]
cats = q["categories"]


def link(label, url):
    return f"[{label}]({url})" if url else label


head = [
    f"# {config['site_name']}",
    "",
    f"> ブランド・マーケティング担当のための、セキュリティ・リスク診断と情報のポータル。運営は{org['name']}（{org['approval']}）。中立の立場で、特定の製品やサービスは勧めない。",
    "",
    f"最終更新日：{q['updated']}",
    "",
    "## 運営方針",
    "- 根拠には公的機関の発表と、確認できた報道だけを使う。",
    "- 必要のない対策は、必要ないと伝える。営業の連絡はしない。",
    f"- 自社で判断がつかないときは、{org['name']}の組合員の専門家が分野を超えてチームを組み、相談に応じる（{link('問い合わせ', org['contact_url'])}）。",
    "- 事故が起きた直後は、IPAの相談窓口も使える（https://www.ipa.go.jp/security/support/soudan.html）。",
    "",
    "## ページ",
    f"- {link('トップ', base)}",
    f"- {link('リスク診断（18問）', base + '#check')}",
    f"- {link('サイトのリスクチェック（公開DNSと証明書の公開記録を読む）', base + '#site')}",
    f"- {link('直近の事例', base + '#cases')}",
    f"- {link('リスクと対策', base + '#risks')}",
    f"- {link('今すぐできること', base + '#now')}",
    f"- {link('すべての内容（llms-full.txt）', base + 'llms-full.txt')}",
    "",
]

body = ["## 注意喚起", ""]
for n in news["items"]:
    body += [f"### {n['date']} {n['title']}", "", n["body"], ""]
    body += [f"- {t}" for t in n["todo"]]
    body += [""] + [f"- 出典：{link(l['label'], l['url'])}" for l in n["links"]] + [""]

body += ["## 7つのリスクと対策", ""]
for r in risks["items"]:
    body += [f"### {r['cat']}. {r['title']}", "", r["lead"], "", "要注意のサイン："]
    body += [f"- {s}" for s in r["signs"]]
    for key, label in (("today", "今日"), ("month", "今月"), ("system", "仕組みにする")):
        body += ["", f"{label}："] + [f"- {m}" for m in r["measures"][key]]
    body.append("")

body += ["## 直近の事例", "", cases["note"], ""]
for c in cases["items"]:
    body += [
        f"### {c['date']} {c['title']}（{c['org']}）",
        "",
        c["summary"],
        "",
        f"ブランド・マーケ担当が学べること：{c['lesson']}",
        "",
        "出典：" + "、".join(link(s["label"], s["url"]) for s in c["sources"]),
        "",
    ]

body += ["## 今すぐできること", ""]
for g in actions["groups"]:
    body += [f"### {g['title']}", ""]
    body += [f"- {a['text']}（{a['how']}）" for a in g["items"]]
    body.append("")

body += ["## 診断の設問と根拠", "", "回答は「はい（0点）・一部（1点）・いいえ／分からない（2点）」。点数×重みを合計し、リスク指数（0〜100）とレベル1〜4で判定する。", ""]
for item in q["questions"]:
    body += [
        f"### {item['id']}（{item['cat']}. {cats[item['cat']]}・重み{item['weight']}）{item['q']}",
        "",
        f"- なぜ大事か：{item['why']}" + (f"（{link('出典', item['source'])}）" if item["source"] else ""),
    ]
    if item.get("extra"):
        body.append(f"- 補足：{item['extra']['text']}（{link('出典', item['extra']['source'])}）")
    body += [f"- 対策：{a}" for a in item["actions"]]
    body.append("")

body += ["## 無料で使える公的なツール", ""]
body += [f"- {link(t['name'], t['url'])}（{t['by']}）：{t['text']}" for t in q["tools"]]
body.append("")

short = head + [
    "## 7つのリスク",
    *[f"- {r['cat']}. {r['title']}：{r['measures']['today'][0]}" for r in risks["items"]],
    "",
    "## 直近の事例（新しい順）",
    *[f"- {c['date']} {c['title']}（{c['org']}）" for c in cases["items"]],
    "",
]
(SITE / "llms.txt").write_text("\n".join(short), encoding="utf-8")
(SITE / "llms-full.txt").write_text("\n".join(head + body), encoding="utf-8")
print("llms.txt", len("\n".join(short)), "chars")
print("llms-full.txt", len("\n".join(head + body)), "chars")
