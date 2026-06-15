/**
 * Procedural audio synthesis for combat effects.
 * All functions accept a Web Audio AudioContext and produce one-shot sounds.
 * No audio files — fully synthesized via oscillators, noise, and envelope shaping.
 */

// 100ms lookahead — 50ms was too tight; GC pauses on the main thread can exceed it,
// causing Web Audio to silently drop sounds scheduled in the past.
const LOOKAHEAD = 0.1

/**
 * Create a one-shot white-noise burst.
 * @param {AudioContext} ctx
 * @param {number} durationSec
 * @returns {{ source: AudioBufferSourceNode, buffer: AudioBuffer }}
 */
function noiseBuffer(ctx, durationSec) {
  const length = Math.ceil(ctx.sampleRate * durationSec)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data   = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  return { source, buffer }
}

/** Sci-fi laser beam — descending sawtooth sweep. */
export function playLaserRay(ctx) {
  const t   = ctx.currentTime + LOOKAHEAD
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(900, t)
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.35)

  gain.gain.setValueAtTime(0.18, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.4)
}

/** Kinetic/particle impact — noise burst with low-pass sweep. */
export function playImpactBurst(ctx) {
  const t = ctx.currentTime + LOOKAHEAD
  const { source } = noiseBuffer(ctx, 0.35)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(3000, t)
  filter.frequency.exponentialRampToValueAtTime(150, t + 0.35)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.5, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start(t)
  source.stop(t + 0.35)
}

/** Critical hit — deep rumble + impact layer. */
export function playCriticalFlash(ctx) {
  const t = ctx.currentTime + LOOKAHEAD

  // Low-frequency thud
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(80, t)
  osc.frequency.exponentialRampToValueAtTime(25, t + 0.5)
  gain.gain.setValueAtTime(0.5, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.55)

  // Noise crack on top
  const { source } = noiseBuffer(ctx, 0.15)
  const nFilter = ctx.createBiquadFilter()
  nFilter.type = 'bandpass'
  nFilter.frequency.value = 1200
  nFilter.Q.value = 0.8
  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.4, t)
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
  source.connect(nFilter)
  nFilter.connect(nGain)
  nGain.connect(ctx.destination)
  source.start(t)
  source.stop(t + 0.15)
}

/** Missile launch — ascending whoosh with tail. */
export function playMissileLaunch(ctx) {
  const t   = ctx.currentTime + LOOKAHEAD
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(80, t)
  osc.frequency.exponentialRampToValueAtTime(500, t + 0.35)

  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.25, t + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.55)
}

/** Thrust plume — filtered noise burst, engine texture. */
export function playThrustPlume(ctx) {
  const t = ctx.currentTime + LOOKAHEAD
  const { source } = noiseBuffer(ctx, 0.3)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 350
  filter.Q.value = 0.4

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.18, t + 0.04)
  gain.gain.linearRampToValueAtTime(0.001, t + 0.3)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start(t)
  source.stop(t + 0.3)
}

/** Short UI confirmation tick. */
export function playUiTick(ctx) {
  const t   = ctx.currentTime + LOOKAHEAD
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, t)

  gain.gain.setValueAtTime(0.08, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.08)
}

/** Ship destruction — deep bass thud + mid noise + high crackle. */
export function playExplosion(ctx) {
  const t = ctx.currentTime + LOOKAHEAD

  // Deep bass thud
  const bass     = ctx.createOscillator()
  const bassGain = ctx.createGain()
  bass.type = 'sine'
  bass.frequency.setValueAtTime(60, t)
  bass.frequency.exponentialRampToValueAtTime(18, t + 0.9)
  bassGain.gain.setValueAtTime(0.7, t)
  bassGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0)
  bass.connect(bassGain)
  bassGain.connect(ctx.destination)
  bass.start(t)
  bass.stop(t + 1.0)

  // Mid-range noise burst
  const { source: mid }  = noiseBuffer(ctx, 0.7)
  const midFilter = ctx.createBiquadFilter()
  midFilter.type = 'bandpass'
  midFilter.frequency.setValueAtTime(900, t)
  midFilter.frequency.exponentialRampToValueAtTime(120, t + 0.6)
  midFilter.Q.value = 0.6
  const midGain = ctx.createGain()
  midGain.gain.setValueAtTime(0.6, t)
  midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7)
  mid.connect(midFilter)
  midFilter.connect(midGain)
  midGain.connect(ctx.destination)
  mid.start(t)
  mid.stop(t + 0.7)

  // High crackle transient
  const { source: crackle } = noiseBuffer(ctx, 0.12)
  const hiFilter = ctx.createBiquadFilter()
  hiFilter.type = 'highpass'
  hiFilter.frequency.value = 3200
  const hiGain = ctx.createGain()
  hiGain.gain.setValueAtTime(0.3, t)
  hiGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  crackle.connect(hiFilter)
  hiFilter.connect(hiGain)
  hiGain.connect(ctx.destination)
  crackle.start(t)
  crackle.stop(t + 0.12)
}

/**
 * Dispatch an effect event to the appropriate synth function.
 * No-op for unknown types or visual-only effects (missile_trail).
 * @param {AudioContext} ctx
 * @param {{ type: string }} effect
 */
export function playEffectSound(ctx, effect) {
  switch (effect.type) {
    case 'laser_ray':      return playLaserRay(ctx)
    case 'impact_burst':   return playImpactBurst(ctx)
    case 'critical_flash': return playCriticalFlash(ctx)
    case 'missile_launch': return playMissileLaunch(ctx)
    case 'thrust_plume':   return playThrustPlume(ctx)
    case 'ship_destroyed': return playExplosion(ctx)
    default: break
  }
}
