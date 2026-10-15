// Observer check: from room 30 into the Echo interlude, using a seeded save.
// Plays room 30, follows the result into "The Echo", makes a first attempt, restarts so it
// becomes the echo, wins with the echo holding the plate, then opens the WITNESS Files.
// Usage: node scripts/e2e/observer.js <out-dir> [url]
const { chromium } = require('playwright');
const SOL = require('../../src/game/levels/solutions.generated.json');
const OUT = process.argv[2];
const URL = process.argv[3] ?? 'http://localhost:8099/';
const KEYS = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight', W: ' ' };
const rooms = {};
for (let i = 1; i <= 29; i++) rooms[`r${String(i).padStart(3, '0')}`] = { completed: true, completions: 1, coinsFound: 0, attempts: 1, rewarded: true, stars: 7 };
rooms.o01 = { completed: true, completions: 1, coinsFound: 0, attempts: 1, rewarded: true, stars: 1 };
const SAVE = {
  version: 3,
  coins: 500,
  rooms,
  highestUnlocked: 30,
  tutorialCompleted: true,
  memory: { flags: { 'o01.done': 1, 'o01.route.observer': 1, 'clue.c01': 1, 'clue.sigil1': 1, 'obs.w01': 1, 'sys.starsBackfilled': 1 } },
};
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript((save) => { if (!localStorage.getItem('orl.save')) localStorage.setItem('orl.save', save); }, JSON.stringify(SAVE));
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const play = async (code) => { for (const c of code) { await page.keyboard.press(KEYS[c]); await page.waitForTimeout(240); } };
  const seen = (re) => page.getByText(re).first().waitFor({ timeout: 6000 }).then(() => true, () => false);
  const r = {};
  await page.goto(URL);
  await page.getByText(/Continue · Room 30/).waitFor({ timeout: 30000 });
  await shot('ob-01-home');
  r.homeShowsStars = await page.getByText(/88 \/ 312/).isVisible().catch(() => false);
  r.homeShowsMarks = await page.getByText(/1 \/ 10 marks/).isVisible().catch(() => false);
  await page.getByText(/Continue · Room 30/).click({ force: true });
  await page.waitForTimeout(1500);
  await play(SOL.r030);
  r.room30Won = await seen('Escaped!');
  await page.waitForTimeout(900);
  await shot('ob-02-room30-result');
  r.routesToInterlude = await page.getByText('Something is waiting').isVisible().catch(() => false);
  await page.getByText('Something is waiting').click({ force: true });
  r.interludeLine = await seen(/This cell remembers/);
  await page.waitForTimeout(1500);
  await shot('ob-03-echo-start');
  await play('LLLL');
  await page.keyboard.press('r');
  r.echoLine = await seen(/Your last attempt. I kept it/);
  await page.waitForTimeout(400);
  await shot('ob-04-echo-replaying');
  await play('LLRR');
  await page.waitForTimeout(400);
  await shot('ob-05-echo-holds-plate');
  await play('DDLLLL');
  r.interludeWon = await seen('Observation complete');
  await page.waitForTimeout(900);
  await shot('ob-06-echo-result');
  r.payoffLine = await page.getByText(/one of them held the door/).isVisible().catch(() => false);
  await page.getByText('Main menu').click({ force: true });
  await page.getByText('Journal', { exact: true }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);
  await shot('ob-06b-home-after');
  await page.getByText('Journal', { exact: true }).click({ force: true });
  await page.getByText('WITNESS Files').waitFor({ timeout: 10000 });
  await page.getByText('WITNESS Files').click({ force: true });
  await page.waitForTimeout(800);
  await shot('ob-07-witness-files');
  r.journalHasClue = await page.getByText(/Writing under the paint/).isVisible().catch(() => false);
  r.journalHasHeardLine = await page.getByText(/Your last attempt/).first().isVisible().catch(() => false);
  r.errors = errors;
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
