"""台本づくり（Claude API）

題材の候補出し、章立て、章ごとの本文の3段階に分ける。2時間ぶん（約3万字）を一度に
書かせると後半が薄くなり、繰り返しも増えるので、章立てを先に固めてから1章ずつ書く。
各章では、投稿前に人が確かめるべき事実（check_points）と、音声合成が読み間違えそうな
語の読み（readings）もあわせて受け取る。
"""

import json
import os

from sleep_channel.config import (
    DEFAULT_EFFORT, DEFAULT_MODEL, FALLBACK_BETA, FALLBACK_MODELS, Channel,
)
from sleep_channel.project import Chapter, Project
from sleep_channel.text import clean_narration


class WriterError(Exception):
    """台本づくりに失敗したとき"""


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# プロンプト
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _channel_block(channel: Channel) -> str:
    avoid = "\n".join(f"・{a}" for a in channel.avoid)
    return (
        f"チャンネル名：{channel.name}\n"
        f"方針：{channel.concept}\n"
        f"語り手：{channel.narrator}\n"
        f"扱わないこと：\n{avoid}"
    )


def ideas_system(channel: Channel) -> str:
    return f"""あなたは睡眠用の歴史朗読チャンネルの企画担当です。聞き手は布団の中で、目を閉じて音声だけを聞きます。

{_channel_block(channel)}

よい題材の条件。
2時間かけて静かに語れるだけの具体的な細部（道具、手順、食べ物、一日の流れ、町の音）がある。
起伏の激しい事件より、暮らしや仕組みの話が中心になる。
日本語で検索されそうな言葉を含み、題だけで内容が想像できる。
史料がある程度残っていて、事実と推測を言い分けながら語れる。

過去の題材と重ならないようにし、時代と地域を散らす。"""


def outline_system(channel: Channel) -> str:
    return f"""あなたは睡眠用の歴史朗読チャンネルの構成作家です。聞き手は布団の中で、目を閉じて音声だけを聞きます。

{_channel_block(channel)}

章立ての決まり。
章は時間や場面の流れに沿って並べ、前の章の内容を次の章が自然に引き継ぐようにする。
各章で扱う具体的な要素（人、道具、場所、数字、手順）を points に4〜6個挙げる。章同士で要素を重複させない。
盛り上がりの山を作らない。最後の2章は特に穏やかな題材にする。
title_candidates はYouTubeの動画タイトル案を3つ。60字以内で、検索されやすい言葉（睡眠用、聞き流し、寝落ち、歴史など）とテーマを入れる。煽る言葉や感嘆符は使わない。
summary は概要欄の冒頭に置く2〜3文の紹介。
tags は検索用のタグを10〜15個。"""


def chapter_system(channel: Channel) -> str:
    return f"""あなたは睡眠用の歴史朗読チャンネルの脚本家です。聞き手は布団の中で、目を閉じて音声だけを聞いています。眠りに落ちるまでの時間を、静かで、確かな知識のある話で満たすのが仕事です。

{_channel_block(channel)}

本文の書き方。
音声合成がそのまま読み上げる。見出し、箇条書き、記号、括弧書きの補足、アルファベットの略語を使わない。
感嘆符、聞き手を煽る問いかけ、「なんと」「実は」「衝撃の」のような驚きの言葉を使わない。
一文は40字前後を中心にし、ときどき短い文を挟む。修飾を長く重ねない。同じ語尾を3回以上続けない。
具体的な名前、数字、手順、道具の形、音や匂いを描き、聞き手が場面を思い浮かべられるようにする。
史料で確かめられることと、推測や諸説あることを言い分ける。諸説ある話は「とも言われています」「と考えられています」で示す。
西暦や数量は算用数字で書いてよい。
段落は3〜6文にし、段落の間は空行で区切る。

check_points には、投稿前に人が確かめるべき事実（年号、人名、数値、諸説ある話）を短い文で3〜8件書く。
readings には、音声合成が読み間違えそうな語（人名、地名、難読語、旧字の語）と、その読みをひらがなで書く。なければ空配列にする。"""


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 出力スキーマ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _obj(properties: dict) -> dict:
    return {
        "type": "object",
        "properties": properties,
        "required": list(properties),
        "additionalProperties": False,
    }


