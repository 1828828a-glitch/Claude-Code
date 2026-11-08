#!/usr/bin/env python3
"""Markdown の登壇原稿を、テンプレートの見本スライドを複製して .pptx にする

DevelopersIO の記事「登壇当日に Claude for Google Workspace で Markdown 原稿をスライドに変換して間に合わせた話」
と同じ考え方で作っている。レイアウトは新しく作らず、テンプレートにある見本スライドを複製して文字だけ差し替える。

  python3 zukai/slides/md2slides.py 原稿.md [--template テンプレート.pptx] [--out 出力.pptx]

原稿の書き方
  ---                      ページの区切り（コードブロックの中は除く）
  # タイトル                 表紙。続く1行目が副題、2行目以降が発表者の欄
  ## 小ネタ 1 / ## 題名       見出し2つだけのページは中扉
  ## 見出し                  本文ページ。見出しがタイトルになり、残りが本文の枠に入る
  最後の「## ありがとうございました」のように見出しだけのページは、表紙の見本で裏表紙にする

見本スライドの見分け方
  テンプレートの各スライドに書かれた目印の文字で決める。{{body}} があれば本文、{{section_title}} があれば中扉、
  {{title}} だけなら表紙。目印のある枠に文字を流し込み、それ以外の飾りはそのまま残す。テンプレートのスライドは出力から外す。

本文の枠に入るもの
  箇条書き（入れ子は字下げ。親は●、子は○）、番号付きリスト、段落、### の小見出し、
  コードブロック（黒地に等幅）、表（罫線付き）、画像（ファイルがあれば貼り、なければ「画像を手動で挿入」の枠）。
  収まらなければ字を縮め（本文14pt・コード9pt・表10ptまで）、それでも無理なら「（続き）」のスライドに分ける。

最後に、原稿のどのページをどの見本から作ったかの対応表を、出力と同じ場所に <名前>-map.md として書く。
"""
import argparse
import copy
import io
import os
import re
import sys
from pathlib import Path

from lxml import etree
from PIL import Image, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

HERE = Path(__file__).resolve().parent
PT = 12700  # 1pt の EMU

BLUE = '0A57BF'
INK = '404040'
SUB = '6B7076'
CODE_BG = '1F2430'
CODE_FG = 'E6E9EF'
CODE_DIM = '8B95A7'
INLINE_CODE = 'A33B20'
LINE = 'D7D8DC'
ROW_ALT = 'F5F6F8'
JP_FONT = 'Noto Sans JP'
MONO_FONT = 'Noto Sans Mono'

FLOOR_TEXT, FLOOR_CODE, FLOOR_TABLE = 14, 9, 10
GAP = 9  # 本文の枠の中で、かたまり同士の間（pt）
LINE_GAP = 1.3  # 本文の行送り（字の大きさの倍）


# ---------------------------------------------------------------- 文字幅を測る

def find_font(*keys):
    dirs = [Path.home() / '.fonts', Path.home() / '.local/share/fonts', Path('/usr/share/fonts'), Path('/usr/local/share/fonts'),
            Path('/Library/Fonts'), Path.home() / 'Library/Fonts', Path('C:/Windows/Fonts')]
    for d in dirs:
        if not d.exists():
            continue
        for p in d.rglob('*'):
            if p.suffix.lower() in ('.ttf', '.otf', '.ttc') and any(k.lower() in p.name.lower() for k in keys):
                return p
    return None


