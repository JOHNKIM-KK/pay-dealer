import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PrimaryButton, SecondaryButton } from '../components/Button.tsx'
import { BackButton, ScreenShell, ScreenTitle } from '../components/ScreenShell.tsx'
import { StepDots } from '../components/StepDots.tsx'
import { gwangBuyers } from '../engine/gwang.ts'
import {
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  defaultScoreForPlayerCount,
  gameModeLabel,
  isGoRule,
  isLoserRule,
} from '../engine/rules.ts'
import { formatRuleValue, formatWonPlain, subjectGa } from '../lib/format.ts'
import { haptic } from '../lib/haptic.ts'
import { useGameStore } from '../store/gameStore.ts'
import type { Game, Player } from '../types/game.ts'

function seatedPlayers(game: Game): Player[] {
  const seated = new Set(game.participantIds)
  return game.players.filter((player) => seated.has(player.id))
}

export function PlayScreen() {
  const game = useGameStore((state) => state.currentGame)
  const draft = useGameStore((state) => state.draftRound)

  if (!game) return <Navigate to="/" replace />
  if (game.status === 'setup') return <Navigate to="/setup" replace />
  if (game.status === 'settled') return <Navigate to="/settle" replace />

  if (draft.step === 'seat') return <SeatStep />
  if (draft.step === 'gwang') return <GwangStep />
  if (draft.step === 'score') return <ScoreStep />
  if (draft.step === 'penalties') return <PenaltyStep />
  return <WinnerStep />
}

function SeatStep() {
  const navigate = useNavigate()
  const game = useGameStore((state) => state.currentGame)!
  const toggleParticipant = useGameStore((state) => state.toggleParticipant)
  const addNamedPlayer = useGameStore((state) => state.addNamedPlayer)
  const confirmSeats = useGameStore((state) => state.confirmSeats)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const count = game.participantIds.length
  const canStart = count >= MIN_PARTICIPANTS && count <= MAX_PARTICIPANTS

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          disabled={!canStart}
          onClick={() => {
            haptic(12)
            confirmSeats()
          }}
        >
          {count >= MAX_PARTICIPANTS ? '광팔기로' : '이번 판 시작'}
        </PrimaryButton>
      }
    >
      <BackButton
        label={game.rounds.length > 0 || game.gwangSales.length > 0 ? '현황' : '홈'}
        onClick={() =>
          navigate(game.rounds.length > 0 || game.gwangSales.length > 0 ? '/summary' : '/')
        }
      />
      <ScreenTitle
        kicker={`${count} / ${MAX_PARTICIPANTS}명`}
        description="대기 명단에서 이번 판에 앉을 사람을 고르세요. 최대 4명."
      >
        누가 치나요?
      </ScreenTitle>

      <div className="step-in flex flex-col gap-2">
        {game.players.map((player) => {
          const on = game.participantIds.includes(player.id)
          return (
            <button
              key={player.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                haptic(10)
                toggleParticipant(player.id)
              }}
              className={`pressable flex min-h-14 items-center justify-between rounded-2xl px-4 text-left ${
                on
                  ? 'bg-[#3182F6] text-white shadow-[0_8px_18px_rgba(49,130,246,0.28)]'
                  : 'bg-white text-[#191F28]'
              }`}
            >
              <span className="font-semibold">{player.name}</span>
              <span className={`text-sm ${on ? 'text-white/80' : 'text-[#8B95A1]'}`}>
                {on ? '참가' : '대기'}
              </span>
            </button>
          )
        })}
      </div>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (addNamedPlayer(name)) {
            setName('')
            setError('')
            haptic(10)
            return
          }
          setError('비어 있거나 이미 있는 이름이에요.')
        }}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="이름 추가"
          aria-label="대기 명단에 이름 추가"
          className="h-14 min-w-0 flex-1 rounded-2xl bg-white px-4 text-[16px] outline-none ring-[#3182F6] focus:ring-2"
        />
        <button
          type="submit"
          className="pressable h-14 rounded-2xl bg-white px-4 font-semibold text-[#3182F6]"
        >
          추가
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-[#F04452]">{error}</p> : null}

      <p className="mt-4 text-sm text-[#8B95A1]">
        {canStart
          ? `${gameModeLabel(count)} · 기본 ${defaultScoreForPlayerCount(count)}점${
              count >= MAX_PARTICIPANTS ? ' · 광팔기 켜짐' : ''
            }`
          : '3명 이상 골라야 시작할 수 있어요.'}
      </p>
    </ScreenShell>
  )
}

