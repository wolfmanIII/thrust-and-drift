import pkg from '/home/spacewolf/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js'
const { chromium } = pkg

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const page = await browser.newPage()
await page.setViewportSize({ width: 1280, height: 720 })
page.on('pageerror', err => console.error('  PAGE ERROR:', err.message))

const SCRATCHPAD = '/tmp/playwright-thrust'
import { mkdirSync } from 'fs'
mkdirSync(SCRATCHPAD, { recursive: true })
const SS = (name) => page.screenshot({ path: `${SCRATCHPAD}/b-${name}.png` })

// ── 1. Setup ───────────────────────────────────────────────────────────────
console.log('\n▶ 1. Dashboard → NEW SESSION')
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.click('text=NEW SESSION')
await page.waitForSelector('canvas', { timeout: 8000 })
console.log('  ✅ Map loaded')

// ── 2. Inject ships ────────────────────────────────────────────────────────
console.log('\n▶ 2. Injecting ships (adjacent hexes, attacker thrust ≥ defender)')
const setup = await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  const { useProfilesStore } = await import('/src/store/profilesStore.js')

  const profiles = useProfilesStore.getState().profiles
  // Attacker: high thrust (players). Defender: lower thrust (npc).
  const pA = profiles.find(p => p.thrust >= 4) ?? profiles[0]
  const pD = profiles.find(p => p.thrust <= 2) ?? profiles[1]

  // Off-center: default offset={0,0}, HEX_SIZE=32 → hex(5,3) ≈ px(240,305), well inside viewport
  useBattleStore.getState().addShip(pA, { q: 5, r: 3 }, 'players', '#00ccff')
  useBattleStore.getState().addShip(pD, { q: 6, r: 3 }, 'npc',     '#ff4444')

  const [attacker, defender] = useBattleStore.getState().ships

  // Set initiative order (attacker first) and advance to actions phase
  useBattleStore.getState().rollAllInitiative()
  useBattleStore.setState({
    phase: 'actions',
    initiativeOrder: [attacker.id, defender.id],
    currentActorIndex: 0,
  })

  return {
    attacker: { name: attacker.profile.name, thrust: attacker.profile.thrust, id: attacker.id },
    defender: { name: defender.profile.name, thrust: defender.profile.thrust, id: defender.id },
    phase: useBattleStore.getState().phase,
  }
})
console.log(`  Attacker: ${setup.attacker.name} (thrust ${setup.attacker.thrust})`)
console.log(`  Defender: ${setup.defender.name} (thrust ${setup.defender.thrust})`)
console.log(`  Phase: ${setup.phase}`)
await page.waitForTimeout(400)
await SS('01-actions-phase')

// ── 3. Right-click attacker → Board [defender] ─────────────────────────────
console.log('\n▶ 3. Right-click attacker → Board [defender]')
const canvas = page.locator('canvas').first()
const box    = await canvas.boundingBox()

