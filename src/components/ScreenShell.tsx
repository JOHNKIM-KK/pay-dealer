import type { ReactNode } from 'react'

export function ScreenShell({
  children,
  footer,
}: {
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#F2F4F6]">
      <div className="flex flex-1 flex-col px-5 pt-6 pb-4">{children}</div>
      {footer ? (
        <div className="sticky bottom-0 bg-gradient-to-t from-[#F2F4F6] via-[#F2F4F6]/95 to-transparent px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {footer}
        </div>
      ) : (
        <div className="h-[env(safe-area-inset-bottom)]" />
      )}
    </div>
  )
}

export function BackButton({
  onClick,
  label = '뒤로',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-5 flex min-h-11 items-center gap-1 self-start text-[15px] font-medium text-[#4E5968]"
    >
      <span aria-hidden className="text-xl leading-none">
        ‹
      </span>
      {label}
    </button>
  )
}

export function ScreenTitle({
  kicker,
  children,
  description,
}: {
  kicker?: string
  children: ReactNode
  description?: string
}) {
  return (
    <header className="mb-8 rise-in">
      {kicker ? (
        <p className="mb-2 text-sm font-semibold tracking-tight text-[#3182F6]">{kicker}</p>
      ) : null}
      <h1 className="text-[28px] leading-tight font-bold tracking-tight text-[#191F28]">
        {children}
      </h1>
      {description ? <p className="mt-2 text-[15px] text-[#8B95A1]">{description}</p> : null}
    </header>
  )
}
