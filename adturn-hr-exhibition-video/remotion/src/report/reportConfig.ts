// ── レポート紹介動画の個社設定 ──
// 別の企業向けに作るときは、このファイルと public/report/ の紙面PNGを差し替えるだけでよい。
// 紙面は実レポートのスクリーンショット(縦A4推奨)を使うこと。以下はまつや実例のコピー+ダミー紙面。

export type Seg = {t: string; c?: 'cyan' | 'red'};
export type Statement = Seg[][]; // 行 × セグメント

export const REPORT_CONFIG = {
  company: '株式会社まつや',
  reportTitle: '採用戦略レポート〈武器編〉',
  pages: [
    'report/page1.png',
    'report/page2.png',
    'report/page3.png',
    'report/page4.png',
    'report/page5.png',
    'report/page6.png',
  ],
  s1: [[{t: '企業の実力と、'}], [{t: '採用市場での見え方は、'}], [{t: '同じとは限らない。', c: 'cyan'}]] as Statement,
  s2: [[{t: '260年の歴史。', c: 'cyan'}], [{t: '強固な財務基盤。'}]] as Statement,
  s3: [[{t: '採用市場では、'}], [{t: '別人に見えていた。', c: 'red'}]] as Statement,
  s4: [[{t: '「戦う土俵」の'}], [{t: '錯誤である。', c: 'red'}]] as Statement,
  s5: [[{t: '給与や待遇で、'}], [{t: '負けているわけではない。', c: 'cyan'}]] as Statement,
  s6a: [[{t: '訴求すべき自社情報が、'}], [{t: '活かされていない箇所を特定。', c: 'cyan'}]] as Statement,
  s6b: [[{t: 'すでにある価値を、'}], [{t: '求職者に届く言葉へ。', c: 'cyan'}]] as Statement,
  s6c: [[{t: 'どう、読み替えたのか。', c: 'cyan'}]] as Statement,
  killerBefore: '工場作業員',
  killerAfter: 'ソウルフードの守り人',
  s8a: [[{t: '競合がいない、'}], [{t: '空白地帯へ。', c: 'cyan'}]] as Statement,
  s8b: [[{t: '疑問を打ち消さず、'}], [{t: '納得できる言葉で応える。', c: 'cyan'}]] as Statement,
  s8c: [[{t: '具体的な表現にまで。', c: 'cyan'}]] as Statement,
  closing: [[{t: 'トップパフォーマーの知性を、'}], [{t: '組織の武器へ。', c: 'cyan'}]] as Statement,
};