class Measure:
    """PowerPoint の折り返しに近い数え方で、行数と高さを見積もる。フォントがなければ字幅を概算する"""

    def __init__(self):
        self.jp = self._load(find_font('NotoSansJP', 'NotoSansCJKjp', 'NotoSansCJK'))
        self.mono = self._load(find_font('NotoSansMono'))
        self.cache = {}
        self.jp_line = 1.45
        if self.jp:
            a, d = self.jp.getmetrics()
            self.jp_line = (a + d) / 100

    @staticmethod
    def _load(path):
        if not path:
            return None
        try:
            f = ImageFont.truetype(str(path), 100)
            try:
                f.set_variation_by_axes([400])
            except Exception:
                pass
            return f
        except Exception:
            return None

    def char(self, ch, mono):
        key = (ch, mono)
        if key not in self.cache:
            wide = ord(ch) >= 0x2E80 or ch in '　'
            f = self.mono if (mono and not wide) else self.jp
            if f:
                w = f.getlength(ch) / 100
            elif mono:
                w = 1.0 if wide else 0.6
            else:
                w = 1.0 if wide else 0.56
            self.cache[key] = w
        return self.cache[key]

    def width(self, text, size, mono=False, bold=False):
        return sum(self.char(c, mono) for c in text) * size * (1.03 if bold else 1)

    TOKEN = re.compile(r"[A-Za-z0-9_.,:;!?/\\#@%&=+\-'\"()\[\]{}<>*$^~`|]+|\s+|.")
    NO_START = set('、。，．・：；？！）」』】〕｝〉》ーぁぃぅぇぉっゃゅょァィゥェォッャュョ…')

    def lines(self, text, width, size, mono=False, bold=False):
        """幅 width(pt) に収めたときの行数"""
        total = 0
        for raw in text.split('\n'):
            n, cur = 1, 0.0
            for tok in self.TOKEN.findall(raw):
                w = self.width(tok, size, mono, bold)
                if tok.isspace():
                    if cur > 0:
                        cur += w
                    continue
                if cur + w <= width + 0.5 or (tok in self.NO_START):
                    cur += w
                elif w > width:  # 1語が幅より長い：文字単位で割る
                    for c in tok:
                        cw = self.width(c, size, mono, bold)
                        if cur + cw > width + 0.5:
                            n, cur = n + 1, 0.0
                        cur += cw
                else:
                    n, cur = n + 1, w
            total += n
        return total


M = Measure()


# ---------------------------------------------------------------- 原稿を読む

def split_pages(md):
    pages, cur, fence = [], [], None
    for ln in md.splitlines():
        m = re.match(r'^\s*(```|~~~)', ln)
        if m:
            fence = None if fence == m.group(1) else (fence or m.group(1))
        if fence is None and re.match(r'^---+\s*$', ln):
            pages.append(cur)
            cur = []
            continue
        cur.append(ln)
    pages.append(cur)
    return [p for p in pages if any(x.strip() for x in p)]


LIST_RE = re.compile(r'^(\s*)([-*+]|\d+[.)])\s+(.*)$')


def parse_blocks(lines):
    blocks, i = [], 0
    while i < len(lines):
        ln = lines[i]
        if not ln.strip():
            i += 1
            continue
        m = re.match(r'^(#{1,6})\s+(.*?)\s*#*\s*$', ln)
        if m:
            blocks.append({'t': 'h', 'level': len(m.group(1)), 'text': m.group(2)})
            i += 1
            continue
        m = re.match(r'^\s*(```|~~~)\s*([\w+#.-]*)', ln)
        if m:
            fence, body = m.group(1), []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith(fence):
                body.append(lines[i].rstrip('\n'))
                i += 1
            i += 1
            blocks.append({'t': 'code', 'lang': m.group(2).lower(), 'lines': body or ['']})
            continue
        m = re.match(r'^\s*!\[([^\]]*)\]\(\s*<?([^)>]+?)>?(?:\s+"[^"]*")?\s*\)\s*$', ln)
        if m:
            blocks.append({'t': 'img', 'alt': m.group(1), 'src': m.group(2)})
            i += 1
            continue
        if ln.lstrip().startswith('|'):
            rows = []
            while i < len(lines) and lines[i].lstrip().startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.match(r'^:?-{2,}:?$', c) for c in cells if c):
                    rows.append(cells)
                i += 1
            if rows:
                n = max(len(r) for r in rows)
                rows = [r + [''] * (n - len(r)) for r in rows]
                blocks.append({'t': 'table', 'rows': rows})
            continue
        if LIST_RE.match(ln):
            raw = []
            while i < len(lines) and lines[i].strip():
                mm = LIST_RE.match(lines[i])
                if mm:
                    raw.append([len(mm.group(1).expandtabs(4)), mm.group(2), mm.group(3)])
                elif raw:
                    raw[-1][2] += '\n' + lines[i].strip()
                else:
                    break
                i += 1
            indents = sorted({r[0] for r in raw})
            items, counters = [], {}
            for ind, mark, text in raw:
                lv = indents.index(ind)
                ordered = mark[0].isdigit()
                for deeper in [k for k in counters if k > lv]:
                    del counters[deeper]
                num = int(re.match(r'\d+', mark).group()) if ordered else 0
                counters[lv] = num
                items.append({'level': lv, 'ordered': ordered, 'num': num, 'text': text})
            blocks.append({'t': 'list', 'items': items})
            continue
        # 段落は1行ずつ。原稿の改行をそのまま生かす
        blocks.append({'t': 'para', 'text': ln.strip()})
        i += 1
    return blocks


