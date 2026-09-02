// 验证 P1-4/P1-5：电流校准总开关关闭时，预设按钮与滑条必须完全失效，且不得顺带开机
const pw = require('C:/Users/Z/.workbuddy/binaries/node/workspace/node_modules/playwright-core');

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 920, height: 760 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.goto('file:///c:/Users/Z/Downloads/newW2zhuanCyber/web-simulator/index.html');
  await page.waitForTimeout(700);
  // 电池屏懒渲染
  await page.evaluate(() => { if (typeof switchTab === 'function') switchTab(4); });
  await page.waitForTimeout(800);

  const out = {};
  const state = () => page.evaluate(() => ({
    enabled: Sim.battery.multiplierEnabled,
    mult: Sim.battery.currentMultiplier,
    headText: (document.querySelector('#bat-mult') || {}).textContent,
    btnsDisabled: [...document.querySelectorAll('.filter-chip[data-mult-tier]')].map(b => b.disabled),
    sliderDisabled: document.querySelector('#bat-mult-slider').classList.contains('is-disabled')
  }));

  out.initial = await state();

  // 总开关 OFF：点预设（10×）应无效，且不顺带开机
  out.off_clickPreset = await page.evaluate(() => {
    const btn = document.querySelector('.filter-chip[data-mult-tier="10"]');
    btn.click();                                                   // disabled 应拦截
    const afterAttr = { enabled: Sim.battery.multiplierEnabled, mult: Sim.battery.currentMultiplier };
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));  // 绕过 disabled，测 JS 守卫
    return { afterAttr, afterDispatched: { enabled: Sim.battery.multiplierEnabled, mult: Sim.battery.currentMultiplier } };
  });

  // 总开关 OFF：拖滑条应无效
  out.off_dragSlider = await page.evaluate(() => {
    const sl = document.querySelector('#bat-mult-slider');
    sl.classList.add('force');                                    // 即便绕过 pointer-events
    const r = sl.getBoundingClientRect();
    ['pointerdown', 'pointermove', 'pointerup'].forEach(t =>
      sl.dispatchEvent(new MouseEvent(t, { bubbles: true, clientX: r.left + r.width * 0.8, clientY: r.top + r.height / 2 })));
    return { enabled: Sim.battery.multiplierEnabled, mult: Sim.battery.currentMultiplier };
  });

  // 打开总开关 → 预设应生效
  out.on_clickPreset = await page.evaluate(() => {
    const sw = document.querySelector('#bat-mult-sw');
    sw.dispatchEvent(new MouseEvent('click', { bubbles: true }));   // 切开关
    const afterToggle = { enabled: Sim.battery.multiplierEnabled, mult: Sim.battery.currentMultiplier };
    document.querySelector('.filter-chip[data-mult-tier="10"]').click();
    return { afterToggle, afterPreset: { enabled: Sim.battery.multiplierEnabled, mult: Sim.battery.currentMultiplier } };
  });

  out.final = await state();

  await browser.close();
  console.log(JSON.stringify({ errors, out }, null, 2));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
