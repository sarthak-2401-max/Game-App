// Captures raw store screenshots from the web build. Usage:
//   node scripts/store/capture.js <baseUrl> <save.json> <outDir> <cssWidth> <cssHeight> <scale>
const fs = require('fs');
const { chromium } = require('playwright');
const SOL = require('../../src/game/levels/solutions.generated.json');
const KEY = { R: 'ArrowRight', L: 'ArrowLeft', U: 'ArrowUp', D: 'ArrowDown', W: ' ' };
const [base, savePath, out, w, h, scale] = process.argv.slice(2);
const save = fs.readFileSync(savePath, 'utf8');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      localStorage.setItem('orl.save', s);
      sessionStorage.setItem('seeded', '1');
    }
  }, save);
  const settle = (ms = 1200) => page.waitForTimeout(ms);
  const home = async () => {
    await page.goto(base);
    await page.getByText(/Continue/).waitFor({ timeout: 20000 });
    await settle(1500);
  };
  const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
  const openRoom = async (n) => {
    await page.getByText('Rooms', { exact: true }).click();
    await settle(600);
    const tile = page.getByLabel(new RegExp(`^Room ${n}, `));
    await tile.scrollIntoViewIfNeeded();
    await tile.click({ force: true });
    await settle(1500);
  };
  const play = async (id, count) => {
    for (const c of SOL[id].slice(0, count)) {
      await page.keyboard.press(KEY[c]);
      await page.waitForTimeout(260);
    }
    await settle(700);
  };

  await home();
  await shot('1-home');

  await page.getByText(/Continue/).click({ force: true });
  await settle(1500);
  await play('r080', 9);
  await shot('2-gameplay');

  await home();
  await openRoom(50);
  await play('r050', 6);
  await shot('3-timer');

  await home();
  await openRoom(60);
  await play('r060', 11);
  await shot('4-drones');

  await home();
  await page.getByText(/Continue/).click({ force: true });
  await settle(1500);
  await play('r080', SOL.r080.length);
  await page.getByText('Escaped!').waitFor({ timeout: 5000 });
  await settle(900);
  await shot('5-escaped');

  await home();
  await page.getByText('Rooms', { exact: true }).click();
  await settle(800);
  await page.getByText('Double Trouble', { exact: true }).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.getByText('Chapter 8', { exact: true }).scrollIntoViewIfNeeded();
  await settle(600);
  await shot('6-rooms');

  await home();
  await page.getByText('Shop', { exact: true }).click();
  await settle(900);
  await shot('7-shop');

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
