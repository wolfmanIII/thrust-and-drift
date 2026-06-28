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
const SS = (name) => page.screenshot({ path: `${SCRATCHPAD}/${name}.png` })

const storeEval = (fn) => page.evaluate(async (fnStr) => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  return eval(`(${fnStr})(useBattleStore)`)
}, fn.toString())

// ── 1. Dashboard → NEW SESSION ─────────────────────────────────────────────
console.log('\n▶ 1. Dashboard → NEW SESSION')
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.click('text=NEW SESSION')
await page.waitForSelector('canvas', { timeout: 8000 })
console.log('  ✅ Map loaded')

// ── 2. Inject two ships at same hex ───────────────────────────────────────
console.log('\n▶ 2. Injecting ships + advancing to movement phase')
const setup = await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  const { useProfilesStore } = await import('/src/store/profilesStore.js')

  const profiles = useProfilesStore.getState().profiles
  const pA = profiles[0] ?? { id: 'pA', name: 'Viper',  hull: 20, armor: 2, thrust: 4, tonnage: 100, turrets: [], crew: [] }
  const pB = profiles[1] ?? { id: 'pB', name: 'Raider', hull: 20, armor: 2, thrust: 4, tonnage: 100, turrets: [], crew: [] }

  // Place both ships on same hex
  useBattleStore.getState().addShip(pA, { q: 0, r: 0 }, 'players', '#00ccff')
  useBattleStore.getState().addShip(pB, { q: 0, r: 0 }, 'npc',     '#ff4444')

  // Roll initiative (auto-fills for all)
  useBattleStore.getState().rollAllInitiative()

  // Advance to movement phase directly (detection fires on movement→attack transition via UI)
  useBattleStore.setState({ phase: 'movement' })

  return {
    ships: useBattleStore.getState().ships.map(s => ({ name: s.profile.name, pos: s.position, faction: s.faction })),
    phase: useBattleStore.getState().phase,
  }
})
console.log('  Ships:', setup.ships)
console.log('  Phase:', setup.phase)
await page.waitForTimeout(400)
await SS('01-movement-phase')

// ── 3. NEXT PHASE: movement → attack (triggers dogfight detection) ─────────
console.log('\n▶ 3. movement → attack (detection fires)')
const nextBtn = page.locator('button').filter({ hasText: /NEXT PHASE/i }).first()
if (!await nextBtn.isVisible().catch(() => false)) {
  console.error('  ❌ NEXT PHASE button not found')
  await SS('error-no-next-phase')
  await browser.close(); process.exit(1)
}
await nextBtn.click()
await page.waitForTimeout(800)
await SS('02-after-advance')

// ── 4. DogfightNotificationModal ───────────────────────────────────────────
console.log('\n▶ 4. DogfightNotificationModal')
const body2 = await page.locator('body').textContent()
const hasModal = /DOGFIGHT|ENGAGEMENT|INTENT|PURSUE|EVADE/i.test(body2)
console.log(hasModal ? '  ✅ Notification modal visible' : '  ⚠️  Modal not detected')

if (hasModal) {
  await SS('03-notification-modal')
  // Set both ships to "engage"
  const yesButtons = page.locator('button').filter({ hasText: /YES|ENGAGE|PURSUE/i })
  const yesCount = await yesButtons.count()
  console.log(`  Found ${yesCount} YES/ENGAGE buttons`)
  for (let i = 0; i < yesCount; i++) {
    await yesButtons.nth(i).click()
    await page.waitForTimeout(300)
  }
  await SS('04-intents-set')

  // Step 1: CONFIRM INTENTS →
  const confirmIntentsBtn = page.locator('button').filter({ hasText: /CONFIRM INTENTS/i }).first()
  if (await confirmIntentsBtn.isVisible().catch(() => false)) {
    await confirmIntentsBtn.click()
    await page.waitForTimeout(500)
    console.log('  ✅ CONFIRM INTENTS clicked')
  }

  // Step 2: second CONFIRM → on "DOGFIGHT ACTIVE" screen
  await SS('04b-dogfight-active')
  const confirmFinalBtn = page.locator('button').filter({ hasText: /^CONFIRM/i }).first()
  if (await confirmFinalBtn.isVisible().catch(() => false)) {
    await confirmFinalBtn.click()
    await page.waitForTimeout(600)
    console.log('  ✅ Dogfight activated (final confirm)')
  }
}
await SS('05-after-notification')

// ── 5. HUD dogfight tracker ────────────────────────────────────────────────
console.log('\n▶ 5. HUD tracker')
const hud = await page.locator('body').textContent()
const hasTracker = /MICRO.ROUND|⚔.*DOGFIGHT/i.test(hud)
console.log(hasTracker ? '  ✅ ⚔ DOGFIGHT tracker in HUD' : '  ⚠️  No tracker visible')