INLINE = re.compile(r'(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))')


def inline_runs(text):
    out = []
    for part in INLINE.split(text):
        if not part:
            continue
        if len(part) > 1 and part.startswith('`') and part.endswith('`'):
            out.append((part[1:-1], {'code': True}))
        elif part.startswith('**') and part.endswith('**'):
            out.append((part[2:-2], {'bold': True}))
        elif part.startswith('[') and (m := re.match(r'\[([^\]]+)\]\(([^)]+)\)', part)):
            out.append((m.group(1), {'link': m.group(2)}))
        else:
            out.append((part, {}))
    return out


def plain(text):
    return ''.join(t for t, _ in inline_runs(text))


def classify(blocks, index, count):
    heads = [b for b in blocks if b['t'] == 'h']
    if any(b['level'] == 1 for b in heads):
        return 'cover'
    if len(blocks) == 2 and len(heads) == 2:
        return 'section'
    if index == count - 1 and heads and all(b['t'] in ('h', 'img', 'para') for b in blocks) and len(heads) == 1 \
            and len([b for b in blocks if b['t'] == 'para']) <= 1:
        return 'closing'
    return 'body'


# ---------------------------------------------------------------- テンプレートの見本

TOKEN_RE = re.compile(r'\{\{(\w+)\}\}')


def slide_tokens(slide):
    found = set()
    for shp in slide.shapes:
        if shp.has_text_frame:
            found |= set(TOKEN_RE.findall(shp.text_frame.text))
    return found


def find_samples(prs):
    samples = {}
    for idx, s in enumerate(prs.slides, 1):
        t = slide_tokens(s)
        kind = 'body' if 'body' in t else 'section' if 'section_title' in t else 'cover' if 'title' in t else None
        if kind and kind not in samples:
            samples[kind] = (idx, s)
    missing = {'cover', 'section', 'body'} - set(samples)
    if 'body' in missing:
        sys.exit('テンプレートに本文の見本（{{body}} のあるスライド）がない')
    return samples


def clone_slide(prs, src):
    """見本スライドを複製する。飾りの図形・背景・画像の参照ごと写す"""
    dst = prs.slides.add_slide(src.slide_layout)
    for shp in list(dst.shapes):
        shp._element.getparent().remove(shp._element)
    bg = src._element.cSld.find(qn('p:bg'))
    if bg is not None:
        dst._element.cSld.insert(0, copy.deepcopy(bg))
    tree = dst.shapes._spTree
    for el in src.shapes._spTree.iterchildren():
        if el.tag in (qn('p:nvGrpSpPr'), qn('p:grpSpPr'), qn('p:extLst')):
            continue
        tree.append(copy.deepcopy(el))
    for el in tree.iter():
        for attr in (qn('r:embed'), qn('r:link'), qn('r:id')):
            rid = el.get(attr)
            if rid and rid in src.part.rels:
                rel = src.part.rels[rid]
                new = dst.part.relate_to(rel.target_ref, rel.reltype, is_external=True) if rel.is_external \
                    else dst.part.relate_to(rel.target_part, rel.reltype)
                el.set(attr, new)
    return dst


def token_shape(slide, token):
    for shp in slide.shapes:
        if shp.has_text_frame and '{{%s}}' % token in shp.text_frame.text:
            return shp
    return None


def first_rpr(shape):
    for p in shape.text_frame.paragraphs:
        for r in p.runs:
            return r._r.find(qn('a:rPr'))
    return None


def rpr_size(rpr, default=18.0):
    return int(rpr.get('sz')) / 100 if rpr is not None and rpr.get('sz') else default


def rpr_color(rpr, default=INK):
    if rpr is not None:
        c = rpr.find('.//' + qn('a:srgbClr'))
        if c is not None:
            return c.get('val')
    return default


def fit_size(text, width, height, size, line):
    """枠（pt）に収まる字の大きさ。6割まで縮める"""
    s = size
    while s > size * 0.6 and M.lines(plain(text), width, s, bold=True) * s * line > height + 1:
        s -= 0.5
    return s


