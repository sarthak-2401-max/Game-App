const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const step = async (name, fn) => { try { await fn(); await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('ok', name); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); } };
  await page.goto('http://localhost:8099/');
  await step('01-home-new', () => page.getByText('Play', { exact: true }).waitFor({ timeout: 15000 }));
  // Room 1 opens with no story card in front of it.
  await step('02-room1', async () => { await page.getByText('Play', { exact: true }).click({ force: true }); await page.waitForTimeout(1200); });
  await step('03-room1-won', async () => { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.press('ArrowRight'); await page.getByText('Escaped!').waitFor({ timeout: 5000 }); });
  await step('04-room2', async () => { await page.getByText('Next room').click({ force: true }); });
  await step('05-room2-fail', async () => {
    // Room 2 is "The Key" (DURRRR). Walk straight right into the lock to show a bump, then pause.
    await page.keyboard.press('Escape');
  });
  await page.reload();
  await step('06-home-continue', () => page.getByText(/Continue · Room 2/).waitFor({ timeout: 15000 }));
  await step('07-levels', async () => { await page.getByText('Rooms', { exact: true }).click(); });
  await step('08-levels-scrolled', async () => { await page.mouse.wheel(0, 3000); });
  await page.goBack().catch(() => {});
  await page.goto('http://localhost:8099/');
  await page.getByText(/Continue/).waitFor({ timeout: 15000 });
  await step('09-shop', async () => { await page.getByText('Shop', { exact: true }).first().click(); });
  await step('10-awards', async () => { await page.getByRole('tab', { name: 'Awards' }).click(); });
  await step('11-daily-tab', async () => { await page.getByRole('tab', { name: 'Daily' }).click(); });
  await step('12-coins-tab', async () => { await page.getByRole('tab', { name: 'Coins' }).click(); });
  await page.goto('http://localhost:8099/');
  await page.getByText(/Continue/).waitFor({ timeout: 15000 });
  await step('13-settings', async () => { await page.getByLabel('Settings').click(); });
  await step('14-reset-confirm', async () => { await page.getByText('Reset all progress').click(); });
  await step('15-reset-confirm2', async () => { await page.getByText('Continue', { exact: true }).click(); });
  await step('16-after-reset', async () => { await page.getByText('Erase everything').click(); await page.getByText('Play', { exact: true }).waitFor({ timeout: 5000 }); });
  await page.goto('http://localhost:8099/');
  await step('17-privacy', async () => { await page.getByLabel('Settings').click(); await page.getByText('Privacy information').click(); });
  await page.goto('http://localhost:8099/');
  await step('18-journal', async () => { await page.getByText('Journal', { exact: true }).waitFor({ timeout: 15000 }); await page.waitForTimeout(600); await page.getByText('Journal', { exact: true }).click({ force: true }); await page.getByText(/entries recovered/).waitFor({ timeout: 5000 }); });
  console.log('ERRORS', JSON.stringify(errors, null, 1));
  await browser.close();
})();
