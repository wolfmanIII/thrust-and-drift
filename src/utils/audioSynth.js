/**
 * Procedural audio synthesis for combat effects.
 * All functions accept a Web Audio AudioContext and produce one-shot sounds.
 * No audio files — fully synthesized via oscillators, noise, and envelope shaping.
 */

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
  const t   = ctx.currentTime + 0.05
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
  const t = ctx.currentTime + 0.05
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
  const t = ctx.currentTime + 0.05

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
  const t   = ctx.currentTime + 0.05
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
  const t = ctx.currentTime + 0.05
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
  const t   = ctx.currentTime + 0.05
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
    default: break
  }
}
