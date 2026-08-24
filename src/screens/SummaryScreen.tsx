import { Navigate, useNavigate } from 'react-router-dom'
import { AmountText } from '../components/AmountText.tsx'
import { PrimaryButton, SecondaryButton } from '../components/Button.tsx'
import { BackButton, ScreenShell, ScreenTitle } from '../components/ScreenShell.tsx'
import { accumulateTotals } from '../engine/round.ts'
import { useGameStore } from '../store/gameStore.ts'

export function SummaryScreen() {
  const navigate = useNavigate()
  const game = useGameStore((state) => state.currentGame)
  const startNextRound = useGameStore((state) => state.startNextRound)
  const finishGame = useGameStore((state) => state.finishGame)

  if (!game) return <Navigate to="/" replace />
  if (game.status === 'setup') return <Navigate to="/setup" replace />
  if (game.rounds.length === 0 && game.gwangSales.length === 0) {
    return <Navigate to="/play" replace />
  }

  const totals = accumulateTotals(game)
  const ranked = [...game.players].sort(
    (a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0),
  )
  const playerName = (id: string) =>
    game.players.find((player) => player.id === id)?.name ?? id

  const history = [
    ...game.gwangSales.map((sale) => ({
      key: sale.id,
      at: sale.createdAt,
      label: '광팔기',
      detail: `${playerName(sale.sellerId)} ${sale.count}장`,
    })),
    ...game.rounds.map((round, index) => ({
      key: round.id,
      at: round.createdAt,
      label: `${index + 1}판`,
      detail: `${playerName(round.winnerId)} · ${round.score}점${
        round.goType
          ? ` · ${game.rules.find((rule) => rule.id === round.goType)?.name ?? ''}`
          : ''
      }`,
    })),
  ].sort((a, b) => a.at - b.at)

  return (
    <ScreenShell
      footer={
        <div className="flex flex-col gap-2">
          {game.status !== 'settled' ? (
            <PrimaryButton
              onClick={() => {
                startNextRound()
                navigate('/play')
              }}
            >
              다음 판
            </PrimaryButton>
          ) : null}
          <SecondaryButton
            onClick={() => {
              if (game.status !== 'settled') finishGame()
              navigate('/settle')
            }}
          >
            최종 정산
          </SecondaryButton>
        </div>
      }
    >
      <BackButton
        label="이번 판"
        onClick={() => navigate(game.rounds.length > 0 || game.gwangSales.length > 0 ? '/round' : '/play')}
      />
      <ScreenTitle
        kicker={`페이딜러 · ${game.rounds.length}판`}
        description="지금까지 이긴 금액을 한눈에 보여드려요."
      >
        오늘 점수
      </ScreenTitle>

      <section className="mb-6 overflow-hidden rounded-3xl bg-white">
        {ranked.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-5 py-4 ${
              index < ranked.length - 1 ? 'border-b border-[#F2F4F6]' : ''
            }`}
          >
            <span className="font-semibold">{player.name}</span>
            <AmountText amount={totals[player.id] ?? 0} size="lg" animate />
          </div>
        ))}
      </section>

      <h2 className="mb-3 text-sm font-semibold text-[#8B95A1]">기록</h2>
      <div className="overflow-hidden rounded-3xl bg-white">
        {history.map((item, index) => (
          <div
            key={item.key}
            className={`flex items-center justify-between px-5 py-3.5 text-[15px] ${
              index < history.length - 1 ? 'border-b border-[#F2F4F6]' : ''
            }`}
          >
            <span className="text-[#8B95A1]">{item.label}</span>
            <span className="font-medium">{item.detail}</span>
          </div>
        ))}
      </div>
    </ScreenShell>
  )
}
