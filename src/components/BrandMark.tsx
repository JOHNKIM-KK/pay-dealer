import { useState } from 'react'
import { BRAND } from '../brand.ts'
import { haptic } from '../lib/haptic.ts'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const [bump, setBump] = useState(false)

  if (compact) {
    return (
      <div className="flex items-center gap-2.5">
        <img src="/favicon.svg" alt="" className="h-9 w-9 rounded-[10px] shadow-sm" />
        <div>
          <p className="text-[17px] leading-none font-bold tracking-tight">{BRAND.ko}</p>
          <p className="mt-1 text-[12px] leading-none text-[#8B95A1]">{BRAND.category}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        aria-label={`${BRAND.ko} 로고`}
        className="block"
        onClick={() => {
          haptic(10)
          setBump(true)
        }}
      >
        <img
          src="/favicon.svg"
          alt=""
          onAnimationEnd={() => setBump(false)}
          className={`h-16 w-16 rounded-[18px] shadow-[0_12px_28px_rgba(49,130,246,0.32)] ${
            bump ? 'logo-bump' : 'logo-float'
          }`}
        />
      </button>
      <h1 className="mt-5 text-[42px] leading-none font-bold tracking-tight text-[#191F28]">
        {BRAND.ko}
      </h1>
      <p className="mt-3 inline-flex rounded-full bg-[#E8F3FF] px-3 py-1 text-[13px] font-semibold text-[#3182F6]">
        {BRAND.category}
      </p>
    </div>
  )
}