def fill_token(slide, token, text, report=None):
    """目印の枠に文字を入れる。見本の書式（段落と最初の文字の書式）をそのまま使い、入りきらなければ字を縮める"""
    shp = token_shape(slide, token)
    if shp is None:
        return None
    if not text:
        shp._element.getparent().remove(shp._element)
        return None
    tf = shp.text_frame
    p0 = tf.paragraphs[0]
    ppr = p0._p.find(qn('a:pPr'))
    rpr = first_rpr(shp)
    size = rpr_size(rpr)
    w = shp.width / PT - (tf.margin_left + tf.margin_right) / PT
    h = shp.height / PT - (tf.margin_top + tf.margin_bottom) / PT
    new_size = fit_size(text, w, h, size, M.jp_line)
    if report is not None and new_size < size:
        report.append(f'{token} の字を {size:g}pt → {new_size:g}pt に縮小')
    for p in list(tf.paragraphs)[1:]:
        p._p.getparent().remove(p._p)
    for r in list(p0._p):
        if r.tag in (qn('a:r'), qn('a:br'), qn('a:fld')):
            p0._p.remove(r)
    for i, line in enumerate(text.split('\n')):
        p = p0 if i == 0 else tf.add_paragraph()
        if i and ppr is not None:
            p._p.insert(0, copy.deepcopy(ppr))
        for t, st in inline_runs(line):
            r = p.add_run()
            if rpr is not None:
                r._r.insert(0, copy.deepcopy(rpr))
            r.text = t
            r.font.size = Pt(new_size)
            if st.get('bold'):
                r.font.bold = True
    return shp


# ---------------------------------------------------------------- 本文の枠を組む

def plain_shape(sh):
    """図形からテーマの既定スタイル（影など）を外す。色と線はこちらで付ける"""
    st = sh._element.find(qn('p:style'))
    if st is not None:
        sh._element.remove(st)
    return sh


def set_fonts(run, mono=False):
    rpr = run._r.get_or_add_rPr()
    latin = rpr.find(qn('a:latin'))
    if latin is None:
        latin = etree.SubElement(rpr, qn('a:latin'))
    latin.set('typeface', MONO_FONT if mono else JP_FONT)
    ea = rpr.find(qn('a:ea'))
    if ea is None:
        ea = etree.Element(qn('a:ea'))
        latin.addnext(ea)
    ea.set('typeface', JP_FONT)


def add_runs(p, text, size, color, bold=False, base_mono=False):
    for t, st in inline_runs(text) if not base_mono else [(text, {})]:
        r = p.add_run()
        r.text = t
        if t != t.strip():
            r._r.find(qn('a:t')).set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        f = r.font
        f.size = Pt(size)
        f.bold = bold or bool(st.get('bold'))
        mono = base_mono or bool(st.get('code'))
        f.color.rgb = RGBColor.from_string(INLINE_CODE if st.get('code') and not base_mono else (BLUE if st.get('link') else color))
        set_fonts(r, mono)
        if st.get('link'):
            r.hyperlink.address = st['link']


def para_props(p, size, before=0.0, marl=0.0, indent=0.0, bullet=None, align='l'):
    """段落の書式。子要素の順番は OOXML の決まりどおりに並べる"""
    old = p._p.find(qn('a:pPr'))
    if old is not None:
        p._p.remove(old)
    ppr = etree.Element(qn('a:pPr'))
    ppr.set('marL', str(int(marl * PT)))
    ppr.set('indent', str(int(indent * PT)))
    ppr.set('algn', align)
    ln = etree.SubElement(ppr, qn('a:lnSpc'))
    etree.SubElement(ln, qn('a:spcPts')).set('val', str(int(size * LINE_GAP * 100)))
    sb = etree.SubElement(ppr, qn('a:spcBef'))
    etree.SubElement(sb, qn('a:spcPts')).set('val', str(int(before * 100)))
    if bullet is None:
        etree.SubElement(ppr, qn('a:buNone'))
    else:
        kind, value, color = bullet
        clr = etree.SubElement(ppr, qn('a:buClr'))
        etree.SubElement(clr, qn('a:srgbClr')).set('val', color)
        etree.SubElement(ppr, qn('a:buSzPct')).set('val', '80000' if kind == 'char' else '100000')
        etree.SubElement(ppr, qn('a:buFont')).set('typeface', JP_FONT)
        if kind == 'char':
            etree.SubElement(ppr, qn('a:buChar')).set('char', value)
        else:
            au = etree.SubElement(ppr, qn('a:buAutoNum'))
            au.set('type', 'arabicPeriod')
            au.set('startAt', str(max(1, value)))
    p._p.insert(0, ppr)


BULLETS = ['●', '○', '・']


