import { useEffect, useState } from 'react'
import { BRAND, markSplashSeen } from '../brand.ts'

export function SplashScreen({
  hold = false,
  onDone,
}: {
  hold?: boolean
  onDone?: () => void
}) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (hold) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const exitAt = reduce ? 200 : 1500
    const doneAt = reduce ? 280 : 1980

    const exitTimer = window.setTimeout(() => setLeaving(true), exitAt)
    const doneTimer = window.setTimeout(() => {
      markSplashSeen()
      onDone?.()
    }, doneAt)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(doneTimer)
    }
  }, [hold, onDone])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#3182F6] ${
        leaving ? 'splash-leave' : ''
      }`}
      role="img"
      aria-label={`${BRAND.ko} ${BRAND.category}`}
    >
      <img
        src="/favicon.svg"
        alt=""
        className={`h-18 w-18 rounded-[20px] shadow-[0_16px_40px_rgba(0,0,0,0.18)] ${
          hold ? '' : 'splash-logo'
        }`}
      />
      <p
        className={`mt-7 text-[42px] leading-none font-bold tracking-tight text-white ${
          hold ? '' : 'splash-word'
        }`}
      >
        {BRAND.ko}
      </p>
      <p className={`mt-3 text-[15px] font-medium text-white/80 ${hold ? '' : 'splash-sub'}`}>
        {BRAND.category}
      </p>
    </div>
  )
}
