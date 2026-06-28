import pkg from '/home/spacewolf/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js'
const { chromium } = pkg
import { mkdirSync } from 'fs'

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const page = await browser.newPage()
await page.setViewportSize({ width: 1280, height: 720 })
page.on('pageerror', err => console.error('  PAGE ERROR:', err.message))

const SCRATCHPAD = '/tmp/playwright-thrust'
mkdirSync(SCRATCHPAD, { recursive: true })
const SS = (name) => page.screenshot({ path: `${SCRATCHPAD}/obs-${name}.png` })

// ── Hex pixel helpers (HEX_SIZE=32, initial offset={0,0}) ─────────────────
const HEX_SIZE = 32
const SQRT3    = Math.sqrt(3)
function hexPx(canvas, q, r) {
  return {
    x: canvas.x + HEX_SIZE * 1.5 * q,
    y: canvas.y + HEX_SIZE * (SQRT3 / 2 * q + SQRT3 * r),
  }
}

// ── 1. Setup ───────────────────────────────────────────────────────────────
console.log('\n▶ 1. Dashboard → NEW SESSION')
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.click('text=NEW SESSION')
await page.waitForSelector('canvas', { timeout: 8000 })
console.log('  ✅ Map loaded')

const canvas = page.locator('canvas').first()
const box    = await canvas.boundingBox()

// Enable obstacles (bypass setup-phase guard for test)
await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  useBattleStore.setState({ obstaclesEnabled: true, combatMode: 'vectorial' })
})
console.log('  ✅ obstaclesEnabled=true, combatMode=vectorial')

// ── 2. Place asteroid via UI (right-click hex 6,3 → PlaceObstacleModal) ───
console.log('\n▶ 2. Place Asteroid Field via context menu')
const astPx = hexPx(box, 6, 3)
const candidates2 = [
  [astPx.x, astPx.y], [astPx.x + 16, astPx.y], [astPx.x - 16, astPx.y],
  [astPx.x, astPx.y + 16], [astPx.x, astPx.y - 16],
]
let placedViaUI = false
for (const [tx, ty] of candidates2) {
  await page.mouse.click(tx, ty, { button: 'right' })
  await page.waitForTimeout(400)
  const menuEl = page.locator('.absolute.z-50').first()
  if (await menuEl.isVisible().catch(() => false)) {
    const menuText = await menuEl.textContent()
    if (/Place obstacle/i.test(menuText)) {
      await SS('01-empty-ctx')
      await page.locator('button').filter({ hasText: /Place obstacle/i }).first().click()
      await page.waitForTimeout(400)
      placedViaUI = true
      break
    }
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
}
console.log(placedViaUI
  ? '  ✅ "Place obstacle here" found in context menu'
  : '  ⚠️  Fell back — obstacle will be injected via store')

if (placedViaUI) {
  // Step 1: click type (Asteroid Field)
  const typeBtn = page.locator('button').filter({ hasText: /Asteroid Field/i }).first()
  if (await typeBtn.isVisible().catch(() => false)) {
    await typeBtn.click()
    await page.waitForTimeout(300)
    await SS('02-obstacle-config')
    console.log('  ✅ Type selected: Asteroid Field → config step')

    // Step 2: accept defaults → click PLACE
    const placeBtn = page.locator('button').filter({ hasText: /^PLACE$/i }).first()
    if (await placeBtn.isVisible().catch(() => false)) {
      await placeBtn.click()
      await page.waitForTimeout(400)
      console.log('  ✅ PLACE clicked')
    } else {
      console.log('  ⚠️  PLACE button not found')
      await SS('02b-no-place')
    }
  } else {
    console.log('  ⚠️  PlaceObstacleModal type step not found')
    await SS('02c-no-modal')
  }
} else {
  // Store injection fallback
  await page.evaluate(async () => {
    const { useBattleStore } = await import('/src/store/battleStore.js')
    useBattleStore.getState().addObstacle({ type: 'asteroid_field', position: { q: 6, r: 3 }, radius: 1, density: 'light' })
  })
  console.log('  ✅ Asteroid injected via store (fallback)')
}

// ── 3. Verify obstacle in store ────────────────────────────────────────────
console.log('\n▶ 3. Verify obstacle in store')
const obs = await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  return useBattleStore.getState().obstacles
})
console.log(`  Obstacles: ${obs.length}`, obs.map(o => `${o.type}@(${o.position.q},${o.position.r}) r=${o.radius}`))
console.log(obs.length > 0 ? '  ✅ Obstacle present in store' : '  ❌ No obstacle in store')
await SS('03-obstacle-placed')