function GwangStep() {
  const game = useGameStore((state) => state.currentGame)!
  const draft = useGameStore((state) => state.draftRound)
  const setDealer = useGameStore((state) => state.setDealer)
  const setSeller = useGameStore((state) => state.setSeller)
  const setGwangCount = useGameStore((state) => state.setGwangCount)
  const skipGwang = useGameStore((state) => state.skipGwang)
  const commitGwangSale = useGameStore((state) => state.commitGwangSale)
  const setPlayStep = useGameStore((state) => state.setPlayStep)
  const seated = seatedPlayers(game)
  const navigate = useNavigate()

  if (game.participantIds.length < MAX_PARTICIPANTS) {
    return <WinnerStep />
  }

  if (!draft.dealerId) {
    return (
      <ScreenShell>
        <BackButton label="참가자" onClick={() => setPlayStep('seat')} />
        <ScreenTitle kicker="광팔기" description="선은 광을 사지 않아요.">
          선이 누구인가요?
        </ScreenTitle>
        <PickGrid
          players={seated}
          onPick={(id) => {
            haptic(16)
            setDealer(id)
          }}
        />
      </ScreenShell>
    )
  }

  if (!draft.sellerId) {
    const candidates = seated.filter((player) => player.id !== draft.dealerId)
    return (
      <ScreenShell
        footer={
          <SecondaryButton
            onClick={() => {
              haptic(8)
              skipGwang()
            }}
          >
            안 팔았어요
          </SecondaryButton>
        }
      >
        <BackButton label="선 다시 선택" onClick={() => setDealer('')} />
        <ScreenTitle kicker="광팔기" description="선을 제외한 사람 중에서 고르세요.">
          광 판 사람은요?
        </ScreenTitle>
        <PickGrid
          players={candidates}
          onPick={(id) => {
            haptic(16)
            setSeller(id)
          }}
        />
      </ScreenShell>
    )
  }

  const buyers = gwangBuyers(game.participantIds, draft.dealerId, draft.sellerId)
  const pay = draft.gwangCount * game.gwangUnit
  const sellerName = game.players.find((player) => player.id === draft.sellerId)?.name ?? ''
  const buyerNames = buyers
    .map((id) => game.players.find((player) => player.id === id)?.name)
    .filter((name): name is string => Boolean(name))

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          disabled={buyers.length !== 2}
          onClick={() => {
            haptic(16)
            commitGwangSale()
            navigate('/round')
          }}
        >
          정산하기
        </PrimaryButton>
      }
    >
      <BackButton label="판 사람" onClick={() => setSeller('')} />
      <ScreenTitle kicker="광팔기">몇 장 팔았나요?</ScreenTitle>

      <div className="step-in">
        <div className="flex flex-col items-center">
          <p key={draft.gwangCount} className="score-pop text-7xl font-bold tabular-nums">
            {draft.gwangCount}
          </p>
          <p className="mt-1 text-lg text-[#8B95A1]">장</p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="장수 줄이기"
            onClick={() => {
              haptic(8)
              setGwangCount(draft.gwangCount - 1)
            }}
            className="pressable flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl"
          >
            −
          </button>
          <button
            type="button"
            aria-label="장수 늘리기"
            onClick={() => {
              haptic(10)
              setGwangCount(draft.gwangCount + 1)
            }}
            className="pressable flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl"
          >
            +
          </button>
        </div>

        <section className="mt-8 rounded-3xl bg-white p-5">
          <p className="text-sm text-[#8B95A1]">산 사람</p>
          <p className="mt-1 text-[17px] font-semibold">{buyerNames.join(', ')}</p>
          <p className="mt-4 text-sm text-[#8B95A1]">
            {subjectGa(sellerName)} 받는 금액 · 각자 {formatWonPlain(pay)}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[#3182F6]">
            {formatWonPlain(pay * buyers.length)}
          </p>
        </section>
      </div>
    </ScreenShell>
  )
}