def text_items(group, size):
    """箇条書き・段落・小見出しを、段落ごとの (文字, 大きさ, 太字, 字下げ, 行頭記号, 前の空き) にする"""
    out = []
    for b in group:
        if b['t'] == 'h':
            out.append((b['text'], size * 1.08, True, 0, 0, None, size * 0.6))
        elif b['t'] == 'para':
            out.append((b['text'], size, False, 0, 0, None, size * 0.5))
        else:
            for it in b['items']:
                lv = it['level']
                hang = size * (1.25 if it['ordered'] else 1.0)
                mar = lv * size * 1.5 + hang
                bullet = ('num', it['num'], BLUE if lv == 0 else SUB) if it['ordered'] \
                    else ('char', BULLETS[min(lv, 2)], BLUE if lv == 0 else SUB)
                out.append((it['text'], size, False, mar, -hang, bullet, size * (0.45 if lv == 0 else 0.15)))
    if out:
        out[0] = out[0][:6] + (0,)
    return out


def text_height(group, size, width):
    return sum(M.lines(plain(t), width - mar, s, bold=b) * s * LINE_GAP + before
               for t, s, b, mar, _ind, _bu, before in text_items(group, size))


def code_metrics(b, size, width):
    pad = 10
    longest = max(M.width(l.expandtabs(4), size, mono=True) for l in b['lines'])
    if longest + 2 * pad > width:
        size = max(7.5, size * (width - 2 * pad) / longest)
    return size, len(b['lines']) * size * LINE_GAP + 2 * pad, pad


def table_metrics(b, size, width):
    rows = b['rows']
    padx, pady = 6, 4
    ncol = len(rows[0])
    natural = [max(M.width(plain(r[c]), size, bold=(i == 0)) for i, r in enumerate(rows)) + 2 * padx + 2 for c in range(ncol)]
    total = sum(natural)
    if total <= width:
        cols = [n * width / total for n in natural]
    else:  # 長い列から削って、折り返してもらう
        floor = min(width / ncol, 72)
        cols = natural[:]
        while sum(cols) > width + 0.5:
            i = max(range(ncol), key=lambda k: cols[k])
            cols[i] = max(floor, cols[i] - (sum(cols) - width))
            if all(c <= floor for c in cols):
                cols = [width / ncol] * ncol
                break
    heights = [max(M.lines(plain(r[c]), cols[c] - 2 * padx, size, bold=(i == 0)) for c in range(ncol)) * size * 1.25 + 2 * pady
               for i, r in enumerate(rows)]
    return cols, heights, padx, pady