STR = {"type": "string"}
STR_LIST = {"type": "array", "items": STR}

IDEAS_SCHEMA = _obj({
    "ideas": {"type": "array", "items": _obj({"theme": STR, "angle": STR, "reason": STR})},
})

OUTLINE_SCHEMA = _obj({
    "title_candidates": STR_LIST,
    "summary": STR,
    "tags": STR_LIST,
    "chapters": {"type": "array", "items": _obj({"title": STR, "summary": STR, "points": STR_LIST})},
})

CHAPTER_SCHEMA = _obj({
    "narration": STR,
    "check_points": STR_LIST,
    "readings": {"type": "array", "items": _obj({"word": STR, "reading": STR})},
})


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# リクエスト本文
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def build_ideas_request(count: int, past_themes: list[str]) -> str:
    past = "\n".join(f"・{t}" for t in past_themes) or "なし"
    return f"題材の候補を{count}件出してください。\n\n過去に扱った題材：\n{past}"


def build_outline_request(theme: str, chapters: int, target_minutes: int) -> str:
    return (
        f"テーマ：{theme}\n"
        f"動画の長さ：約{target_minutes}分\n"
        f"章の数：{chapters}章\n\n"
        "このテーマで章立てを作ってください。"
    )


def build_chapter_request(project: Project, chapter: Chapter, previous_tail: str = "") -> str:
    outline = "\n".join(f"{c.number}. {c.title}：{c.summary}" for c in project.chapters)
    points = "\n".join(f"・{p}" for p in chapter.points) or "・要約に沿って選ぶ"
    target = project.chapter_chars
    lines = [
        f"動画のテーマ：{project.theme}",
        f"動画の題：{project.title}",
        f"全体の章立て：\n{outline}",
        "",
        f"今回書く章：第{chapter.number}章「{chapter.title}」",
        f"この章の要約：{chapter.summary}",
        f"この章で扱う要素：\n{points}",
        f"本文の長さ：{target}字前後。{int(target * 0.9)}字を下回らないこと。",
    ]
    last = chapter.number == len(project.chapters)
    if chapter.number == 1:
        lines.append("冒頭のあいさつは別に読み上げるので、あいさつは書かずに本題から入る。")
    if last:
        lines.append("締めのあいさつは別に読み上げるので、最後の段落は全体を静かに振り返る内容にする。")
    else:
        lines.append("章の終わりは、次の章の題材へゆるやかにつなぐ一文で終える。毎回同じ決まり文句にしない。")
    if previous_tail:
        lines.append(f"直前の章の終わり：\n{previous_tail}\n（ここからの続きとして自然につなぐ。直前の内容を繰り返さない）")
    return "\n".join(lines)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# クライアント
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ScriptWriter:
    """Claude API で企画・章立て・本文を作る"""

    def __init__(self, channel: Channel, client=None, model: str | None = None,
                 effort: str | None = None) -> None:
        if client is None:
            try:
                import anthropic
            except ImportError as e:
                raise WriterError("anthropic パッケージが必要です（pip install -r requirements.txt）") from e
            client = anthropic.Anthropic()
        self.client = client
        self.channel = channel
        self.model = model or os.environ.get("SLEEP_MODEL", DEFAULT_MODEL)
        self.effort = effort or os.environ.get("SLEEP_EFFORT", DEFAULT_EFFORT)

    def ideas(self, count: int, past_themes: list[str]) -> list[dict]:
        data = self._call(ideas_system(self.channel), build_ideas_request(count, past_themes), IDEAS_SCHEMA)
        return data["ideas"]

    def outline(self, project: Project, chapters: int) -> None:
        """章立てを作って project に書き込む（保存は呼び出し側）"""
        request = build_outline_request(project.theme, chapters, project.target_minutes)
        data = self._call(outline_system(self.channel), request, OUTLINE_SCHEMA)
        if not data["chapters"]:
            raise WriterError("章立てが空でした。もう一度試してください。")
        project.title_candidates = [t.strip() for t in data["title_candidates"] if t.strip()]
        project.summary = data["summary"].strip()
        project.tags = [t.strip().lstrip("#") for t in data["tags"] if t.strip()]
        project.chapters = [
            Chapter(number=i, title=c["title"].strip(), summary=c["summary"].strip(),
                    points=[p.strip() for p in c["points"] if p.strip()])
            for i, c in enumerate(data["chapters"], 1)
        ]

    def chapter(self, project: Project, chapter: Chapter, previous_tail: str = "") -> str:
        """1章ぶんの本文を書き、原稿ファイルと確認ポイント・読みを project に反映する"""
        request = build_chapter_request(project, chapter, previous_tail)
        data = self._call(chapter_system(self.channel), request, CHAPTER_SCHEMA)
        text = clean_narration(data["narration"])
        if not text:
            raise WriterError(f"第{chapter.number}章の本文が空でした。")
        chapter.check_points = [c.strip() for c in data["check_points"] if c.strip()]
        chapter.readings = {
            r["word"].strip(): r["reading"].strip()
            for r in data["readings"] if r["word"].strip() and r["reading"].strip()
        }
        project.write_narration(chapter, text)
        return text

    def _call(self, system: str, user: str, schema: dict) -> dict:
        import anthropic

        kwargs = {
            "model": self.model,
            "max_tokens": 16000,
            "system": system,
            "messages": [{"role": "user", "content": user}],
            "output_config": {
                "effort": self.effort,
                "format": {"type": "json_schema", "schema": schema},
            },
        }
        try:
            if self.model in FALLBACK_MODELS:
                # 安全分類器に断られたとき、サーバー側で推奨モデルに切り替えて再実行する
                response = self.client.beta.messages.create(
                    betas=[FALLBACK_BETA], fallbacks="default", **kwargs,
                )
            else:
                response = self.client.messages.create(**kwargs)
        except anthropic.AuthenticationError as e:
            raise WriterError("APIキーが無効です。設定を確認してください。") from e
        except anthropic.PermissionDeniedError as e:
            raise WriterError("このAPIキーではモデルを利用できません。") from e
        except anthropic.NotFoundError as e:
            raise WriterError(f"モデル {self.model} が見つかりません。") from e
        except anthropic.RateLimitError as e:
            raise WriterError("APIが混み合っています。少し待ってから再度試してください。") from e
        except anthropic.APIStatusError as e:
            raise WriterError(f"APIエラーが発生しました（{e.status_code}）。") from e
        except anthropic.APIConnectionError as e:
            raise WriterError("APIに接続できませんでした。ネットワークを確認してください。") from e

        if response.stop_reason == "refusal":
            raise WriterError("この題材では書けませんでした。題材か章の要約を変えてください。")
        if response.stop_reason == "max_tokens":
            raise WriterError("応答が途中で切れました。章の文字数を減らすか、章を増やしてください。")

        text = next((b.text for b in response.content if b.type == "text"), None)
        if not text:
            raise WriterError("応答に本文がありませんでした。もう一度試してください。")
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            raise WriterError("応答を読み取れませんでした。もう一度試してください。") from e
        if not isinstance(data, dict):
            raise WriterError("応答の形式が想定と違いました。もう一度試してください。")
        return data


def previous_tail(project: Project, chapter: Chapter, chars: int = 400) -> str:
    """直前の章の終わりの部分。続きとして書かせるために渡す"""
    if chapter.number <= 1:
        return ""
    prev = project.chapters[chapter.number - 2]
    return project.narration(prev)[-chars:]