// ── 4. Edit obstacle via context menu ─────────────────────────────────────
console.log('\n▶ 4. Edit obstacle via right-click → ObstacleContextMenu')
const editObs = obs[0]
const editPx  = hexPx(box, editObs.position.q, editObs.position.r)
let editFound = false
for (const [tx, ty] of [[editPx.x, editPx.y], [editPx.x + 12, editPx.y], [editPx.x - 12, editPx.y]]) {
  await page.mouse.click(tx, ty, { button: 'right' })
  await page.waitForTimeout(400)
  const ctxEl = page.locator('.absolute.z-50').first()
  if (await ctxEl.isVisible().catch(() => false)) {
    const ctxText = await ctxEl.textContent()
    if (/Edit obstacle/i.test(ctxText)) {
      await SS('04-obstacle-ctx')
      console.log('  ✅ ObstacleContextMenu shown')
      await page.locator('button').filter({ hasText: /Edit obstacle/i }).first().click()
      await page.waitForTimeout(400)
      const editBody = await page.locator('body').textContent()
      console.log(/EDIT OBSTACLE|Asteroid Field|DENSITY|RADIUS/i.test(editBody)
        ? '  ✅ EditObstacleModal opened'
        : '  ⚠️  Edit modal content unclear')
      await SS('04b-edit-modal')
      // Save without changes
      const saveBtn = page.locator('button').filter({ hasText: /^SAVE$/i }).first()
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click()
        await page.waitForTimeout(300)
        console.log('  ✅ SAVE clicked')
      }
      editFound = true
      break
    }
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
}
if (!editFound) console.log('  ⚠️  Edit obstacle not found via right-click')

// ── 5. Thrust targeting mode (canvas) ─────────────────────────────────────
// NOTE: ThrustModal.jsx exists but is NOT in MODAL_MAP — it is dead code.
// Obstacle path warnings in that file are never shown to the user.
// Thrust uses canvas targeting mode via startThrustTargeting(). (⚠ known issue)
console.log('\n▶ 5. Canvas thrust targeting mode — activation + apply')
const shipId5 = await page.evaluate(async () => {
  const { useBattleStore }  = await import('/src/store/battleStore.js')
  const { useProfilesStore } = await import('/src/store/profilesStore.js')
  const profiles = useProfilesStore.getState().profiles
  const profile  = profiles.find(p => p.thrust >= 4) ?? profiles[0]
  useBattleStore.getState().addShip(profile, { q: 5, r: 3 }, 'players', '#00ccff')
  useBattleStore.getState().rollAllInitiative()
  useBattleStore.setState({ phase: 'acceleration', currentActorIndex: 0 })
  const ship = useBattleStore.getState().ships[0]
  return ship.id
})
console.log('  Ship injected at (5,3), phase=acceleration')

// Activate thrust targeting via store
await page.evaluate(async (id) => {
  const { useUiStore } = await import('/src/store/uiStore.js')
  useUiStore.getState().startThrustTargeting(id)
}, shipId5)
await page.waitForTimeout(300)

const targetingState = await page.evaluate(async () => {
  const { useUiStore } = await import('/src/store/uiStore.js')
  return useUiStore.getState().thrustTargeting
})
console.log(targetingState?.shipId
  ? `  ✅ thrustTargeting active for ship ${targetingState.shipId.slice(-8)}`
  : '  ⚠️  thrustTargeting not set')
await SS('05-thrust-targeting')

// Cancel targeting mode
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
const cancelledState = await page.evaluate(async () => {
  const { useUiStore } = await import('/src/store/uiStore.js')
  return useUiStore.getState().thrustTargeting
})
console.log(cancelledState === null ? '  ✅ ESC cancels targeting' : '  ⚠️  Targeting still active')

// ── 6. Movement collision: resolveMovement with vector through asteroid ─────
// Collision triggers when budget is exhausted INSIDE the field (finalPosition in field).
// Asteroid at (6,3) radius=1 covers hexes at dist≤1: (5,3) is one of them.
// Ship at (4,3) vector(2,0): path (4,3)→(5,3)→(6,3), budget=2.
//   (5,3) costs 2 (field) → spent=2 ≤ budget → finalPos=(5,3).
//   (6,3) would cost 4 total > 2 → break. finalPos (5,3) is inside field → collision ✓
console.log('\n▶ 6. Movement collision — ship vector through Asteroid Field')
const collisionResult = await page.evaluate(async (id) => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  const s0 = useBattleStore.getState()
  useBattleStore.setState({
    ships: s0.ships.map(s =>
      s.id === id ? { ...s, position: { q: 4, r: 3 }, vector: { q: 2, r: 0 } } : s
    ),
    pendingObstacleCollisions: [],
  })
  useBattleStore.getState().resolveMovement()
  // pendingObstacleCollisions is written inside setTimeout(animDuration+100) ≈ 2100ms
  await new Promise(r => setTimeout(r, 2500))
  const s2 = useBattleStore.getState()
  return {
    collisions: s2.pendingObstacleCollisions,
    shipPosAfter: s2.ships.find(s => s.id === id)?.position,
  }
}, shipId5)
const collisions = collisionResult.collisions
console.log(`  pendingObstacleCollisions: ${collisions.length}`)
console.log(collisions.length > 0
  ? `  ✅ Collision event queued: ${collisions[0]?.type ?? collisions[0]?.obstacle?.type}`
  : '  ⚠️  No collision event — verify asteroid radius covers path')
await SS('07-after-movement')

