const { chromium } = require('playwright');
const OUT = process.argv[2];
const SOL = { 1: 'RR', 2: 'DURRRR', 3: 'DDRRRRUU', 4: 'RRDDLLDDRRRRUUUURRDDDD' };
const KEY = { R: 'ArrowRight', L: 'ArrowLeft', U: 'ArrowUp', D: 'ArrowDown', W: ' ' };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const coins = async () => Number((await page.getByLabel(/Escape Coins/).first().getAttribute('aria-label')).split(' ')[0]);
  await page.goto('http://localhost:8098/');
  await page.getByText('Play', { exact: true }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.getByText('Play', { exact: true }).click({ force: true });
  for (let n = 1; n <= 4; n++) {
    await page.waitForTimeout(2500);
    for (const c of SOL[n]) { await page.keyboard.press(KEY[c]); await page.waitForTimeout(170); }
    try { await page.getByText('Escaped!').waitFor({ timeout: 5000 }); } catch (e) { await shot(`fail-room${n}`); throw e; }
    const hasDouble = await page.getByText(/Double it/).count();
    console.log(`room ${n} escaped; double offer visible: ${hasDouble > 0}`);
    if (n < 4) await page.getByText('Next room').click({ force: true });
  }
  const before = await coins();
  await page.getByText(/Double it/).click();
  await page.waitForTimeout(800);
  await shot('20-offer');
  await page.getByText('Watch ad').click();
  await page.getByText('SIMULATED AD · DEVELOPMENT ONLY').waitFor({ timeout: 5000 });
  await shot('21-mock-ad');
  await page.waitForTimeout(3300);
  await page.getByText('Finish ad').click();
  await page.waitForTimeout(800);
  await shot('22-granted');
  const after = await coins();
  console.log('coins before/after double:', before, after);
  console.log('double offer still visible:', await page.getByText(/Double it/).count());
  // Close-early path on the next room's failure revive.
  await page.getByText('Next room').click({ force: true });
  await page.waitForTimeout(800);
  await shot('23-room5');
  console.log('ERRORS', JSON.stringify(errors, null, 1));
  await browser.close();
})();
