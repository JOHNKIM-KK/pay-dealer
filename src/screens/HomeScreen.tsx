import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { ConfirmSheet } from '../components/ConfirmSheet.tsx'
import { InstallPrompt } from '../components/InstallPrompt.tsx'
import { PrimaryButton, SecondaryButton } from '../components/Button.tsx'
import { ScreenShell } from '../components/ScreenShell.tsx'
import { BRAND } from '../brand.ts'
import { haptic } from '../lib/haptic.ts'
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
  const removeRecentGame = useGameStore((state) => state.removeRecentGame)
  const [pendingDelete, setPendingDelete] = useState<Game | null>(null)

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
        <div className="pt-4 home-hero">
          <BrandMark />
          <h2 className="mt-8 text-[24px] leading-snug font-bold tracking-tight text-[#191F28] home-copy">
            점수만 알려주세요.
            <br />
            계산은 <span className="text-[#3182F6]">{BRAND.ko}</span>가 할게요.
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-[#8B95A1] home-copy-delay">
            {BRAND.description}
          </p>
        </div>

        {hasCurrent && (currentGame.rounds.length > 0 || currentGame.gwangSales.length > 0) ? (
          <p className="mt-6 text-sm text-[#8B95A1]">
            {currentGame.players.map((player) => player.name).join(' · ')} ·{' '}
            {currentGame.rounds.length}판 진행 중
          </p>
        ) : null}

        <InstallPrompt />

        {recentGames.length > 0 ? (
          <section className="mt-8 pb-4 home-list">
            <h2 className="mb-3 text-sm font-semibold text-[#8B95A1]">최근 게임</h2>
            <div className="flex flex-col gap-2">
              {recentGames.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  <button
                    type="button"
                    className="pressable flex min-h-16 min-w-0 flex-1 items-center justify-between px-4 py-3 text-left"
                    onClick={() => {
                      resumeGame(game.id)
                      navigate(continuePath(game))
                    }}
                  >
                    <span>
                      <span className="block font-semibold text-[#191F28]">{gameLabel(game)}</span>
                      <span className="mt-0.5 block text-sm text-[#8B95A1]">
                        {game.rounds.length}판 · {game.status === 'settled' ? '정산 완료' : '이어서'}
                      </span>
                    </span>
                    <span className="ml-3 text-[#D1D6DB]" aria-hidden>
                      ›
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${gameLabel(game)} 게임 삭제`}
                    className="pressable mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#B0B8C1]"
                    onClick={() => {
                      haptic(8)
                      setPendingDelete(game)
                    }}
                  >
                    <span aria-hidden className="text-lg leading-none">
                      ×
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="h-8" />
        )}
      </div>

      {pendingDelete ? (
        <ConfirmSheet
          title="이 게임을 삭제할까요?"
          description={`${gameLabel(pendingDelete)} 기록이 사라져요. 다시 볼 수 없어요.`}
          confirmLabel="삭제하기"
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            haptic(16)
            removeRecentGame(pendingDelete.id)
            setPendingDelete(null)
          }}
        />
      ) : null}
    </ScreenShell>
  )
}