// Check store dogfights state
const dogfights = await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  return useBattleStore.getState().dogfights
})
console.log(`  Store dogfights: ${dogfights.length} active`)
await SS('06-hud-tracker')

// ── 6. Open DogfightRoundModal ─────────────────────────────────────────────
console.log('\n▶ 6. DogfightRoundModal')
const microBtn = page.locator('button').filter({ hasText: /MICRO.ROUND/i }).first()
if (await microBtn.isVisible().catch(() => false)) {
  await microBtn.click()
  await page.waitForTimeout(600)
  await SS('07-round-modal')
  const modalText = await page.locator('body').textContent()
  console.log(/PILOT|DEX|ROLL|MARGIN|MICRO/i.test(modalText)
    ? '  ✅ DogfightRoundModal opened'
    : '  ⚠️  Modal opened but content unclear')
} else {
  console.log('  ⚠️  No MICRO-ROUND button')
  await SS('07-no-modal-btn')
}

// ── 7. Dogfight round — step 1: escape intent, step 2: pilot check ─────────
console.log('\n▶ 7. Micro-round — escape intent → pilot check')

// Step 1: both ships STAY (no escape) → click NO ESCAPE →
const noEscapeBtn = page.locator('button').filter({ hasText: /NO ESCAPE|NO.*ESCAPE/i }).first()
if (await noEscapeBtn.isVisible().catch(() => false)) {
  await noEscapeBtn.click()
  await page.waitForTimeout(500)
  console.log('  ✅ NO ESCAPE → clicked (advancing to pilot check)')
  await SS('08-pilot-check-step')
}

// Step 2: Pilot check — fill dice for both ships
const inputs = page.locator('input[type=number]')
const n = await inputs.count()
console.log(`  Pilot check inputs: ${n}`)
if (n >= 1) {
  // Fill ALL inputs (2D6 per ship = 4 inputs total, or 1 per ship = 2)
  const values = ['5', '4', '3', '2', '1']
  for (let i = 0; i < n; i++) {
    await inputs.nth(i).fill(values[i] ?? '4')
  }
  await SS('08b-dice-filled')
  const resolveBtn = page.locator('button').filter({ hasText: /RESOLVE|CONFIRM|NEXT ROUND|APPLY/i }).first()
  if (await resolveBtn.isVisible().catch(() => false)) {
    await resolveBtn.click()
    await page.waitForTimeout(500)
    console.log('  ✅ Micro-round resolved')
    await SS('09-round-resolved')
  } else {
    console.log('  ⚠️  No resolve button')
    await SS('09-no-resolve')
  }
} else {
  console.log(`  ⚠️  Expected ≥2 inputs, found ${n}`)
  await SS('08-unexpected-state')
}

// ── 8. 🔍 Probe: Attack phase — dogfight ships excluded ────────────────────
console.log('\n▶ 8. 🔍 Standard attack phase — dogfight ships excluded?')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

// Check if ships are marked inDogfight in store
const shipStates = await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  return useBattleStore.getState().ships.map(s => ({ name: s.profile.name, inDogfight: s.inDogfight }))
})
console.log('  Ship dogfight states:', shipStates)

// Advance to attack phase and check no attack modal for dogfight ships
await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  useBattleStore.setState({ phase: 'attack', currentActorIndex: 0 })
})
await page.waitForTimeout(400)
await SS('10-attack-phase')
const attackText = await page.locator('body').textContent()
const hasAttackModal = /SELECT.*WEAPON|CHOOSE.*TARGET|FIRE.*WEAPON/i.test(attackText)
console.log(hasAttackModal
  ? '  ⚠️  Attack modal visible for dogfight ship'
  : '  ✅ No standard attack modal for dogfight ships')

// ── 9. 🔍 Probe: Escape check ─────────────────────────────────────────────
console.log('\n▶ 9. 🔍 Escape/Disengage')
await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  useBattleStore.setState({ phase: 'actions', currentActorIndex: 0 })
})
await page.waitForTimeout(400)
await SS('11-actions-phase')
const actText = await page.locator('body').textContent()
const hasEscape = /escape|ESCAPE|disengage|DISENGAGE/i.test(actText)
console.log(hasEscape ? '  ✅ Escape option visible in actions' : '  ℹ️  Escape not visible directly — check context menu')

// Right-click on canvas to look for escape in context menu
const canvas = page.locator('canvas').first()
const box = await canvas.boundingBox()
if (box) {
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' })
  await page.waitForTimeout(400)
  await SS('12-escape-ctx-menu')
  const ctxText = await page.locator('body').textContent()
  const escapeInMenu = /escape|ESCAPE|disengage/i.test(ctxText)
  console.log(escapeInMenu ? '  ✅ Escape in context menu' : '  ℹ️  No escape in context menu at centre')
  await page.keyboard.press('Escape')
}

await SS('13-final')
await browser.close()
console.log('\n✅ Script completed')
