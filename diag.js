const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 440, height: 880 } });
  const logs = [];
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  page.on('console', m => logs.push('CONSOLE[' + m.type() + ']: ' + m.text()));
  await page.goto('http://localhost:8099/index.html', { waitUntil: 'networkidle' });
  await sleep(700);

  // open settings
  await page.click('#btn-settings');
  await sleep(600);

  const before = await page.evaluate(() => {
    const ov = document.getElementById('overlay-settings');
    return {
      bound: ov.dataset.bound || null,
      ovActive: ov.classList.contains('active'),
      simAccessible: (typeof Sim !== 'undefined'),
      turboBefore: (typeof Sim !== 'undefined') ? Sim.settings.turboXdr : 'NO_SIM',
      ox: ov.dataset.ox || null,
    };
  });

  // try clicking the switch
  let clickErr = null;
  try { await page.click('[data-toggle="turboXdr"]'); } catch (e) { clickErr = e.message; }
  await sleep(300);

  const afterClick = await page.evaluate(() => {
    const p = document.getElementById('phone');
    const sw = document.querySelector('[data-toggle="turboXdr"]');
    return {
      turboAfter: (typeof Sim !== 'undefined') ? Sim.settings.turboXdr : 'NO_SIM',
      xdrOnClass: p.classList.contains('xdr-on'),
      switchHasOn: sw ? sw.classList.contains('on') : 'no-sw',
    };
  });

  // try calling toggleSetting directly
  let directErr = null;
  try {
    await page.evaluate(() => { toggleSetting(document.querySelector('[data-toggle="turboXdr"]')); });
  } catch (e) { directErr = e.message; }
  await sleep(300);
  const afterDirect = await page.evaluate(() => {
    const p = document.getElementById('phone');
    return { turboDirect: (typeof Sim !== 'undefined') ? Sim.settings.turboXdr : 'NO_SIM', xdrOnDirect: p.classList.contains('xdr-on') };
  });

  // test waveOriginFrom
  const wave = await page.evaluate(() => {
    const r = (typeof waveOriginFrom !== 'undefined') ? waveOriginFrom(document.getElementById('btn-settings')) : 'NO_FN';
    const ov = document.getElementById('overlay-settings');
    return { waveOriginFrom: r, oxNow: ov.dataset.ox };
  });

  console.log(JSON.stringify({ before, clickErr, afterClick, directErr, afterDirect, wave, logs }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e.stack || e); process.exit(1); });
