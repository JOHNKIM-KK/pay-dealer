import { Navigate, useNavigate } from 'react-router-dom'
import { BackButton, ScreenShell, ScreenTitle } from '../components/ScreenShell.tsx'
import { PrimaryButton } from '../components/Button.tsx'
import { MIN_PLAYERS, isGoRule } from '../engine/rules.ts'
import { formatRuleValue } from '../lib/format.ts'
import { isDuplicateName, normalizeName } from '../lib/names.ts'
import { useGameStore } from '../store/gameStore.ts'

export function SetupScreen() {
  const navigate = useNavigate()
  const game = useGameStore((state) => state.currentGame)
  const setPlayerName = useGameStore((state) => state.setPlayerName)
  const addPlayer = useGameStore((state) => state.addPlayer)
  const removePlayer = useGameStore((state) => state.removePlayer)
  const setPointUnit = useGameStore((state) => state.setPointUnit)
  const setGwangUnit = useGameStore((state) => state.setGwangUnit)
  const setCheotppeokUnit = useGameStore((state) => state.setCheotppeokUnit)
  const toggleRule = useGameStore((state) => state.toggleRule)
  const setRuleValue = useGameStore((state) => state.setRuleValue)
  const setRuleType = useGameStore((state) => state.setRuleType)
  const beginGame = useGameStore((state) => state.beginGame)
  const goHome = useGameStore((state) => state.goHome)

  if (!game) return <Navigate to="/" replace />
  if (game.status === 'playing') return <Navigate to="/play" replace />
  if (game.status === 'settled') return <Navigate to="/settle" replace />

  const names = game.players.map((player) => player.name)
  const hasEmpty = names.some((name) => !normalizeName(name))
  const hasDuplicate = names.some((name, index) => isDuplicateName(names, name, index))
  const canStart = !hasEmpty && !hasDuplicate && game.players.length >= MIN_PLAYERS

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          disabled={!canStart}
          onClick={() => {
            if (!beginGame()) return
            navigate('/play')
          }}
        >
          게임 시작
        </PrimaryButton>
      }
    >
      <BackButton
        label="홈"
        onClick={() => {
          goHome()
          navigate('/')
        }}
      />
      <ScreenTitle
        kicker="페이딜러"
        description="대기 명단은 계속 추가하고, 앉을 사람은 판마다 고르면 돼요."
      >
        게임 설정
      </ScreenTitle>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-[#8B95A1]">대기 명단</h2>
        <div className="flex flex-col gap-2">
          {game.players.map((player, index) => {
            const duplicated = isDuplicateName(names, player.name, index)
            const empty = !normalizeName(player.name)
            return (
              <div key={player.id} className="flex items-center gap-2">
                <input
                  value={player.name}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setPlayerName(player.id, event.target.value)}
                  aria-label={`${index + 1}번 플레이어 이름`}
                  aria-invalid={duplicated || empty}
                  className={`h-14 min-w-0 flex-1 rounded-2xl bg-white px-4 text-[16px] font-medium outline-none ring-[#3182F6] focus:ring-2 ${
                    duplicated || empty ? 'ring-2 ring-[#F04452]' : ''
                  }`}
                />
                {game.players.length > MIN_PLAYERS ? (
                  <button
                    type="button"
                    aria-label={`${player.name} 삭제`}
                    onClick={() => removePlayer(player.id)}
                    className="pressable flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl text-[#8B95A1]"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => addPlayer()}
          className="pressable mt-3 min-h-11 text-[15px] font-semibold text-[#3182F6]"
        >
          + 플레이어 추가
        </button>
        {hasDuplicate ? (
          <p className="mt-2 text-sm text-[#F04452]">이름이 겹치면 시작할 수 없어요.</p>
        ) : (
          <p className="mt-3 text-sm text-[#8B95A1]">
            2명이면 맞고, 3명이면 고스톱이에요. 4명이 앉으면 광팔기가 켜져요.
          </p>
        )}
      </section>

      <MoneyStepper
        label="점당 금액"
        value={game.pointUnit}
        onChange={setPointUnit}
        minusLabel="점당 금액 줄이기"
        plusLabel="점당 금액 늘리기"
      />

      <MoneyStepper
        label="광팔기 단가"
        value={game.gwangUnit}
        onChange={setGwangUnit}
        minusLabel="광팔기 단가 줄이기"
        plusLabel="광팔기 단가 늘리기"
      />

      <MoneyStepper
        label="첫뻑 금액"
        value={game.cheotppeokUnit}
        onChange={setCheotppeokUnit}
        minusLabel="첫뻑 금액 줄이기"
        plusLabel="첫뻑 금액 늘리기"
        hint="첫뻑한 사람 빼고 나머지가 각자 내는 금액이에요."
      />

      <section className="mb-4">
        <h2 className="mb-3 text-sm font-semibold text-[#8B95A1]">정산 규칙</h2>
        <div className="overflow-hidden rounded-3xl bg-white">
          {game.rules.map((rule, index) => (
            <div
              key={rule.id}
              className={`flex items-center justify-between px-4 py-3.5 ${
                index < game.rules.length - 1 ? 'border-b border-[#F2F4F6]' : ''
              }`}
            >
              <div>
                <p className="font-semibold">{rule.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#8B95A1]">
                  {isGoRule(rule.id) ? (
                    <div className="flex rounded-full bg-[#F2F4F6] p-0.5">
                      <button
                        type="button"
                        aria-pressed={rule.type === 'ADDITIVE'}
                        aria-label={`${rule.name} 더하기`}
                        onClick={() => setRuleType(rule.id, 'ADDITIVE')}
                        className={`h-7 rounded-full px-2.5 text-xs font-semibold ${
                          rule.type === 'ADDITIVE'
                            ? 'bg-white text-[#191F28] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                            : 'text-[#8B95A1]'
                        }`}
                      >
                        +점
                      </button>
                      <button
                        type="button"
                        aria-pressed={rule.type === 'MULTIPLIER'}
                        aria-label={`${rule.name} 곱하기`}
                        onClick={() => setRuleType(rule.id, 'MULTIPLIER')}
                        className={`h-7 rounded-full px-2.5 text-xs font-semibold ${
                          rule.type === 'MULTIPLIER'
                            ? 'bg-white text-[#191F28] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                            : 'text-[#8B95A1]'
                        }`}
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`${rule.name} 값 줄이기`}
                    onClick={() => setRuleValue(rule.id, rule.value - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2F4F6]"
                  >
                    −
                  </button>
                  <span className="min-w-10 text-center tabular-nums">
                    {formatRuleValue(rule.type, rule.value)}
                  </span>
                  <button
                    type="button"
                    aria-label={`${rule.name} 값 늘리기`}
                    onClick={() => setRuleValue(rule.id, rule.value + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2F4F6]"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={rule.enabled}
                aria-label={`${rule.name} ${rule.enabled ? '사용' : '미사용'}`}
                onClick={() => toggleRule(rule.id)}
                className={`relative h-8 w-14 rounded-full transition duration-200 ${
                  rule.enabled ? 'bg-[#3182F6]' : 'bg-[#D1D6DB]'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 block h-6 w-6 rounded-full bg-white transition duration-200 ${
                    rule.enabled ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>
    </ScreenShell>
  )
}

function MoneyStepper({
  label,
  value,
  onChange,
  minusLabel,
  plusLabel,
  hint,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  minusLabel: string
  plusLabel: string
  hint?: string
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-[#8B95A1]">{label}</h2>
      <div className="flex items-center justify-between rounded-3xl bg-white px-4 py-5">
        <button
          type="button"
          aria-label={minusLabel}
          onClick={() => onChange(value - 100)}
          className="pressable flex h-14 w-14 items-center justify-center rounded-full bg-[#F2F4F6] text-2xl text-[#191F28]"
        >
          −
        </button>
        <label className="flex items-baseline gap-1">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-28 bg-transparent text-center text-[40px] font-bold tabular-nums outline-none"
          />
          <span className="text-lg text-[#8B95A1]">원</span>
        </label>
        <button
          type="button"
          aria-label={plusLabel}
          onClick={() => onChange(value + 100)}
          className="pressable flex h-14 w-14 items-center justify-center rounded-full bg-[#F2F4F6] text-2xl text-[#191F28]"
        >
          +
        </button>
      </div>
      {hint ? <p className="mt-3 text-sm text-[#8B95A1]">{hint}</p> : null}
    </section>
  )
}
