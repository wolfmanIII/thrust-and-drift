/**
 * useAudioEngine — singleton Web Audio context + effect subscriber.
 * Mount once in BattleMap. Listens to effectQueue and synthesises sounds.
 * AudioContext is lazily created on first sound to respect browser autoplay policy.
 * Reads audioEnabled from uiStore; no audio is produced when muted.
 */

import { useEffect, useRef } from 'react'
import { useUiStore }       from '../store/uiStore.js'
import { subscribeEffects } from '../utils/effectQueue.js'
import { playEffectSound }  from '../utils/audioSynth.js'

/** Module-level AudioContext — shared across all mounts (HMR-safe ref). */
let _ctx = null

function getAudioContext() {
  if (!_ctx) _ctx = new AudioContext()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

export function useAudioEngine() {
  const audioEnabled = useUiStore((s) => s.audioEnabled)
  const enabledRef   = useRef(audioEnabled)

  useEffect(() => { enabledRef.current = audioEnabled }, [audioEnabled])

  useEffect(() => {
    return subscribeEffects(async (effect) => {
      if (!enabledRef.current) return
      try {
        const ctx = getAudioContext()
        // resume() is async; await it so sound is scheduled only after the
        // context is actually running — avoids silent drops when the browser
        // auto-suspends the context after ~30 s of inactivity.
        if (ctx.state !== 'running') await ctx.resume()
        playEffectSound(ctx, effect)
      } catch {
        // AudioContext may be blocked (no user gesture); fail silently
      }
    })
  }, [])
}