function gwangPendingThisCycle(game: Game): boolean {
  if (game.participantIds.length < MAX_PARTICIPANTS) return false
  const lastRoundAt = game.rounds.at(-1)?.createdAt ?? 0
  return !game.gwangSales.some((sale) => sale.createdAt > lastRoundAt)
}

function WinnerStep() {
  const navigate = useNavigate()
  const game = useGameStore((state) => state.currentGame)!
  const setWinner = useGameStore((state) => state.setWinner)
  const setPlayStep = useGameStore((state) => state.setPlayStep)
  const [picked, setPicked] = useState<string | null>(null)
  const seated = seatedPlayers(game)
  const backToGwang = gwangPendingThisCycle(game)

  return (
    <ScreenShell>
      <BackButton
        label={backToGwang ? '광팔기' : '참가자 바꾸기'}
        onClick={() => setPlayStep(backToGwang ? 'gwang' : 'seat')}
      />
      <StepDots step={0} />
      <ScreenTitle kicker={game.rounds.length > 0 ? `${game.rounds.length + 1}판` : '이번 판'}>
        누가 이겼나요?
      </ScreenTitle>
      <PickGrid
        players={seated}
        picked={picked}
        onPick={(id) => {
          if (picked) return
          haptic(16)
          setPicked(id)
          window.setTimeout(() => setWinner(id), 240)
        }}
      />
      <button
        type="button"
        onClick={() => navigate(game.rounds.length > 0 || game.gwangSales.length > 0 ? '/summary' : '/')}
        className="pressable mt-6 min-h-11 text-sm font-medium text-[#8B95A1]"
      >
        {game.rounds.length > 0 || game.gwangSales.length > 0 ? '현황 보기' : '홈'}
      </button>
    </ScreenShell>
  )
}