// hexToPixel(5,3) with HEX_SIZE=32, offset={0,0}: x=240, y≈305
// Try a small radius around the computed position
const HEX_SIZE = 32
const SQRT3 = Math.sqrt(3)
const attackerPx = {
  x: box.x + HEX_SIZE * 1.5 * 5,
  y: box.y + HEX_SIZE * (SQRT3 / 2 * 5 + SQRT3 * 3),
}
const candidates = [
  [attackerPx.x,      attackerPx.y],
  [attackerPx.x + 16, attackerPx.y],
  [attackerPx.x - 16, attackerPx.y],
  [attackerPx.x,      attackerPx.y + 16],
  [attackerPx.x,      attackerPx.y - 16],
]
let foundBoardOption = false
for (const [tx, ty] of candidates) {
  await page.mouse.click(tx, ty, { button: 'right' })
  await page.waitForTimeout(400)
  const menuText = await page.locator('body').textContent()
  if (/BOARD|boarding/i.test(menuText)) {
    await SS('02-context-board')
    await page.locator('text=/BOARD/i').first().click()
    foundBoardOption = true
    console.log('  ✅ BOARD option clicked from context menu')
    break
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
}

if (!foundBoardOption) {
  console.log('  ⚠️  No BOARD in context menu — injecting boarding directly via store')
  await page.evaluate(async () => {
    const { useBattleStore } = await import('/src/store/battleStore.js')
    const [attacker, defender] = useBattleStore.getState().ships
    useBattleStore.getState().startBoarding(attacker.id, defender.id)
  })
  await page.waitForTimeout(400)
}
await SS('03-after-board-click')

// ── 4. BoardingSetupModal ──────────────────────────────────────────────────
console.log('\n▶ 4. BoardingSetupModal')
const setupBody = await page.locator('body').textContent()
const hasSetup = /BOARDING ACTION|Select target|BOARD →/i.test(setupBody)
console.log(hasSetup ? '  ✅ BoardingSetupModal visible' : '  ⚠️  Setup modal not found')

if (hasSetup) {
  await SS('04-boarding-setup')
  // Click the target ship button (BOARD →)
  const boardBtn = page.locator('button').filter({ hasText: /BOARD →/i }).first()
  if (await boardBtn.isVisible().catch(() => false)) {
    await boardBtn.click()
    await page.waitForTimeout(500)
    console.log('  ✅ Target selected')
  }
}
await SS('05-after-setup')

// ── 5. HUD boarding badge ──────────────────────────────────────────────────
console.log('\n▶ 5. HUD boarding badge')
const hudText = await page.locator('body').textContent()
const hasBadge = /⚔.*BOARDING|CONTACT →/i.test(hudText)
console.log(hasBadge ? '  ✅ Boarding badge in HUD' : '  ⚠️  No badge')

const boardingState = await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  const b = useBattleStore.getState().boardings[0]
  return b ? { phase: b.phase, attackerId: b.attackerId, outcome: b.outcome } : null
})
console.log('  Store boarding:', boardingState)
await SS('06-hud-badge')

// ── 6. CONTACT phase ───────────────────────────────────────────────────────
console.log('\n▶ 6. BoardingContactModal')
const contactBtn = page.locator('button').filter({ hasText: /CONTACT →/i }).first()
if (await contactBtn.isVisible().catch(() => false)) {
  await contactBtn.click()
  await page.waitForTimeout(500)
  await SS('07-contact-modal')
  const contactBody = await page.locator('body').textContent()
  console.log(/CONTACT|entry method|airlock|hull.cut/i.test(contactBody)
    ? '  ✅ BoardingContactModal opened'
    : '  ⚠️  Contact modal content unclear')

  // Select an entry method (first available)
  const methodBtns = page.locator('button').filter({ hasText: /airlock|hull.cut|breaching|docking/i })
  const mCount = await methodBtns.count()
  console.log(`  Found ${mCount} entry method buttons`)
  if (mCount > 0) {
    await methodBtns.first().click()
    await page.waitForTimeout(300)
    await SS('08-entry-method-selected')
  }

  // Fill check dice if needed (some methods require a roll)
  const checkInputs = page.locator('input[type=number]')
  const checkN = await checkInputs.count()
  if (checkN > 0) {
    console.log(`  Filling ${checkN} check input(s)`)
    for (let i = 0; i < checkN; i++) await checkInputs.nth(i).fill('4')
  }

  // Advance to Conflict
  const advanceBtn = page.locator('button').filter({ hasText: /ADVANCE TO CONFLICT/i }).first()
  if (await advanceBtn.isVisible().catch(() => false)) {
    await advanceBtn.click()
    await page.waitForTimeout(500)
    console.log('  ✅ Advanced to CONFLICT')
  } else {
    console.log('  ⚠️  ADVANCE TO CONFLICT not found')
    await SS('08b-no-advance')
  }
}
await SS('09-after-contact')

