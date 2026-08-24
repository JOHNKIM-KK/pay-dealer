import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { ConfirmSheet } from '../components/ConfirmSheet.tsx'
import { InstallPrompt } from '../components/InstallPrompt.tsx'
import { PrimaryButton } from '../components/Button.tsx'
import { ScreenShell } from '../components/ScreenShell.tsx'
import { isListedGame } from '../engine/round.ts'
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

function listedGames(current: Game | null, recent: Game[]): Game[] {
  if (!current || !isListedGame(current)) return recent
  return [current, ...recent.filter((game) => game.id !== current.id)]
}

function ChevronIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M7.25 4.5 12.75 10l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function GameGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="11.5" height="14" rx="2.2" fill="currentColor" opacity="0.32" />
      <rect x="8.5" y="4" width="11.5" height="14" rx="2.2" fill="currentColor" />
      <circle cx="14.25" cy="9.5" r="1.6" fill="white" />
    </svg>
  )
}

export function HomeScreen() {
  const navigate = useNavigate()
  const currentGame = useGameStore((state) => state.currentGame)
  const recentGames = useGameStore((state) => state.recentGames)
  const startNewGame = useGameStore((state) => state.startNewGame)
  const resumeGame = useGameStore((state) => state.resumeGame)
  const removeRecentGame = useGameStore((state) => state.removeRecentGame)
  const [pendingDelete, setPendingDelete] = useState<Game | null>(null)
  const [editing, setEditing] = useState(false)
  const games = listedGames(currentGame, recentGames)

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          onClick={() => {
            startNewGame()
            navigate('/setup')
          }}
        >
          새 게임 시작
        </PrimaryButton>
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

        <InstallPrompt />

        {games.length > 0 ? (
          <section className="mt-8 pb-4 home-list">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-[17px] font-bold tracking-tight text-[#191F28]">최근 게임</h2>
              <button
                type="button"
                className="flex h-11 items-center px-1 text-[15px] font-semibold text-[#3182F6]"
                onClick={() => {
                  haptic(8)
                  setEditing((value) => !value)
                }}
              >
                {editing ? '완료' : '편집'}
              </button>
            </div>
            <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              {games.map((game, index) => {
                const settled = game.status === 'settled'
                return (
                  <div
                    key={game.id}
                    className={`flex items-center ${index > 0 ? 'border-t border-[#F2F4F6]' : ''}`}
                  >
                    {editing ? (
                      <button
                        type="button"
                        aria-label={`${gameLabel(game)} 게임 삭제`}
                        className="pressable ml-1.5 flex h-11 w-11 shrink-0 items-center justify-center"
                        onClick={() => {
                          haptic(8)
                          setPendingDelete(game)
                        }}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F04452] text-white">
                          <MinusIcon />
                        </span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      tabIndex={editing ? -1 : 0}
                      aria-disabled={editing}
                      className={`flex min-h-[72px] min-w-0 flex-1 items-center gap-3.5 py-3.5 text-left transition-colors ${
                        editing ? 'px-3 pr-5' : 'px-5 active:bg-[#F2F4F6]'
                      }`}
                      onClick={() => {
                        if (editing) return
                        if (currentGame?.id !== game.id) resumeGame(game.id)
                        navigate(continuePath(game))
                      }}
                    >
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] ${
                          settled ? 'bg-[#F2F4F6] text-[#8B95A1]' : 'bg-[#E8F3FF] text-[#3182F6]'
                        }`}
                      >
                        <GameGlyph />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-semibold tracking-tight text-[#191F28]">
                          {gameLabel(game)}
                        </span>
                        <span className="mt-0.5 block text-[14px] leading-5 text-[#8B95A1]">
                          {game.rounds.length}판 · {settled ? '정산 완료' : '이어서'}
                        </span>
                      </span>
                      {editing ? null : (
                        <span className="shrink-0 text-[#D1D6DB]" aria-hidden>
                          <ChevronIcon />
                        </span>
                      )}
                    </button>
                  </div>
                )
              })}
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
            const lastItem = games.length <= 1
            removeRecentGame(pendingDelete.id)
            setPendingDelete(null)
            if (lastItem) setEditing(false)
          }}
        />
      ) : null}
    </ScreenShell>
  )
}
