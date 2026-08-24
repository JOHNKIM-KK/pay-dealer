import { useCallback, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { PlayScreen } from './screens/PlayScreen.tsx'
import { RoundResultScreen } from './screens/RoundResultScreen.tsx'
import { SettleScreen } from './screens/SettleScreen.tsx'
import { SetupScreen } from './screens/SetupScreen.tsx'
import { SummaryScreen } from './screens/SummaryScreen.tsx'
import { SplashScreen } from './components/SplashScreen.tsx'
import { hasSeenSplash } from './brand.ts'
import { useGameStore } from './store/gameStore.ts'
import { useSyncExternalStore } from 'react'

function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useGameStore.persist.onFinishHydration(onStoreChange),
    () => useGameStore.persist.hasHydrated(),
    () => false,
  )
}

export default function App() {
  const ready = useStoreHydrated()
  const [splashDone, setSplashDone] = useState(() => hasSeenSplash())
  const finishSplash = useCallback(() => setSplashDone(true), [])

  if (!splashDone) {
    return <SplashScreen onDone={finishSplash} />
  }

  if (!ready) {
    return <SplashScreen hold />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/setup" element={<SetupScreen />} />
        <Route path="/play" element={<PlayScreen />} />
        <Route path="/round" element={<RoundResultScreen />} />
        <Route path="/summary" element={<SummaryScreen />} />
        <Route path="/settle" element={<SettleScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
