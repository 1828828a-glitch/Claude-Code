#!/usr/bin/env python3
"""md2slides 用の見本テンプレート（template.pptx）を作る

表紙・中扉・本文の見本スライドを1枚ずつ持つ 16:9（10 × 5.625 インチ、Google スライドの標準）の .pptx。
差し替える場所には {{title}} のような目印の文字を入れてある。md2slides.py はこの目印で見本の種類と枠を見分けるので、
自分のテンプレートを使うときも、見本スライドに同じ目印を書けばよい。

  表紙  {{title}} {{subtitle}} {{presenter}}
  中扉  {{section_label}} {{section_title}}
  本文  {{title}} {{body}}

使い方: python3 zukai/slides/make_template.py [出力先]（既定は zukai/slides/template.pptx）
"""
from pathlib import Path
import sys

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt
from lxml import etree

BLUE = RGBColor(0x0A, 0x57, 0xBF)
BLUE_SOFT = RGBColor(0x2C, 0x6E, 0xCC)
PALE = RGBColor(0xDC, 0xE7, 0xF7)
INK = RGBColor(0x40, 0x40, 0x40)
SUB = RGBColor(0x6B, 0x70, 0x76)
FILL = RGBColor(0xF2, 0xF3, 0xF5)
RING = RGBColor(0xE3, 0xE6, 0xEA)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
FONT = 'Noto Sans JP'


def set_run(run, size, color, bold=False):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = FONT
    rpr = run._r.get_or_add_rPr()
    for tag in ('a:ea', 'a:cs'):
        el = rpr.find(qn(tag))
        if el is None:
            el = etree.SubElement(rpr, qn(tag))
        el.set('typeface', FONT)


def text_box(slide, name, x, y, w, h, text, size, color, bold=False, anchor=MSO_ANCHOR.TOP, align=PP_ALIGN.LEFT):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tb.name = name
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    p = tf.paragraphs[0]
    p.alignment = align
    set_run(p.add_run(), size, color, bold)
    p.runs[0].text = text
    return tb


def ring(slide, x, y, d, color, width_pt):
    """飾りの輪。表紙と中扉の右側に、半分はみ出す形で置く"""
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(d), Inches(d))
    s.name = 'deco'
    st = s._element.find(qn('p:style'))  # 既定スタイルの影を外す
    if st is not None:
        s._element.remove(st)
    s.fill.background()
    s.line.color.rgb = color
    s.line.width = Pt(width_pt)
    s.shadow.inherit = False
    return s


def slide_number(slide):
    """右下のページ番号。スライド番号のフィールドなので、複製したスライドでも自分の番号になる"""
    tb = slide.shapes.add_textbox(Inches(8.9), Inches(5.18), Inches(0.6), Inches(0.28))
    tb.name = 'slide_number'
    tf = tb.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.RIGHT
    fld = etree.SubElement(p._p, qn('a:fld'))
    fld.set('id', '{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}')
    fld.set('type', 'slidenum')
    rpr = etree.SubElement(fld, qn('a:rPr'))
    rpr.set('lang', 'ja-JP')
    rpr.set('sz', '1000')
    fill = etree.SubElement(rpr, qn('a:solidFill'))
    etree.SubElement(fill, qn('a:srgbClr')).set('val', '6B7076')
    etree.SubElement(rpr, qn('a:latin')).set('typeface', FONT)
    etree.SubElement(fld, qn('a:t')).text = '‹#›'


def background(slide, color):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = color


def main(out):
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(10), Inches(5.625)
    blank = prs.slide_layouts[6]

    # 表紙（裏表紙にも使う）
    s = prs.slides.add_slide(blank)
    background(s, BLUE)
    ring(s, 6.9, -1.6, 5.2, BLUE_SOFT, 28)
    ring(s, 8.2, 3.3, 3.0, BLUE_SOFT, 18)
    text_box(s, 'title', 0.6, 1.25, 7.6, 1.8, '{{title}}', 32, WHITE, bold=True, anchor=MSO_ANCHOR.BOTTOM)
    text_box(s, 'subtitle', 0.6, 3.2, 7.6, 0.5, '{{subtitle}}', 16, PALE)
    text_box(s, 'presenter', 0.6, 4.3, 7.0, 0.75, '{{presenter}}', 12, PALE, anchor=MSO_ANCHOR.BOTTOM)

    # 中扉
    s = prs.slides.add_slide(blank)
    background(s, FILL)
    ring(s, 6.9, -1.6, 5.2, RING, 28)
    ring(s, 8.2, 3.3, 3.0, RING, 18)
    text_box(s, 'section_label', 0.8, 1.75, 7.4, 0.5, '{{section_label}}', 18, BLUE, bold=True)
    text_box(s, 'section_title', 0.8, 2.3, 7.4, 1.5, '{{section_title}}', 30, INK, bold=True)

    # 本文
    s = prs.slides.add_slide(blank)
    background(s, WHITE)
    text_box(s, 'title', 0.5, 0.3, 9.0, 0.65, '{{title}}', 24, INK, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    text_box(s, 'body', 0.5, 1.15, 9.0, 3.9, '{{body}}', 16, INK)
    slide_number(s)

    prs.save(out)
    print(out)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).with_name('template.pptx')))
