"""scripts/check_candidates.py（定期タスクが作る候補問題の形の検査）のテスト"""

import copy
import importlib.util
import json
from pathlib import Path

import pytest

from furiochi_lab.data.problems import PROBLEMS_BY_ID

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("check_candidates", ROOT / "scripts" / "check_candidates.py")
cc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cc)


def candidate(base_id="F01", **changes):
    data = copy.deepcopy(PROBLEMS_BY_ID[base_id].to_dict())
    data.update({"id": "G-test0001", "prompt": "テスト用の新しいフリ"})
    data.update(changes)
    return data


def write(tmp_path, *problems):
    path = tmp_path / "2026-11-09.json"
    path.write_text(json.dumps({"date": "2026-11-09", "problems": list(problems)}, ensure_ascii=False), encoding="utf-8")
    return path


def test_valid_candidates_pass(tmp_path, capsys):
    d01 = candidate("D01", id="G-test0002", prompt="別のテスト用フリ")
    assert cc.main([str(write(tmp_path, candidate(), d01))]) == 0
    assert "合格 2 問、不合格 0 問" in capsys.readouterr().out


@pytest.mark.parametrize("changes,expected", [
    ({"id": "F99"}, "G- で始まっていない"),
    ({"prompt": PROBLEMS_BY_ID["F02"].prompt}, "すでにバンクにある"),
    ({"pattern": "存在しない型"}, "pattern が型の辞典にない"),
    ({"mode": "M09"}, "実装済みのモードではない"),
    ({"level": 9}, "level が1〜5の外"),
    ({"axis": ""}, "axis が空"),
    ({"examples": [{"text": "1件だけ", "pattern": "数量逆転", "note": ""}]}, "成立例の数"),
    ({"condition": "数量逆転"}, "condition を空にする"),
    ({"focus": "**強調**"}, "Markdown"),
    ({"extra": 1}, "Problem の形になっていない"),
])
def test_broken_candidates_fail(tmp_path, capsys, changes, expected):
    assert cc.main([str(write(tmp_path, candidate(**changes)))]) == 1
    assert expected in capsys.readouterr().out


def test_m04_condition_must_match_examples(tmp_path, capsys):
    bad = candidate("D01", condition="数量逆転／数量逆転／数量逆転")
    assert cc.main([str(write(tmp_path, bad))]) == 1
    assert "M04 の condition" in capsys.readouterr().out


def test_duplicate_ids_within_file_fail(tmp_path, capsys):
    a = candidate()
    b = candidate(prompt="もう一つのフリ")
    assert cc.main([str(write(tmp_path, a, b))]) == 1
    assert "id が重複" in capsys.readouterr().out


def test_unreadable_file_fails(tmp_path):
    path = tmp_path / "broken.json"
    path.write_text("{", encoding="utf-8")
    assert cc.main([str(path)]) == 1
