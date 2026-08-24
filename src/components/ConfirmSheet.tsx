import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function ConfirmSheet({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  const [leaving, setLeaving] = useState(false)

  const close = useCallback(() => {
    setLeaving(true)
    window.setTimeout(onClose, 180)
  }, [onClose])

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [close])

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        className={`absolute inset-0 bg-black/40 ${leaving ? 'sheet-backdrop-out' : 'sheet-backdrop-in'}`}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-sheet-title"
        className={`relative w-full max-w-md rounded-t-[28px] bg-white px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] ${
          leaving ? 'sheet-out' : 'sheet-in'
        }`}
      >
        <h2 id="confirm-sheet-title" className="text-[22px] font-bold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#8B95A1]">{description}</p>
        <button
          type="button"
          onClick={onConfirm}
          className="pressable mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-[#F04452] text-[17px] font-semibold text-white"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={close}
          className="pressable mt-2 flex h-14 w-full items-center justify-center rounded-2xl bg-[#F2F4F6] text-[17px] font-semibold text-[#4E5968]"
        >
          취소
        </button>
      </div>
    </div>,
    document.body,
  )
}