// ── 7. CONFLICT phase ──────────────────────────────────────────────────────
console.log('\n▶ 7. BoardingConflictModal')
const conflictBtn = page.locator('button').filter({ hasText: /CONFLICT →/i }).first()
if (await conflictBtn.isVisible().catch(() => false)) {
  await conflictBtn.click()
  await page.waitForTimeout(500)
  await SS('10-conflict-modal')
  const conflictBody = await page.locator('body').textContent()
  console.log(/CONFLICT|objective|attacker|defender/i.test(conflictBody)
    ? '  ✅ BoardingConflictModal opened'
    : '  ⚠️  Conflict modal unclear')

  // Fill dice inputs
  const conflictInputs = page.locator('input[type=number]')
  const cn = await conflictInputs.count()
  console.log(`  Conflict inputs: ${cn}`)
  for (let i = 0; i < cn; i++) {
    await conflictInputs.nth(i).fill(i % 2 === 0 ? '9' : '4')
  }
  if (cn > 0) await SS('11-conflict-dice')

  // End conflict → security/outcome
  const endConflictBtn = page.locator('button').filter({ hasText: /END CONFLICT|ADVANCE TO SECURITY/i }).first()
  if (await endConflictBtn.isVisible().catch(() => false)) {
    await endConflictBtn.click()
    await page.waitForTimeout(500)
    console.log('  ✅ Advanced to SECURITY/OUTCOME')
  } else {
    console.log('  ⚠️  END CONFLICT button not found')
  }
}
await SS('12-after-conflict')

// ── 8. OUTCOME / SECURITY phase ────────────────────────────────────────────
console.log('\n▶ 8. BoardingOutcomeModal')
const secBtn = page.locator('button').filter({ hasText: /SECURITY →/i }).first()
if (await secBtn.isVisible().catch(() => false)) {
  await secBtn.click()
  await page.waitForTimeout(500)
  await SS('13-outcome-modal')
  const outBody = await page.locator('body').textContent()
  console.log(/SECURITY|OUTCOME|result|captured|repelled/i.test(outBody)
    ? '  ✅ BoardingOutcomeModal opened'
    : '  ⚠️  Outcome modal unclear')
}

// ── 9. 🔍 Probe: ship already in boarding cannot be re-boarded ─────────────
console.log('\n▶ 9. 🔍 Probe: ship in boarding cannot be re-boarded')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
const [boardingInStore] = await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  return useBattleStore.getState().ships.map(s => ({ name: s.profile.name, inBoarding: s.inBoarding }))
})
console.log('  Ships:', await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  return useBattleStore.getState().ships.map(s => `${s.profile.name}: inBoarding=${s.inBoarding}`)
}))

// Try right-clicking attacker again — BOARD option should be gone
for (const [tx, ty] of [[attackerPx.x, attackerPx.y], [attackerPx.x + 16, attackerPx.y], [attackerPx.x - 16, attackerPx.y]]) {
  await page.mouse.click(tx, ty, { button: 'right' })
  await page.waitForTimeout(300)
  // Only inspect the context menu element, not body (body contains "BOARDING" HUD badge)
  const ctxMenu = page.locator('.absolute.z-50').first()
  if (await ctxMenu.isVisible().catch(() => false)) {
    const ctxText = await ctxMenu.textContent()
    // "Board <Name>…" is the menu item label; "BOARDING" in HUD is not a menu item
    const hasBoardAgain = /^Board /m.test(ctxText)
    console.log(hasBoardAgain
      ? '  ⚠️  BOARD option still visible for ship already in boarding'
      : '  ✅ BOARD option correctly absent for ship in boarding')
    await SS('14-no-reboard')
    await page.keyboard.press('Escape')
    break
  }
  await page.keyboard.press('Escape')
}

await SS('15-final')
await browser.close()
console.log('\n✅ Script completed')
