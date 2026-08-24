export const BRAND = {
  ko: '페이딜러',
  en: 'pay-dealer',
  category: '고스톱 계산기',
  tagline: '점수만 알려주세요.\n계산은 페이딜러가 할게요.',
  description:
    '누가 이겼는지, 몇 점인지만 입력하면 정산 금액까지 바로 나와요.',
  metaDescription:
    '고스톱 계산기 페이딜러. 점수만 알려주세요. 계산은 페이딜러가 할게요.',
  splashKey: 'pay-dealer-splash',
} as const

export function hasSeenSplash(): boolean {
  try {
    return sessionStorage.getItem(BRAND.splashKey) === '1'
  } catch {
    return false
  }
}

export function markSplashSeen(): void {
  try {
    sessionStorage.setItem(BRAND.splashKey, '1')
  } catch {
    // ignore
  }
}
