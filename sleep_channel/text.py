"""原稿の整形と、音声合成に渡す単位への分割"""

from dataclasses import dataclass
import re

SENTENCE_END = "。！？!?"

# 音声合成で入れる間（秒）
SENTENCE_PAUSE = 0.7
PARAGRAPH_PAUSE = 1.6


def clean_narration(text: str) -> str:
    """AIの出力に混ざりがちな見出し記号・箇条書き記号・強調記号を落とす"""
    lines = []
    for line in text.replace("\r\n", "\n").split("\n"):
        line = re.sub(r"^\s*(#{1,6}\s*|[-*・●■▼]\s+|\d+[.)]\s+)", "", line)
        line = line.replace("**", "").replace("__", "")
        lines.append(line.strip())
    out = "\n".join(lines)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def apply_readings(text: str, readings: dict[str, str]) -> str:
    """固有名詞などを読み仮名に置き換える。長い語から先に置き換える"""
    for word in sorted(readings, key=len, reverse=True):
        reading = readings[word]
        if word and reading:
            text = text.replace(word, reading)
    return text


def to_speech_text(text: str, readings: dict[str, str] | None = None) -> str:
    """読み上げ用の本文。括弧内の補足は二重に読まれるので外し、鉤括弧は記号だけ外す"""
    text = apply_readings(text, readings or {})
    text = re.sub(r"[（(][^（）()]*[）)]", "", text)
    text = re.sub(r"[「」『』【】〈〉《》\"]", "", text)
    text = re.sub(r"[ \t　]+", " ", text)
    return text.strip()


def paragraphs(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n+", text) if p.strip()]


def split_sentences(paragraph: str) -> list[str]:
    parts = re.findall(rf"[^{SENTENCE_END}]+[{SENTENCE_END}]*", paragraph)
    return [p.strip() for p in parts if p.strip()]


def _split_long(sentence: str, max_chars: int) -> list[str]:
    """1文が長すぎるときは読点で、それでも長ければ文字数で区切る"""
    if len(sentence) <= max_chars:
        return [sentence]
    pieces, current = [], ""
    for part in re.findall(r"[^、，,]+[、，,]?", sentence):
        if current and len(current) + len(part) > max_chars:
            pieces.append(current)
            current = ""
        while len(part) > max_chars:
            pieces.append(part[:max_chars])
            part = part[max_chars:]
        current += part
    if current:
        pieces.append(current)
    return pieces


@dataclass
class Utterance:
    text: str
    pause: float  # この発話のあとに入れる無音（秒）


def plan_utterances(text: str, max_chars: int, per_sentence: bool) -> list[Utterance]:
    """音声合成に渡す単位に分ける

    per_sentence=True なら1文ずつ（ローカルの音声合成向け。文ごとに間を入れられる）。
    False なら段落の中で max_chars まで文をまとめる（APIの呼び出し回数を減らす）。
    """
    result: list[Utterance] = []
    for para in paragraphs(text):
        sentences = [s for sent in split_sentences(para) for s in _split_long(sent, max_chars)]
        if per_sentence:
            chunks = sentences
        else:
            chunks, current = [], ""
            for s in sentences:
                if current and len(current) + len(s) > max_chars:
                    chunks.append(current)
                    current = ""
                current += s
            if current:
                chunks.append(current)
        for i, chunk in enumerate(chunks):
            last = i == len(chunks) - 1
            result.append(Utterance(chunk, PARAGRAPH_PAUSE if last else SENTENCE_PAUSE))
    return result


def estimate_minutes(chars: int, cpm: int) -> float:
    return chars / cpm if cpm else 0.0