class BodyLayout:
    """本文の枠（pt）に、かたまりを上から積む"""

    def __init__(self, blocks, base, region, base_dir):
        self.base = base
        self.x, self.y, self.w, self.h = region
        self.base_dir = base_dir
        # 箇条書き・段落・小見出しは1つのテキスト枠にまとめる（あとで人が直しやすい）
        self.items = []
        for b in blocks:
            if b['t'] in ('h', 'para', 'list'):
                if self.items and self.items[-1]['t'] == 'text':
                    self.items[-1]['blocks'].append(b)
                else:
                    self.items.append({'t': 'text', 'blocks': [b]})
            else:
                if b['t'] == 'img':
                    p = (base_dir / b['src']).resolve() if not re.match(r'^https?:', b['src']) else None
                    b = dict(b, path=p if p and p.exists() else None)
                self.items.append(b)

    def sizes(self, k):
        return (max(min(self.base, FLOOR_TEXT), self.base * k),
                max(FLOOR_CODE, self.base * 0.72 * k),
                max(FLOOR_TABLE, self.base * 0.82 * k))

    def fixed_heights(self, items, k):
        ts, cs, tbs = self.sizes(k)
        out = []
        for it in items:
            if it['t'] == 'text':
                out.append(text_height(it['blocks'], ts, self.w) + 2)
            elif it['t'] == 'code':
                out.append(code_metrics(it, cs, self.w)[1])
            elif it['t'] == 'table':
                out.append(sum(table_metrics(it, tbs, self.w)[1]))
            elif it['t'] == 'img' and not it['path']:
                out.append(84.0)
            else:
                out.append(None)  # 画像は残りの高さに合わせる
        return out

    def fits(self, items, k):
        hs = self.fixed_heights(items, k)
        fixed = sum(h for h in hs if h is not None) + GAP * (len(items) - 1)
        imgs = sum(1 for h in hs if h is None)
        return fixed + imgs * 72 <= self.h, hs, fixed, imgs

    def plan(self):
        """[(k, items)] を返す。1枚に収まらなければ複数に分ける"""
        for k in [1.0 - 0.04 * i for i in range(10)]:
            ok, *_ = self.fits(self.items, k)
            if ok:
                return [(k, self.items)]
        k = 0.64
        chunks, cur = [], []
        for it in self.items:
            if cur and not self.fits(cur + [it], k)[0]:
                chunks.append(cur)
                cur = []
            cur.append(it)
        chunks.append(cur)
        out = []
        for ch in chunks:
            kk = next((x for x in [1.0 - 0.04 * i for i in range(10)] if self.fits(ch, x)[0]), k)
            out.append((kk, ch))
        return out

    def render(self, slide, items, k, notes):
        ok, hs, fixed, imgs = self.fits(items, k)
        if not ok:
            notes.append('本文が枠に収まりきらない（字は下限まで縮めた）')
        ts, cs, tbs = self.sizes(k)
        img_h = (self.h - fixed - GAP * 0) / imgs if imgs else 0
        y = self.y
        for it, h in zip(items, hs):
            if it['t'] == 'text':
                self.render_text(slide, it['blocks'], ts, y, h)
            elif it['t'] == 'code':
                self.render_code(slide, it, cs, y)
            elif it['t'] == 'table':
                self.render_table(slide, it, tbs, y)
            elif it['t'] == 'img':
                if it['path']:
                    h = self.render_image(slide, it, y, img_h)
                else:
                    self.render_placeholder(slide, it, y, h)
                    notes.append(f'画像 {it["src"]} が見つからないので、手で入れる枠を置いた')
            y += h + GAP

    def render_text(self, slide, group, size, y, h):
        tb = slide.shapes.add_textbox(Emu(int(self.x * PT)), Emu(int(y * PT)), Emu(int(self.w * PT)), Emu(int(h * PT)))
        tb.name = 'body'
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        tf.vertical_anchor = MSO_ANCHOR.TOP
        for i, (t, s, bold, mar, ind, bullet, before) in enumerate(text_items(group, size)):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            para_props(p, s, before=before, marl=mar, indent=ind, bullet=bullet)
            add_runs(p, t, s, INK, bold=bold)

    def render_code(self, slide, b, size, y):
        size, h, pad = code_metrics(b, size, self.w)
        sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(int(self.x * PT)), Emu(int(y * PT)),
                                    Emu(int(self.w * PT)), Emu(int(h * PT)))
        plain_shape(sh)
        sh.name = f'code {b["lang"] or ""}'.strip()
        sh.adjustments[0] = min(0.12, 8 / max(h, 1))
        sh.fill.solid()
        sh.fill.fore_color.rgb = RGBColor.from_string(CODE_BG)
        sh.line.fill.background()
        sh.shadow.inherit = False
        tf = sh.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = Emu(int(pad * PT))
        tf.vertical_anchor = MSO_ANCHOR.TOP
        comment = re.compile(r'(\s#\s.*|^\s*#.*|\s//.*|^\s*//.*)$') if b['lang'] in (
            'bash', 'sh', 'zsh', 'shell', 'python', 'py', 'ruby', 'yaml', 'yml', 'js', 'javascript', 'ts', 'typescript', 'toml') else None
        for i, line in enumerate(b['lines']):
            line = line.expandtabs(4) or ' '
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            para_props(p, size)
            m = comment.search(line) if comment else None
            parts = [(line[:m.start()], CODE_FG), (line[m.start():], CODE_DIM)] if m else [(line, CODE_FG)]
            for text, color in parts:
                if text:
                    add_runs(p, text, size, color, base_mono=True)

    def render_table(self, slide, b, size, y):
        rows = b['rows']
        cols, heights, padx, pady = table_metrics(b, size, self.w)
        gf = slide.shapes.add_table(len(rows), len(cols), Emu(int(self.x * PT)), Emu(int(y * PT)),
                                    Emu(int(self.w * PT)), Emu(int(sum(heights) * PT)))
        gf.name = 'table'
        tbl = gf.table
        tblpr = tbl._tbl.tblPr
        tblpr.set('bandRow', '0')
        sid = tblpr.find(qn('a:tableStyleId'))
        if sid is None:
            sid = etree.SubElement(tblpr, qn('a:tableStyleId'))
        sid.text = '{2D5ABB26-0587-4C30-8999-92F81FD0307C}'  # 罫線なしの素の表。色と罫線はこちらで付ける
        for c, w in enumerate(cols):
            tbl.columns[c].width = Emu(int(w * PT))
        for r, h in enumerate(heights):
            tbl.rows[r].height = Emu(int(h * PT))
            for c in range(len(cols)):
                cell = tbl.cell(r, c)
                cell.margin_left = cell.margin_right = Emu(int(padx * PT))
                cell.margin_top = cell.margin_bottom = Emu(int(pady * PT))
                cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                cell.fill.solid()
                cell.fill.fore_color.rgb = RGBColor.from_string(BLUE if r == 0 else ('FFFFFF' if r % 2 else ROW_ALT))
                tf = cell.text_frame
                tf.word_wrap = True
                p = tf.paragraphs[0]
                para_props(p, size)
                p._p.find(qn('a:pPr')).find(qn('a:lnSpc')).find(qn('a:spcPts')).set('val', str(int(size * 125)))
                add_runs(p, rows[r][c], size, 'FFFFFF' if r == 0 else INK, bold=(r == 0))
                tcpr = cell._tc.get_or_add_tcPr()
                for tag in ('a:lnB', 'a:lnT', 'a:lnR', 'a:lnL'):
                    ln = etree.Element(qn(tag))
                    ln.set('w', str(int(0.75 * PT)))
                    f = etree.SubElement(ln, qn('a:solidFill'))
                    etree.SubElement(f, qn('a:srgbClr')).set('val', LINE)
                    tcpr.insert(0, ln)

    def render_image(self, slide, b, y, avail_h):
        im = Image.open(b['path'])
        im.load()
        if max(im.size) > 1600:
            im.thumbnail((1600, 1600))
        buf = io.BytesIO()
        (im if im.mode in ('RGB', 'RGBA', 'L', 'P') else im.convert('RGB')).save(buf, 'PNG', optimize=True)
        buf.seek(0)
        ratio = im.size[1] / im.size[0]
        w = min(self.w, avail_h / ratio)
        h = w * ratio
        x = self.x + (self.w - w) / 2
        pic = slide.shapes.add_picture(buf, Emu(int(x * PT)), Emu(int(y * PT)), Emu(int(w * PT)), Emu(int(h * PT)))
        pic.name = f'image {b["src"]}'
        pic._element.nvPicPr.cNvPr.set('descr', b['alt'] or b['src'])
        return h

    def render_placeholder(self, slide, b, y, h, x=None, w=None):
        x = self.x if x is None else x
        w = self.w if w is None else w
        sh = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(int(x * PT)), Emu(int(y * PT)), Emu(int(w * PT)), Emu(int(h * PT)))
        plain_shape(sh)
        sh.name = f'image placeholder {b["src"]}'
        sh.fill.solid()
        sh.fill.fore_color.rgb = RGBColor.from_string('F7F8FA')
        sh.line.color.rgb = RGBColor.from_string('A9AEB5')
        sh.line.width = Pt(1.25)
        sh.line.dash_style = MSO_LINE_DASH_STYLE.DASH
        sh.shadow.inherit = False
        tf = sh.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        para_props(p, 13, align='ctr')
        add_runs(p, '画像を手動で挿入', 13, SUB, bold=True)
        p = tf.add_paragraph()
        para_props(p, 10.5, before=3, align='ctr')
        # 狭い枠ではファイル名だけにする
        add_runs(p, f'{b["alt"]}（{b["src"]}）' if b['alt'] and w > 200 else b['src'], 10.5, SUB)


