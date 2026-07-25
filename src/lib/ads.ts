import { unlockDeepTest } from './storage'

type RewardCloseResult = { isEnded?: boolean }
type RewardedVideoAd = {
  load: () => Promise<void>
  show: () => Promise<void>
  onClose: (callback: (result?: RewardCloseResult) => void) => void
  offClose?: (callback: (result?: RewardCloseResult) => void) => void
  onError: (callback: () => void) => void
  offError?: (callback: () => void) => void
}

type MiniProgramGlobal = {
  createRewardedVideoAd?: (options: { adUnitId: string }) => RewardedVideoAd
}

export type DeepUnlockResult =
  | { unlocked: true; source: 'reward' | 'fallback' }
  | { unlocked: false; source: 'closed-early' }

export const HOME_AD_UNIT_ID =
  process.env.TARO_ENV === 'weapp'
    ? process.env.TARO_APP_WEAPP_HOME_AD_UNIT_ID || ''
    : process.env.TARO_ENV === 'tt'
      ? process.env.TARO_APP_TT_HOME_AD_UNIT_ID || ''
      : ''

const REWARDED_AD_UNIT_ID =
  process.env.TARO_ENV === 'weapp'
    ? process.env.TARO_APP_WEAPP_REWARDED_AD_UNIT_ID || ''
    : process.env.TARO_ENV === 'tt'
      ? process.env.TARO_APP_TT_REWARDED_AD_UNIT_ID || ''
      : ''

function platformApi(): MiniProgramGlobal | undefined {
  const runtime = globalThis as typeof globalThis & {
    wx?: MiniProgramGlobal
    tt?: MiniProgramGlobal
  }
  if (process.env.TARO_ENV === 'weapp') return runtime.wx
  if (process.env.TARO_ENV === 'tt') return runtime.tt
  return undefined
}

function allowFallback(): DeepUnlockResult {
  unlockDeepTest()
  return { unlocked: true, source: 'fallback' }
}

export async function requestDeepUnlock(): Promise<DeepUnlockResult> {
  const createRewardedVideoAd = platformApi()?.createRewardedVideoAd
  if (!REWARDED_AD_UNIT_ID || !createRewardedVideoAd) {
    return allowFallback()
  }

  try {
    const ad = createRewardedVideoAd({ adUnitId: REWARDED_AD_UNIT_ID })
    return await new Promise<DeepUnlockResult>((resolve) => {
      let settled = false
      const finish = (result: DeepUnlockResult) => {
        if (settled) return
        settled = true
        ad.offClose?.(handleClose)
        ad.offError?.(handleError)
        resolve(result)
      }
      const handleClose = (result?: RewardCloseResult) => {
        if (result?.isEnded === false) {
          finish({ unlocked: false, source: 'closed-early' })
          return
        }
        unlockDeepTest()
        finish({ unlocked: true, source: 'reward' })
      }
      const handleError = () => finish(allowFallback())

      ad.onClose(handleClose)
      ad.onError(handleError)
      ad
        .load()
        .then(() => ad.show())
        .catch(() => finish(allowFallback()))
    })
  } catch {
    return allowFallback()
  }
}
