import { useNavigate } from 'react-router-dom'
import { InstallPrompt } from '../components/InstallPrompt.tsx'
import { PrimaryButton, SecondaryButton } from '../components/Button.tsx'
import { ScreenShell } from '../components/ScreenShell.tsx'
import { useGameStore } from '../store/gameStore.ts'
import type { Game } from '../types/game.ts'

function continuePath(game: Game): string {
  if (game.status === 'setup') return '/setup'
  if (game.status === 'settled') return '/settle'
  return '/play'
}

function gameLabel(game: Game): string {
  return game.players.map((player) => player.name).join(', ')
}

export function HomeScreen() {
  const navigate = useNavigate()
  const currentGame = useGameStore((state) => state.currentGame)
  const recentGames = useGameStore((state) => state.recentGames)
  const startNewGame = useGameStore((state) => state.startNewGame)
  const resumeGame = useGameStore((state) => state.resumeGame)

  const hasCurrent = currentGame !== null

  return (
    <ScreenShell
      footer={
        <div className="flex flex-col gap-2">
          {hasCurrent ? (
            <PrimaryButton onClick={() => navigate(continuePath(currentGame))}>
              이어서 하기
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={() => {
                startNewGame()
                navigate('/setup')
              }}
            >
              새 게임 시작
            </PrimaryButton>
          )}
          {hasCurrent ? (
            <SecondaryButton
              onClick={() => {
                startNewGame()
                navigate('/setup')
              }}
            >
              새 게임 시작
            </SecondaryButton>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center pt-10 text-center">
          <img src="/favicon.svg" alt="" className="h-16 w-16 rounded-[18px] shadow-sm rise-in" />
          <h1 className="mt-6 text-[34px] leading-none font-bold tracking-tight rise-in">고스톱 정산</h1>
          <p className="mt-3 text-[16px] text-[#8B95A1] rise-in">고스톱 계산을 간단하게 해보세요.</p>
        </div>

        {hasCurrent && (currentGame.rounds.length > 0 || currentGame.gwangSales.length > 0) ? (
          <p className="mb-4 text-center text-sm text-[#8B95A1]">
            {currentGame.players.map((player) => player.name).join(' · ')} ·{' '}
            {currentGame.rounds.length}판 진행 중
          </p>
        ) : null}

        <InstallPrompt />

        {recentGames.length > 0 ? (
          <section className="mt-8 pb-4">
            <h2 className="mb-3 text-sm font-semibold text-[#8B95A1]">최근 게임</h2>
            <div className="flex flex-col gap-2">
              {recentGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  className="pressable flex min-h-16 w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  onClick={() => {
                    resumeGame(game.id)
                    navigate(continuePath(game))
                  }}
                >
                  <span className="flex w-full items-center justify-between">
                    <span>
                      <span className="block font-semibold text-[#191F28]">{gameLabel(game)}</span>
                      <span className="mt-0.5 block text-sm text-[#8B95A1]">
                        {game.rounds.length}판 · {game.status === 'settled' ? '정산 완료' : '이어서'}
                      </span>
                    </span>
                    <span className="text-[#D1D6DB]" aria-hidden>
                      ›
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="h-8" />
        )}
      </div>
    </ScreenShell>
  )
}
