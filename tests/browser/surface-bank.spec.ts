import { test, expect, type Page } from '@playwright/test';

const common = ['concrete_moss_diff.webp', 'concrete_moss_nor_dx.webp', 'concrete_moss_rough.webp', 'forest_ground_04_rough.webp', 'armor-albedo.webp', 'rock_ground_diff.webp', 'rock_ground_nor_gl.webp'];
const selected = { 7734: ['forest_ground_04_diff.webp', 'forest_ground_04_nor_gl.webp'], 1926: ['ember-ground.webp'], 4107: ['frost-ground.webp'] };
type Seed = keyof typeof selected;
const all = new Set([...common, ...Object.values(selected).flat()]);
const read = (page: Page) => page.evaluate(() => window.kittyMechDebug!.surfaces());
async function deploy(page: Page, seed: Seed) {
  await page.getByLabel('Select theater').selectOption(String(seed));
  await page.getByRole('button', { name: 'DEPLOY SOLO', exact: true }).click();
  await expect.poll(() => page.evaluate(async expected => {
    const d = window.kittyMechDebug!, s = d.snapshot(), a = s?.actors.find(a => !a.bot), input = await d.input();
    return s?.seed === expected && !!a?.grounded && input.owner?.endsWith(':' + a.id) && (await d.contact()).some(c => c.id === a.id && c.paws.length === 4);
  }, seed), { timeout: 60000 }).toBe(true);
  await expect(page.locator('.loading-overlay')).toHaveCount(0, { timeout: 60000 });
  await expect.poll(() => page.evaluate(() => window.kittyMechDebug!.performance().fps), { timeout: 40000 }).toBeGreaterThan(10);
}
async function leave(page: Page, loading = false) {
  if (loading) await page.getByRole('button', { name: 'Cancel deployment', exact: true }).click();
  else { await page.getByRole('button', { name: 'Pause game', exact: true }).click(); await page.getByRole('button', { name: 'RETURN TO HANGAR', exact: true }).click(); }
  await expect(page.locator('.hangar')).toBeVisible();
  await expect.poll(async () => (await read(page)).mountedConsumers).toBe(0);
  await expect.poll(() => page.evaluate(async () => {
    const d = window.kittyMechDebug!, input = await d.input();
    return d.snapshot() === null && input.pending === 0 && input.sentAt === -1 && (await d.contact()).length === 0;
  })).toBe(true);
}
for (const seed of [7734, 1926, 4107] as const) test(`cold theater ${seed} requests only its shared surface bank while unused theater textures are held`, async ({ page }, info) => {
  test.setTimeout(120000);
  const wanted = new Set([...common, ...selected[seed]]), requests: string[] = [], errors: string[] = [];
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { const name = new URL(r.url()).pathname.split('/').at(-1)!; if (all.has(name)) requests.push(name); });
  await page.route('**/assets/textures/*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1)!;
    if (all.has(name) && !wanted.has(name)) await gate;
    await route.continue();
  });
  try {
    await page.goto('/?debug=1'); await deploy(page, seed);
    const bank = await read(page);
    expect(bank.banks).toHaveLength(1); expect(bank.mountedConsumers).toBeGreaterThan(1);
    expect(bank.banks[0].seed).toBe(seed); expect(bank.banks[0].consumers).toBe(bank.mountedConsumers);
    expect(bank.banks[0].groundUsesRockNormal).toBe(seed !== 7734);
    expect(requests.sort()).toEqual([...wanted].sort());
    const roles = bank.banks[0].roles;
    const expectedFiles = { concrete: common[0], concreteNormal: common[1], concreteRough: common[2], ground: selected[seed][0], groundNormal: seed === 7734 ? selected[7734][1] : common[6], groundRough: common[3], armor: common[4], rock: common[5], rockNormal: common[6] };
    for (const role of Object.keys(expectedFiles) as (keyof typeof expectedFiles)[]) expect(new URL(roles[role].source!).pathname).toBe('/assets/textures/' + expectedFiles[role]);
    for (const [role, texture] of Object.entries(roles)) {
      expect(texture.width).toBeGreaterThan(0); expect(texture.height).toBeGreaterThan(0);
      expect(texture.wrapS).toBe(1000); expect(texture.wrapT).toBe(1000); expect(texture.anisotropy).toBe(4);
      expect(texture.colorSpace).toBe(['concrete', 'armor', 'rock', 'ground'].includes(role) ? 'srgb' : '');
    }
    const detached = await page.evaluate(async () => {
      const d = window.kittyMechDebug!, first = await d.surfaces(), original = JSON.stringify(first);
      first.banks[0].roles.ground.uuid = 'consumer-mutation'; first.banks[0].roles.ground.source = 'consumer-mutation'; first.banks[0].roles.ground.width = -1; first.banks[0].consumers = -1; first.banks.length = 0;
      return { original: JSON.parse(original), second: await d.surfaces() };
    });
    expect(detached.second).toEqual(detached.original);
    await info.attach('committed-surface-bank', { body: JSON.stringify({ bank, requests, scope: 'Committed hook identity and metadata; shader binding and GPU residency are separate observations.' }, null, 2), contentType: 'application/json' });
    await page.screenshot({ path: `test-results/surface-bank-${seed}.png` });
    await leave(page); expect(errors).toEqual([]);
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
});

