// PLAYWRIGHT_CHANNEL=chrome node tools/check-speech.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async () => {
  const { checkSpeech } = await import('../cli/lib/speech.mjs');
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentdeck-speech-'));
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.pendingAudio = [];
      window.Audio = class {
        pause() {}
        play() { return new Promise((resolve, reject) => pendingAudio.push({ audio: this, resolve, reject })); }
      };
    });
    const url = pathToFileURL(path.resolve(__dirname, '../templates/blank/index.html')).href;
    await page.goto(url);
    // 口語稿規則（deckSpeech）：errors 載入時丟出；warnings 編輯器只警告，check speech 一律算錯。
    const problems = (p, d) => page.evaluate(([p, d]) => deckSpeech.problems(p, d), [p, d]);
    const valid = { speech: '一。二。', cues: [0, 2], record: [{ at: 1, wait: 100 }, { at: 2, clear: true }] };
    assert.deepEqual(await problems(valid, 4), { errors: [], warnings: [] });
    assert.deepEqual((await problems({ ...valid, cues: [0, 0] }, 4)).errors, []);
    assert((await problems({ ...valid, cues: [0, 0] }, 4)).warnings.length);
    assert((await problems({ ...valid, cues: [2, 0] }, 4)).errors.length);
    assert((await problems({ ...valid, cues: [0, 5] }, 4)).warnings.length);
    assert((await problems({ ...valid, cues: [0] }, 4)).warnings.length);
    assert((await problems({ ...valid, record: [{ at: 3, clear: true }] }, 4)).warnings.length);
    assert((await problems({ ...valid, record: [{ at: 1, wait: 1500 }, { at: 1, wait: 1500 }] }, 4)).warnings.length);
    assert((await problems({ ...valid, record: [{ hover: '.x' }] }, 4)).errors.length);
    assert.deepEqual(await page.evaluate(() => deckSpeech.sentences({ speech: '甲。乙<br>丙！' })), ['甲。', '乙', '丙！']);
    await page.evaluate(() => {
      story.pages[1].speech = '測試第一句。測試第二句。';
      story.pages[1].audio = 'test.mp3'; story.pages[1].cues = [0, 2];
      storyReader.go(1);
    });
    await page.keyboard.press('r');
    await page.evaluate(() => pendingAudio.at(-1).reject(new DOMException('blocked', 'NotAllowedError')));
    await page.getByRole('status').filter({ hasText: '瀏覽器未允許' }).waitFor();
    assert.equal(await page.locator('[data-autoplay]').first().getAttribute('aria-pressed'), 'false');
    await page.keyboard.press('r');
    assert.equal(await page.locator('#deck-speech-error').count(), 0);
    await page.keyboard.press('r'); // stop the pending attempt
    await page.keyboard.press('r'); // start a new attempt
    await page.evaluate(() => pendingAudio.at(-2).reject(new DOMException('old', 'AbortError')));
    assert.equal(await page.locator('#deck-speech-error').count(), 0);
    await page.evaluate(() => pendingAudio.at(-1).reject(new Error('unexpected failure')));
    await page.getByRole('status').filter({ hasText: '音訊播放中斷' }).waitFor();
    await page.keyboard.press('p');
    await page.evaluate(() => pendingAudio.at(-1).reject(new DOMException('blocked', 'NotAllowedError')));
    await page.getByRole('status').filter({ hasText: '瀏覽器未允許' }).waitFor();
    assert.equal(await page.locator('[data-autoplay]').first().getAttribute('aria-pressed'), 'false');
    await page.close();
    // A tiny local WAV + actual reader tests metadata and action execution, without TTS.
    const wav = Buffer.alloc(44 + 8000 * 2 * 4);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
    fs.writeFileSync(path.join(temp, 'test.wav'), wav);
    const core = pathToFileURL(path.resolve(__dirname, '../assets/deck/deck-core.js')).href;
    const editor = pathToFileURL(path.resolve(__dirname, '../assets/deck/deck-editor.js')).href;
    const reader = pathToFileURL(path.resolve(__dirname, '../assets/story-reader/reader.js')).href;
    const template = fs.readFileSync(path.resolve(__dirname, '../templates/blank/index.html'), 'utf8');
    const fixture = template.replace(/<script[\s\S]*?<\/script>/g, '').replace('</body>', `<script src="${core}"></script><script>
      const story={title:'測試',pages:[{id:'test',section:'',title:'測試',lead:'',point:'',art:'<button data-key="target">測試</button>',speech:'第一句。第二句。',audio:'test.wav',cues:[0,2],record:[{at:1,click:'[data-key="target"]'},{at:2,box:'[data-key="target"]'}]}]};
      </script><script src="${editor}"></script><script src="${reader}"></script></body>`);
    fs.writeFileSync(path.join(temp, 'index.html'), fixture);
    assert.equal(await checkSpeech(temp, temp, {}, () => {}), true);
    fs.writeFileSync(path.join(temp, 'index.html'), fixture.replace('cues:[0,2]', 'cues:[0,8]').replace("box:'[data-key=\"target\"]'", "box:'[data-key=\"missing\"]'"));
    const logs = [];
    assert.equal(await checkSpeech(temp, temp, {}, s => logs.push(s)), false);
    assert(logs.some(s => s.includes('cues 超過')));
    assert(logs.some(s => s.includes('missing')));
    console.log('PASS speech: cues、音檔、動作目標、拒絕播放提示、停止與重試競爭、連播停止');
  } finally { await browser.close(); fs.rmSync(temp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
