// 社員名簿: 役割ごとに決まった名前・部署・席を持つ「正社員」と、
// 名簿にない役割を迎える「派遣スタッフ」（名前はすべて架空）。
'use strict';
window.Roster = (() => {
  const EMPLOYEES = [
    { id: 'president',  name: '社長（あなた）', dept: '社長室',     seat: [3, 2],   body: '#5b4a8a', hair: '#3f3a45' },
    { id: 'secretary',  name: '秘書 つむぎ',    dept: '社長室',     seat: [7, 3],   body: '#c96a8d', hair: '#6b4226' },
    { id: 'editor',     name: '編集 いろは',    dept: '編集室',     seat: [14, 2],  body: '#5f8f4f', hair: '#2f2f2f' },
    { id: 'marketer',   name: 'マーケ あかり',  dept: 'マーケ室',   seat: [35, 2],  body: '#b5568a', hair: '#8a4a2f' },
    { id: 'engineer',   name: '開発 レン',      dept: '開発室',     seat: [6, 11],  body: '#3f6fa8', hair: '#1f1f1f' },
    { id: 'sales',      name: '営業 そら',      dept: '営業部',     seat: [4, 20],  body: '#b8863f', hair: '#4a3520' },
    { id: 'researcher', name: 'リサーチ しおん', dept: 'リサーチ室', seat: [18, 20], body: '#7a5fa8', hair: '#3a2f4a' },
  ];

  // Claude Code のサブエージェント名 → 名簿ID
  const SUBAGENT_MAP = {
    'ai-editor': 'editor',
    'ai-marketer': 'marketer',
    'ai-sales': 'sales',
    'ai-researcher': 'researcher',
    'ai-engineer': 'engineer',
  };

  const TEMP_SEATS = [[12, 11], [18, 11], [24, 11], [30, 11], [36, 11], [12, 13], [24, 13], [36, 13]];
  const TEMP_NAMES = ['ハル', 'ミナト', 'ユキ', 'アオイ', 'リク', 'メイ', 'ソウ', 'ニコ'];
  const TEMP_COLORS = ['#7f8c8d', '#6d8f8a', '#8d7f6c', '#6c7f8d'];
  let tempCount = 0;
  const temps = new Map(); // subagentType -> roster entry

  function byId(id) {
    return EMPLOYEES.find((e) => e.id === id) || [...temps.values()].find((t) => t.id === id) || null;
  }

  // サブエージェントの種類から社員を割り当てる（名簿外は派遣スタッフを自動採番）
  function forSubagent(type) {
    if (SUBAGENT_MAP[type]) return SUBAGENT_MAP[type];
    if (!temps.has(type)) {
      const i = tempCount++;
      temps.set(type, {
        id: 'temp-' + i,
        name: '派遣 ' + (TEMP_NAMES[i % TEMP_NAMES.length]),
        dept: '開発室',
        seat: TEMP_SEATS[i % TEMP_SEATS.length],
        body: TEMP_COLORS[i % TEMP_COLORS.length],
        hair: '#555555',
        temp: true,
      });
    }
    return temps.get(type).id;
  }

  return { EMPLOYEES, byId, forSubagent };
})();