test('theater revisits reuse common texture identities and release committed consumers', async ({ page }, info) => {
  test.setTimeout(240000); const records = [], owners: string[] = [], errors: string[] = [], requests: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { const name = new URL(r.url()).pathname.split('/').at(-1)!; if (all.has(name)) requests.push(name); });
  await page.goto('/?debug=1');
  for (const seed of [7734, 1926, 4107, 7734] as const) {
    await deploy(page, seed); const bank = await read(page); expect(bank.banks).toHaveLength(1); records.push(bank.banks[0]); owners.push(await page.evaluate(async () => (await window.kittyMechDebug!.input()).owner)); await leave(page);
  }
  for (const role of ['concrete', 'concreteNormal', 'concreteRough', 'groundRough', 'armor', 'rock', 'rockNormal'] as const) expect(new Set(records.map(r => r.roles[role].uuid)).size).toBe(1);
  expect(records[0].roles).toEqual(records[3].roles);
  expect(new Set(owners).size).toBe(4);
  expect(owners.map(owner => Number(owner.split(':')[0])).every((generation, i, generations) => i === 0 || generation > generations[i - 1])).toBe(true);
  expect(requests.sort()).toEqual([...all].sort()); expect(errors).toEqual([]);
  await info.attach('theater-revisit-identities', { body: JSON.stringify({ records, owners, requests }, null, 2), contentType: 'application/json' });
});

test('parallel needed-texture loading cannot resurrect a retired scene', async ({ page }, info) => {
  test.setTimeout(150000); let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), requests: string[] = [], errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { const name = new URL(r.url()).pathname.split('/').at(-1)!; if (all.has(name)) requests.push(name); });
  await page.route('**/forest_ground_04_diff.webp', async route => { await gate; await route.continue(); });
  try {
    await page.goto('/?debug=1'); await page.getByLabel('Select theater').selectOption('7734'); await page.getByRole('button', { name: 'DEPLOY SOLO', exact: true }).click();
    await expect.poll(() => requests.length, { timeout: 30000 }).toBe(9);
    expect(requests.sort()).toEqual([...common, ...selected[7734]].sort());
    await expect(page.getByRole('button', { name: 'Cancel deployment', exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/surface-bank-needed-hold.png' });
    await leave(page, true);
    const response = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/forest_ground_04_diff.webp'));
    release(); await response;
    const retired = [];
    for (let i = 0; i < 6; i++) { await page.waitForTimeout(100); retired.push(await page.evaluate(async () => ({ snapshot: window.kittyMechDebug!.snapshot(), owner: (await window.kittyMechDebug!.input()).owner, surfaces: await window.kittyMechDebug!.surfaces() }))); }
    expect(retired.every(r => r.snapshot === null && r.owner === '' && r.surfaces.mountedConsumers === 0)).toBe(true);
    await deploy(page, 7734); expect(requests.length).toBe(9); await leave(page); expect(errors).toEqual([]);
    await info.attach('needed-texture-retirement', { body: JSON.stringify({ requests, retired }, null, 2), contentType: 'application/json' });
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
});