# ---------------------------------------------------------------- 組み立て

KIND_JA = {'cover': '表紙', 'section': '中扉', 'body': '本文', 'closing': '表紙（裏表紙）'}


def build(md_path, template, out):
    md_path = Path(md_path)
    pages = [parse_blocks(p) for p in split_pages(md_path.read_text(encoding='utf-8'))]
    prs = Presentation(template)
    samples = find_samples(prs)
    originals = list(prs.slides)
    report = []

    for idx, blocks in enumerate(pages, 1):
        kind = classify(blocks, idx - 1, len(pages))
        sample_kind = {'closing': 'cover'}.get(kind, kind)
        if sample_kind not in samples:  # 表紙や中扉の見本がなければ本文の見本で代用する
            sample_kind = 'body'
        sample_no, sample = samples[sample_kind]
        heads = [b for b in blocks if b['t'] == 'h']
        notes = []
        made = []

        if sample_kind == 'cover':
            s = clone_slide(prs, sample)
            made.append(s)
            title = heads[0]['text'] if heads else ''
            paras = [b['text'] for b in blocks if b['t'] == 'para']
            fill_token(s, 'title', title, notes)
            fill_token(s, 'subtitle', paras[0] if paras else '', notes)
            fill_token(s, 'presenter', '\n'.join(paras[1:]), notes)
            imgs = [b for b in blocks if b['t'] == 'img']
            if imgs:  # 裏表紙の画像（アンケートの QR など）は右下に置く
                lay = BodyLayout(imgs, 16, (0, 0, 0, 0), md_path.parent)
                side = 1.75 * 72
                x = prs.slide_width / PT - 0.55 * 72 - side
                y = prs.slide_height / PT - 0.45 * 72 - side
                for it in lay.items:
                    if it['path']:
                        lay.x, lay.w = x, side
                        lay.render_image(s, it, y, side)
                    else:
                        lay.render_placeholder(s, it, y, side, x, side)
                        notes.append(f'画像 {it["src"]} が見つからないので、手で入れる枠を置いた')
                    x -= side + 12
            title_text = title
        elif sample_kind == 'section' and kind == 'section':
            s = clone_slide(prs, sample)
            made.append(s)
            fill_token(s, 'section_label', heads[0]['text'], notes)
            fill_token(s, 'section_title', heads[1]['text'], notes)
            title_text = f'{heads[0]["text"]} / {heads[1]["text"]}'
        else:
            title_b = next((b for b in blocks if b['t'] == 'h' and b['level'] <= 2), None)
            rest = [b for b in blocks if b is not title_b]
            title_text = title_b['text'] if title_b else ''
            probe = clone_slide(prs, sample)  # 本文の枠の位置と書式を見本から読む
            body = token_shape(probe, 'body')
            rpr = first_rpr(body)
            base = rpr_size(rpr, 16)
            region = (body.left / PT, body.top / PT, body.width / PT, body.height / PT)
            layout = BodyLayout(rest, base, region, md_path.parent)
            plan = layout.plan()
            if len(plan) > 1:
                notes.append(f'本文が長いので {len(plan)} 枚に分けた')
            for n, (k, items) in enumerate(plan):
                s = probe if n == 0 else clone_slide(prs, sample)
                made.append(s)
                fill_token(s, 'title', title_text + ('（続き）' if n else ''), notes)
                shp = token_shape(s, 'body')
                shp._element.getparent().remove(shp._element)
                if k < 0.999:  # 実際に縮んだ字の大きさを、入っているものだけ書く
                    ts, cs, tbs = layout.sizes(k)
                    kinds = {it['t'] for it in items}
                    parts = [f'{name} {v:g}pt' for name, v, t in (('本文', round(ts, 1), 'text'), ('コード', round(cs, 1), 'code'),
                                                                  ('表', round(tbs, 1), 'table')) if t in kinds]
                    notes.append('字を縮小（' + '・'.join(parts) + '）')
                layout.render(s, items, k, notes)
        report.append({'page': idx, 'title': title_text, 'kind': kind, 'sample': f'{KIND_JA[sample_kind]}（元スライド {sample_no}）',
                       'slides': made, 'notes': notes})

    # テンプレートにもとからあったスライドは外す
    id_list = prs.slides._sldIdLst
    for sld in list(id_list):
        if prs.part.related_part(sld.rId) in [o.part for o in originals]:
            prs.part.drop_rel(sld.rId)
            id_list.remove(sld)

    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(out)

    order = {s.part: i for i, s in enumerate(prs.slides, 1)}
    lines = [f'# {md_path.name} → {out.name}', '', f'テンプレート: {Path(template).name}　原稿 {len(pages)} ページ → スライド {len(prs.slides)} 枚', '',
             '| 原稿 | 見出し | 種類 | 複製元の見本 | スライド | メモ |', '| --- | --- | --- | --- | --- | --- |']
    for r in report:
        nums = ', '.join(str(order[s.part]) for s in r['slides'])
        lines.append(f'| {r["page"]} | {r["title"].replace("|", "／")} | {KIND_JA[r["kind"]]} | {r["sample"]} | {nums} | {"／".join(dict.fromkeys(r["notes"]))} |')
    map_path = out.with_name(out.stem + '-map.md')
    map_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('\n'.join(lines))
    print(f'\n{out}\n{map_path}')
    if not M.jp:
        print('注意: Noto Sans JP が見つからないので、文字幅は概算で見積もった', file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('markdown')
    ap.add_argument('--template', default=str(HERE / 'template.pptx'))
    ap.add_argument('--out')
    a = ap.parse_args()
    out = a.out or str(HERE.parent / 'out' / 'slides' / (Path(a.markdown).stem + '.pptx'))
    build(a.markdown, a.template, out)


if __name__ == '__main__':
    main()
