"""Web版（claude.ai の Artifact）を組み立てる

furiochi_lab の問題バンク・採点ルール・AIプロンプトを JSON にして template.html に埋め込む。
使い方: python furiochi_lab/web/build.py [出力先]（既定は furiochi-lab.html）
"""
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

here = Path(__file__).parent
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
template = (here / "template.html").read_text(encoding="utf-8")
assert "__FURIOCHI_DATA__" in template
out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("furiochi-lab.html")
out.write_text(template.replace("__FURIOCHI_DATA__", blob), encoding="utf-8")
print(out, len(out.read_bytes()), "bytes")
