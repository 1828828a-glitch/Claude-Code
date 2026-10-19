"""Web版（claude.ai の Artifact）を組み立てる

furiochi_lab の問題バンク・採点ルール・AIプロンプトを JSON にして template.html に埋め込む。
web/sounds/ に音声があれば、それも埋め込んで合成の効果音と差し替える（sounds/README.md）。
使い方: python furiochi_lab/web/build.py [出力先]（既定は furiochi-lab.html）
"""
import base64
from dataclasses import asdict
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from furiochi_lab.data import modes, problems, taxonomy  # noqa: E402
from furiochi_lab.engine import ai_coach, rubric  # noqa: E402

data = {
    "modes": {k: asdict(v) for k, v in modes.MODES.items()},
    "implemented": modes.IMPLEMENTED_MODES,
    "levels": modes.LEVELS,
    "rubrics": {k: [asdict(a) for a in v] for k, v in modes.RUBRICS.items()},
    "safety": modes.SAFETY_STATUS,
    "relevance": modes.RELEVANCE,
    "weakness": modes.WEAKNESS_TAGS,
    "pilot": modes.PILOT_PLAN,
    "problems": [p.to_dict() for p in problems.PROBLEMS],
    "checks": {"explanation": list(rubric.EXPLANATION_MARKERS), "harsh": list(rubric.HARSH_WORDS)},
    "prompts": {
        "evalSystem": ai_coach.EVALUATION_SYSTEM,
        "modeGuides": ai_coach.MODE_GUIDES,
        "genSystem": ai_coach.GENERATION_SYSTEM,
        "defaultLevel": ai_coach.DEFAULT_LEVEL,
    },
    "tax": {
        "definition": taxonomy.DEFINITION,
        "flow": taxonomy.BASIC_FLOW,
        "furiFunctions": taxonomy.FURI_FUNCTIONS,
        "theories": taxonomy.THEORIES,
        "layers": taxonomy.LAYERS,
        "types": taxonomy.BASIC_TYPES,
        "techniques": taxonomy.TECHNIQUES,
        "domestic": taxonomy.DOMESTIC_WORKS,
        "overseas": taxonomy.OVERSEAS_WORKS,
        "originals": taxonomy.ORIGINAL_EXAMPLES,
        "steps": taxonomy.PRODUCTION_STEPS,
        "failures": taxonomy.COMMON_FAILURES,
        "plan": taxonomy.PRACTICE_PLAN,
        "sources": {str(k): v for k, v in taxonomy.SOURCES.items()},
    },
}

# sounds/ の音声はファイル名（拡張子なし）が鳴らす場面の名前。名前は sound.js の SYNTH と同じ
AUDIO_EXT = {".wav", ".ogg", ".mp3", ".flac", ".m4a"}
sounds = {}
for f in sorted((Path(__file__).parent / "sounds").glob("*")):
    if f.suffix.lower() not in AUDIO_EXT:
        continue
    if f.stem in sounds:
        sys.exit(f"sounds/ に {f.stem} が2つあります。1つにしてください")
    sounds[f.stem] = base64.b64encode(f.read_bytes()).decode("ascii")
    print("sound:", f.name, f.stat().st_size, "bytes")
if sounds:
    data["sounds"] = sounds

# src/ の部品を順につなぐ。JS はひとつの即時関数の中で同じスコープを共有する
CSS_FILES = ["base.css", "stage.css", "charts.css"]
JS_FILES = ["charts.js", "stage.js", "sound.js", "app.js"]

src = Path(__file__).parent / "src"
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
shell = (src / "shell.html").read_text(encoding="utf-8")
for marker in ("/*__CSS__*/", "/*__JS__*/", "__FURIOCHI_DATA__"):
    assert shell.count(marker) == 1, marker
css = "\n".join((src / f).read_text(encoding="utf-8") for f in CSS_FILES)
js = "\n".join((src / f).read_text(encoding="utf-8") for f in JS_FILES)
html = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js).replace("__FURIOCHI_DATA__", blob)
out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("furiochi-lab.html")
out.write_text(html, encoding="utf-8")
print(out, len(out.read_bytes()), "bytes")
