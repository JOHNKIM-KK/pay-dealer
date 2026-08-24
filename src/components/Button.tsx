import type { ReactNode } from 'react'

const base =
  'pressable flex h-14 w-full items-center justify-center rounded-2xl text-[17px] font-semibold disabled:cursor-not-allowed disabled:transform-none'

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} bg-[#3182F6] text-white shadow-[0_8px_20px_rgba(49,130,246,0.28)] disabled:bg-[#D1D6DB] disabled:shadow-none`}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} bg-white text-[#191F28] shadow-[0_1px_2px_rgba(0,0,0,0.04)]`}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={`${base} bg-transparent text-[#4E5968]`}>
      {children}
    </button>
  )
}
