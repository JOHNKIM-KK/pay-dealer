export function haptic(duration = 12): void {
  try {
    navigator.vibrate?.(duration)
  } catch {
    // ignore
  }
}
