// First-session check: a brand-new player from launch to the end of room 2.
// Measures time to the first interaction and the first escape, and screenshots each beat.
// Usage: node scripts/e2e/first-session.js <out-dir> [url]
const { chromium } = require('playwright');
const OUT = process.argv[2];
const URL = process.argv[3] ?? 'http://localhost:8099/';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const key = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(260); };
  const results = {};
  const t0 = Date.now();
  await page.goto(URL);
  await page.getByText('Play', { exact: true }).waitFor({ timeout: 30000 });
  results.homeVisibleMs = Date.now() - t0;
  await shot('fs-01-home');
  await page.getByText('Play', { exact: true }).click({ force: true });
  // Room 1 opens straight away: no story card before the first move.
  await page.waitForTimeout(1200);
  results.storyCardBeforeRoom1 = await page.getByText('Skip', { exact: true }).isVisible().catch(() => false);
  await shot('fs-02-room1');
  await key('ArrowRight');
  results.firstInteractionMs = Date.now() - t0;
  // WITNESS speaks on the first move, after the room's opening story line has been read.
  results.witnessOnFirstMove = await page.getByText(/Subject 7 is awake/).waitFor({ timeout: 15000 }).then(() => true, () => false);
  await page.waitForTimeout(900);
  await shot('fs-02b-room1-witness');
  await key('ArrowRight');
  await page.getByText('Escaped!').waitFor({ timeout: 5000 });
  results.firstCompletionMs = Date.now() - t0;
  await page.waitForTimeout(900);
  await shot('fs-03-room1-result');
  results.witnessOnResult = await page.getByText(/Exit reached in 2 moves/).isVisible().catch(() => false);
  results.halePayoffOnResult = await page.getByText(/it was not me/).isVisible().catch(() => false);
  await page.getByText('Next room').click({ force: true });
  await page.getByText('Skip', { exact: true }).waitFor({ timeout: 5000 });
  await shot('fs-04-chapter-card');
  await page.getByText('Skip', { exact: true }).click({ force: true });
  await page.waitForTimeout(600);
  await key('ArrowDown'); // the key
  await page.waitForTimeout(700);
  await shot('fs-05-room2-lights-out');
  await key('ArrowUp');
  await key('ArrowRight');
  await key('ArrowRight'); // through the lock, next to the UV writing
  await page.waitForTimeout(900);
  await shot('fs-06-room2-clue');
  results.clueFound = await page.getByText(/Writing under the paint/).isVisible().catch(() => false);
  await page.waitForTimeout(3500);
  await shot('fs-07-room2-witness');
  await key('ArrowRight');
  await key('ArrowRight');
  await page.getByText('Escaped!').waitFor({ timeout: 5000 });
  await page.waitForTimeout(900);
  await shot('fs-08-room2-result');
  results.errors = errors;
  console.log(JSON.stringify(results, null, 1));
  await browser.close();
})();
