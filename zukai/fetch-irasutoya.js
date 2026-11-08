#!/usr/bin/env node
// 図版で使う人物を、いらすとやから手元の zukai/assets/ に取ってくる
//
//   node zukai/fetch-irasutoya.js            まだない画像だけ取る
//   node zukai/fetch-irasutoya.js --force    取り直す
//
// いらすとやの素材は、加工の有無にかかわらず再配布が禁止されている。
// だから画像はリポジトリに入れず、使う人がそれぞれ自分の手元に取ってくる。zukai/assets/ は .gitignore 済み。
// 商用で使うときは、1つの作品に使えるのは20点まで（同じ絵の重複は1点）。規約 https://www.irasutoya.com/p/terms.html
//
// 取得には curl を使う（プロキシの設定をそのまま使えるため）。
// man_paper の紙に書かれた「有給休暇申請」の文字は、図版の意味に合わないので白く塗って点線に置き換える。
// この加工には Playwright を使う。入っていなければ加工せずに保存する。

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LIST = [
  { role: 'worker_tired', title: 'パソコンで目が疲れた人のイラスト（男性）',
    page: 'https://www.irasutoya.com/2020/08/blog-post_46.html',
    image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj3QNvWLY09qaIoNmIp9nIlkUKlv4aIbgi_LL8Lyh0RqJLENnY01O53Q-nB0mDXfBFxAjXl-HHRbhiAlTHuL470ZOOvofpD_nIxKxVGPVTxsBd8ZdlR4LwhYas3vatwLDijcdUgbQuDWVCN/s800/eye_ganseihirou_computer_man.png' },
  { role: 'ai_blank', title: '人工知能のキャラクター',
    page: 'https://www.irasutoya.com/2016/12/blog-post_290.html',
    image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj21lb0F7nm96YQ-0t4v6STae8tiNc5HXzpugAPdZHRYcBBR-LpIZsFxezE-jSf9KX0Y5x36z-_hf_uMG4ubCfK4zpOflWL23E1-gYkQLJoncPwn-8W33YJWpHCsOSTqwHSXUsQD8_4HG2F/s800/ai_character.png' },
  { role: 'man_coffee', title: 'いろいろなコーヒーで一服している人のイラスト（男性会社員）',
    page: 'https://www.irasutoya.com/2016/12/blog-post_56.html',
    image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhNYaGM4Dfiwwj0LvMDQqwZyCbqBVpww0_SM2QGHlSu1DmC7Lo23uSBwJM2ljfrQrVlUkCv6pz-JxboEj5TwM_sswyPt4VUNMYbhrndgTS7michxlOf2hLYizqej6dOrf-W4TzJZQbY0kge/s800/coffee_ippuku_businessman1.png' },
  { role: 'ai_desk', title: '学ぶ人工知能のイラスト',
    page: 'https://www.irasutoya.com/2016/12/blog-post_870.html',
    image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg2dvuvi_VSVGkzORLeRYSzJid_WnW87vr8evE0R3UsfUvf-Mp5A9Ck5A6z5Nf8MwklomuG4s8lBtqE0EMieboxTAhyphenhyphenXzN8OGY_DfnFhsA_adweiu-CyYNWHRPrEf9rQ2C2-FAl6h2cTJfB/s800/ai_study_kikaigakusyu.png' },
  { role: 'salesman_run', title: '急いで走る会社員のイラスト（男性）',
    page: 'https://www.irasutoya.com/2018/10/blog-post_991.html',
    image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhFDre9lFwc3r1O42G0-wT4ufjMsKk-nme2IZhZgN4W36e_VbDJe4WSxw9wi0lsErwMdFKfjD0dMINFRChLozSSl-ng76KhUxmA3SNhvWGsh7I2CWky8vN73jYvVQINEZp202OAMmVoCmf2/s800/run_businessman_aseru.png' },
  { role: 'man_paper', title: '有給休暇を申請する人のイラスト（男性）',
    page: 'https://www.irasutoya.com/2018/04/blog-post_912.html',
    image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgLHjK1cK3Yg86FvAzH_FQ_2sIei1GY5XNXBp2on-8pnq5NOveR8iGSuF4-PCI6GCjxNjFjOwjCVa6S4OZgMMDHz6beIvPkwTLBjZMaNaBGYwH-r4KKZ1aboBRzfJEKtRNR4iRlgyti4wg/s800/yuukyuu_shinsei_man.png',
    // 紙の下半分にある文字の範囲（画像の幅・高さに対する割合）
    mask: { x0: 74 / 288, y0: 344 / 400, x1: 209 / 288, y1: 382 / 400, rows: [354 / 400, 368 / 400] } },
  { role: 'boss_crossed', title: '考え事をしている男性会社員のイラスト',
    page: 'https://www.irasutoya.com/2013/03/blog-post_7497.html',
    image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjOk9eOPvqEClDGLB3wpGDccYDQcRDrBAaB7o4gWqdrfIKsqJY79RRPloj5qZM4-uNstWBdaxA7txXU-CWsi5nu6bIwvCvZ1BEXnfRh79JNBjVKUT09XsiKgvBA76wiO0xONNEi2eA_MRtA/s800/businessman2_kangaechu.png' },
];

const dir = process.env.ZUKAI_ASSETS ? path.resolve(process.env.ZUKAI_ASSETS) : path.join(__dirname, 'assets');
const force = process.argv.includes('--force');

// 紙の文字を白で塗り、表と同じ点線を2行描く。ブラウザの canvas で加工する
async function applyMask(file, m) {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.log('  Playwright がないので、紙の文字は消さずに保存した');
    return;
  }
  const browser = await chromium.launch();
  try {
    const p = await browser.newPage();
    const dataUrl = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
    const out = await p.evaluate(async ({ dataUrl, m }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const W = c.width, H = c.height;
      g.fillStyle = '#fff';
      g.fillRect(m.x0 * W, m.y0 * H, (m.x1 - m.x0) * W, (m.y1 - m.y0) * H);
      g.fillStyle = '#545860';
      const dot = W / 288;
      for (const y of m.rows) for (let x = 92 / 288 * W; x < 196 / 288 * W; x += 9 * dot) g.fillRect(x, y * H, 5 * dot, 3 * dot);
      return c.toDataURL('image/png');
    }, { dataUrl, m });
    fs.writeFileSync(file, Buffer.from(out.split(',')[1], 'base64'));
    console.log('  紙の「有給休暇申請」の文字を点線に置き換えた');
  } finally {
    await browser.close();
  }
}

(async () => {
  fs.mkdirSync(dir, { recursive: true });
  for (const it of LIST) {
    const file = path.join(dir, `${it.role}.png`);
    if (fs.existsSync(file) && !force) { console.log(`あり   ${it.role}.png`); continue; }
    execFileSync('curl', ['-sSfL', '-m', '60', '-A', 'Mozilla/5.0', '-o', file, it.image]);
    console.log(`取得   ${it.role}.png  ${it.title}  ${it.page}`);
    if (it.mask) await applyMask(file, it.mask);
  }
  console.log(`\n${path.relative(process.cwd(), dir)}/ に ${LIST.length} 点。商用で使うなら1作品20点まで（いらすとやの規約）`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
