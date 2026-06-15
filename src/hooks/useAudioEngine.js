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
  if (!_ctx || _ctx.state === 'closed') _ctx = new AudioContext()
  return _ctx
}

export function useAudioEngine() {
  const audioEnabled = useUiStore((s) => s.audioEnabled)
  const enabledRef   = useRef(audioEnabled)

  useEffect(() => { enabledRef.current = audioEnabled }, [audioEnabled])

  // Proactively resume the AudioContext on every user interaction so the context
  // is already running when effects fire — avoids async resume latency in the hot path.
  useEffect(() => {
    const warmUp = () => {
      if (!_ctx || _ctx.state === 'running') return
      _ctx.resume().catch(() => {})
    }
    document.addEventListener('pointerdown', warmUp, { passive: true })
    return () => document.removeEventListener('pointerdown', warmUp)
  }, [])

  useEffect(() => {
    return subscribeEffects(async (effect) => {
      if (!enabledRef.current) return
      try {
        const ctx = getAudioContext()
        if (ctx.state !== 'running') await ctx.resume()
        playEffectSound(ctx, effect)
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[audio]', err)
      }
    })
  }, [])
}
