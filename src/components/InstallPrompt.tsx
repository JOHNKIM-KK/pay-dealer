import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.ts'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const dismissed = useGameStore((state) => state.installDismissed)
  const recentGames = useGameStore((state) => state.recentGames)
  const currentGame = useGameStore((state) => state.currentGame)
  const dismissInstall = useGameStore((state) => state.dismissInstall)

  useEffect(() => {
    const onPrompt = (raw: Event) => {
      raw.preventDefault()
      setEvent(raw as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const usedOnce =
    recentGames.length > 0 ||
    (currentGame !== null && (currentGame.rounds.length > 0 || currentGame.gwangSales.length > 0))

  if (!event || dismissed || !usedOnce) return null

  return (
    <section className="mt-6 rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-[15px] font-semibold text-[#191F28]">페이딜러를 홈 화면에 둘까요?</p>
      <p className="mt-1 text-sm text-[#8B95A1]">고스톱 계산기를 다음에 앱처럼 바로 켤 수 있어요.</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="h-11 flex-1 rounded-xl bg-[#3182F6] text-sm font-semibold text-white"
          onClick={async () => {
            await event.prompt()
            dismissInstall()
            setEvent(null)
          }}
        >
          홈 화면에 추가
        </button>
        <button
          type="button"
          className="h-11 flex-1 rounded-xl bg-[#F2F4F6] text-sm font-semibold text-[#4E5968]"
          onClick={dismissInstall}
        >
          괜찮아요
        </button>
      </div>
    </section>
  )
}