// ── 7. Nebula blocks sensor lock ──────────────────────────────────────────
// Place ship in a clean hex (no asteroid overlap), add nebula there.
// nebulaBlocked fires on actorInNebula alone — no target needed.
// Actions list appears after selecting a crew member.
console.log('\n▶ 7. Nebula — sensor_lock disabled for ship inside nebula')
const shipId7 = await page.evaluate(async () => {
  const { useBattleStore }  = await import('/src/store/battleStore.js')
  const { useProfilesStore } = await import('/src/store/profilesStore.js')
  const profiles = useProfilesStore.getState().profiles
  // Build a profile with a sensors crew member — ActionModal expects member.skills[role]
  const baseProfile = profiles[0]
  const profileWithSensors = {
    ...baseProfile,
    crew: [
      { id: 'crew-s1', name: 'Sgt. Kovacs', skills: { sensors: 3 } },
    ],
  }
  useBattleStore.getState().addShip(profileWithSensors, { q: 10, r: 5 }, 'players', '#00ccff')
  // Add nebula centred on ship position
  useBattleStore.getState().addObstacle({ type: 'nebula', position: { q: 10, r: 5 }, radius: 1 })
  // Add enemy target
  useBattleStore.getState().addShip(profiles[1] ?? profiles[0], { q: 15, r: 5 }, 'npc', '#ff4444')
  useBattleStore.setState({ phase: 'actions', currentActorIndex: 0 })
  const ships = useBattleStore.getState().ships
  const actor = ships.find(s => s.faction === 'players' && s.position.q === 10)
  return actor?.id
})
console.log(`  Ship at (10,5) inside nebula, phase=actions`)

await page.evaluate(async (id) => {
  const { useUiStore } = await import('/src/store/uiStore.js')
  useUiStore.getState().openModal('action', { shipId: id })
}, shipId7)
await page.waitForTimeout(500)
await SS('08-action-modal')

// Select first crew member to reveal actions list (name = "Sgt. Kovacs")
const crewBtn = page.locator('button').filter({ hasText: /Kovacs/i }).first()
let crewSelected = false
if (await crewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await crewBtn.click()
  await page.waitForTimeout(300)
  crewSelected = true
  console.log('  Crew member "Sgt. Kovacs" selected')
} else {
  console.log('  ⚠️  Crew member button not found (check profile.crew structure)')
  await SS('08-debug-no-crew')
}
await SS('08b-crew-selected')

const actionBody = await page.locator('body').textContent()
const sensorLockRow  = /sensor.lock/i.test(actionBody)
const hasNebula      = /nebula interference/i.test(actionBody)
console.log(sensorLockRow
  ? (hasNebula ? '  ✅ sensor_lock shows "nebula interference"' : '  ⚠️  sensor_lock visible but no nebula label — check actorInNebula condition')
  : '  ⚠️  sensor_lock action not visible (no crew with sensor_lock ability?)')
await SS('08c-sensor-lock-check')

await page.keyboard.press('Escape')
await page.waitForTimeout(300)

// ── 8. Remove obstacle via context menu ───────────────────────────────────
console.log('\n▶ 8. Remove obstacle via context menu')
const allObs = await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  return useBattleStore.getState().obstacles
})
const firstObs = allObs[0]
const removePx = hexPx(box, firstObs.position.q, firstObs.position.r)
const removeAttempts = [
  [removePx.x, removePx.y], [removePx.x + 12, removePx.y],
  [removePx.x - 12, removePx.y], [removePx.x, removePx.y + 12],
  [removePx.x, removePx.y - 12],
]
let removeFound = false
for (const [tx, ty] of removeAttempts) {
  await page.mouse.click(tx, ty, { button: 'right' })
  await page.waitForTimeout(400)
  const ctxEl = page.locator('.absolute.z-50').first()
  if (await ctxEl.isVisible().catch(() => false)) {
    const ctxText = await ctxEl.textContent()
    console.log(`  Context menu text: "${ctxText?.slice(0,60)}"`)
    if (/Remove obstacle/i.test(ctxText)) {
      await page.locator('button').filter({ hasText: /Remove obstacle/i }).first().click()
      await page.waitForTimeout(300)
      removeFound = true
      console.log('  ✅ "Remove obstacle" clicked via context menu')
      break
    }
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
}
if (!removeFound) {
  // Fallback: remove via store
  const removed = await page.evaluate(async (obsId) => {
    const { useBattleStore } = await import('/src/store/battleStore.js')
    useBattleStore.getState().removeObstacle(obsId)
    return useBattleStore.getState().obstacles.length
  }, firstObs.id)
  console.log(`  ⚠️  Context menu miss — removed via store (remaining: ${removed})`)
  removeFound = true
}

const obsAfter = await page.evaluate(async () => {
  const { useBattleStore } = await import('/src/store/battleStore.js')
  return useBattleStore.getState().obstacles.length
})
console.log(`  Obstacles remaining: ${obsAfter} (was ${allObs.length})`)
console.log(obsAfter < allObs.length ? '  ✅ Obstacle removed from store' : '  ⚠️  Store count unchanged')
await SS('09-after-remove')

await SS('10-final')
await browser.close()
console.log('\n✅ Script completed')
