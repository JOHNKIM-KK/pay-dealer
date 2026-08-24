import { useEffect, useRef, useState } from 'react'
import { formatWon } from '../lib/format.ts'

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function useCountUp(target: number, enabled: boolean): number {
  const [value, setValue] = useState(enabled ? 0 : target)
  const previous = useRef(enabled ? 0 : target)

  useEffect(() => {
    if (!enabled) return

    const from = previous.current
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 520)
      setValue(Math.round(from + (target - from) * easeOutCubic(progress)))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        previous.current = target
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled, target])

  return enabled ? value : target
}

export function AmountText({
  amount,
  className = '',
  size = 'md',
  animate = false,
}: {
  amount: number
  className?: string
  size?: 'md' | 'lg' | 'xl'
  animate?: boolean
}) {
  const shown = useCountUp(amount, animate)
  const color =
    amount > 0 ? 'text-[#3182F6]' : amount < 0 ? 'text-[#F04452]' : 'text-[#8B95A1]'
  const sizeClass =
    size === 'xl'
      ? 'text-[32px] font-bold'
      : size === 'lg'
        ? 'text-xl font-bold'
        : 'text-[17px] font-semibold'

  return (
    <span className={`tabular-nums ${sizeClass} ${color} ${className}`}>
      {formatWon(shown)}
    </span>
  )
}