function ScoreStep() {
  const game = useGameStore((state) => state.currentGame)!
  const draft = useGameStore((state) => state.draftRound)
  const addScore = useGameStore((state) => state.addScore)
  const toggleGo = useGameStore((state) => state.toggleGo)
  const setPlayStep = useGameStore((state) => state.setPlayStep)
  const winner = game.players.find((player) => player.id === draft.winnerId)
  const goRules = game.rules.filter((rule) => rule.enabled && isGoRule(rule.id))
  const selectedGo = goRules.find((rule) => rule.id === draft.goType)
  const totalScore = draft.score + (selectedGo?.value ?? 0)
  const count = game.participantIds.length
  const mode = gameModeLabel(count)

  if (!winner) return <WinnerStep />

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          onClick={() => {
            haptic(10)
            setPlayStep('penalties')
          }}
        >
          다음
        </PrimaryButton>
      }
    >
      <BackButton label="승자 다시 선택" onClick={() => setPlayStep('winner')} />
      <StepDots step={1} />
      <ScreenTitle kicker={`${subjectGa(winner.name)} 이겼어요`}>몇 점인가요?</ScreenTitle>

      <div className="step-in">
        <div className="flex flex-col items-center">
          <p key={totalScore} className="score-pop text-7xl font-bold tabular-nums tracking-tight">
            {totalScore}
          </p>
          <p className="mt-1 text-lg text-[#8B95A1]">점</p>
          <p className="mt-2 text-sm text-[#8B95A1]">
            {mode} · {count}명
            {selectedGo ? ` · ${selectedGo.name} +${selectedGo.value}점` : ''}
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            aria-label="점수 줄이기"
            onClick={() => {
              haptic(8)
              addScore(-1)
            }}
            className="pressable flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            −
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[1, 3, 5].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => {
                haptic(10)
                addScore(delta)
              }}
              className="pressable h-14 rounded-2xl bg-white text-lg font-bold text-[#3182F6] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              +{delta}
            </button>
          ))}
        </div>

        {goRules.length > 0 ? (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-[#8B95A1]">고</h2>
            <div className="grid grid-cols-3 gap-2">
              {goRules.map((rule) => {
                const on = draft.goType === rule.id
                return (
                  <button
                    key={rule.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      haptic(12)
                      toggleGo(rule.id)
                    }}
                    className={`pressable flex min-h-16 flex-col items-center justify-center rounded-2xl text-sm font-semibold ${
                      on
                        ? 'chip-on bg-[#3182F6] text-white shadow-[0_8px_18px_rgba(49,130,246,0.28)]'
                        : 'bg-white text-[#191F28] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                    }`}
                  >
                    {rule.name}
                    <span className={`mt-0.5 text-xs ${on ? 'text-white/80' : 'text-[#8B95A1]'}`}>
                      {formatRuleValue(rule.type, rule.value)}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </ScreenShell>
  )
}

function PenaltyStep() {
  const navigate = useNavigate()
  const game = useGameStore((state) => state.currentGame)!
  const draft = useGameStore((state) => state.draftRound)
  const togglePenalty = useGameStore((state) => state.togglePenalty)
  const setPlayStep = useGameStore((state) => state.setPlayStep)
  const commitRound = useGameStore((state) => state.commitRound)
  const loserRules = game.rules.filter((rule) => rule.enabled && isLoserRule(rule.id))
  const losers = seatedPlayers(game).filter((player) => player.id !== draft.winnerId)

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          onClick={() => {
            haptic(16)
            commitRound()
            navigate('/round')
          }}
        >
          정산하기
        </PrimaryButton>
      }
    >
      <BackButton label="점수" onClick={() => setPlayStep('score')} />
      <StepDots step={2} />
      <ScreenTitle description="박이나 첫뻑만 골라주세요.">특수사항</ScreenTitle>

      <div className="step-in flex flex-col gap-3">
        {losers.map((player) => {
          const selected = draft.selectedRules[player.id] ?? []
          return (
            <section key={player.id} className="rounded-3xl bg-white p-4">
              <h2 className="mb-3 text-[17px] font-bold">{player.name}</h2>
              <div className="flex flex-wrap gap-2">
                {loserRules.map((rule) => {
                  const on = selected.includes(rule.id)
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        haptic(10)
                        togglePenalty(player.id, rule.id)
                      }}
                      className={`pressable min-h-11 rounded-full px-3.5 text-sm font-semibold ${
                        on
                          ? 'chip-on bg-[#3182F6] text-white shadow-[0_6px_14px_rgba(49,130,246,0.25)]'
                          : 'bg-[#F2F4F6] text-[#4E5968]'
                      }`}
                    >
                      {on ? `✓ ${rule.name}` : rule.name}
                      <span className={`ml-1 ${on ? 'text-white/80' : 'text-[#8B95A1]'}`}>
                        {formatRuleValue(rule.type, rule.value)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </ScreenShell>
  )
}

function PickGrid({
  players,
  picked,
  onPick,
}: {
  players: Player[]
  picked?: string | null
  onPick: (id: string) => void
}) {
  return (
    <div className="step-in grid grid-cols-2 gap-3">
      {players.map((player, index) => {
        const selected = picked === player.id
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onPick(player.id)}
            className={`pressable rise-in flex min-h-32 flex-col items-center justify-center rounded-3xl px-3 py-6 text-center stagger-${index + 1} ${
              selected
                ? 'winner-pick bg-[#3182F6] text-white shadow-[0_12px_28px_rgba(49,130,246,0.32)]'
                : 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
            }`}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                selected ? 'bg-white/20 text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
              }`}
            >
              {player.name.slice(0, 1)}
            </span>
            <span className="mt-3 text-[17px] font-semibold">{player.name}</span>
          </button>
        )
      })}
    </div>
  )
}
