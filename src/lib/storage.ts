import Taro from '@tarojs/taro'
import type {
  ColorVisionReport,
  DeviceSnapshot,
  ScreeningReport,
  TestMode
} from '@/types'

const LEGACY_REPORT_KEY = 'cvd:last-report'
const REPORT_KEYS: Record<TestMode, string> = {
  quick: 'cvd:last-report:quick',
  deep: 'cvd:last-report:deep'
}
const DEVICE_KEY = 'cvd:device'
const PREPARED_KEY = 'cvd:prepared-session'
const DEEP_UNLOCK_KEY = 'cvd:deep-unlocked-at'
const DEEP_CLARITY_KEY = 'cvd:deep-clarity-state'
const PREPARATION_TTL_MS = 10 * 60 * 1000
const DEEP_UNLOCK_TTL_MS = 30 * 60 * 1000
const DEEP_CLARITY_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface DeepClarityState {
  consecutiveUnclearCount: number
  lastUnclearAt: number
}

export function saveReport(report: ColorVisionReport) {
  Taro.setStorageSync(REPORT_KEYS[report.mode], report)
  if (report.mode === 'deep') {
    updateDeepClarityState(report)
  }
}

export function loadReport(mode: TestMode): ColorVisionReport | undefined {
  const saved = Taro.getStorageSync(REPORT_KEYS[mode]) as
    | ColorVisionReport
    | undefined
  if (saved) return saved

  if (mode === 'deep') {
    const legacy = Taro.getStorageSync(LEGACY_REPORT_KEY) as
      | Omit<ScreeningReport, 'mode'>
      | undefined
    if (legacy?.id) {
      return { ...legacy, mode: 'deep' }
    }
  }

  return undefined
}

export function saveDevice(device: DeviceSnapshot) {
  Taro.setStorageSync(DEVICE_KEY, device)
}

export function loadDevice(): DeviceSnapshot | undefined {
  return Taro.getStorageSync(DEVICE_KEY) || undefined
}

function updateDeepClarityState(report: ScreeningReport) {
  if (report.sessionStatus !== 'valid') return
  if (report.typeClarity === 'clear') {
    Taro.removeStorageSync(DEEP_CLARITY_KEY)
    return
  }

  const previous = loadDeepClarityState()
  const now = Date.now()
  const consecutiveUnclearCount =
    previous && now - previous.lastUnclearAt <= DEEP_CLARITY_TTL_MS
      ? previous.consecutiveUnclearCount + 1
      : 1
  Taro.setStorageSync(DEEP_CLARITY_KEY, {
    consecutiveUnclearCount,
    lastUnclearAt: now
  } satisfies DeepClarityState)
}

export function loadDeepClarityState(): DeepClarityState | undefined {
  const saved = Taro.getStorageSync(DEEP_CLARITY_KEY) as
    | DeepClarityState
    | undefined
  if (
    !saved ||
    !Number.isFinite(saved.consecutiveUnclearCount) ||
    !Number.isFinite(saved.lastUnclearAt) ||
    Date.now() - saved.lastUnclearAt > DEEP_CLARITY_TTL_MS
  ) {
    if (saved) Taro.removeStorageSync(DEEP_CLARITY_KEY)
    return undefined
  }
  return saved
}

export function markPrepared(mode: TestMode) {
  Taro.setStorageSync(PREPARED_KEY, { mode, preparedAt: Date.now() })
}

export function consumePreparation(): TestMode | undefined {
  const session = Taro.getStorageSync(PREPARED_KEY) as
    | { mode?: TestMode; preparedAt?: number }
    | undefined
  Taro.removeStorageSync(PREPARED_KEY)
  if (
    !session ||
    (session.mode !== 'quick' && session.mode !== 'deep') ||
    !Number.isFinite(session.preparedAt) ||
    Date.now() - Number(session.preparedAt) > PREPARATION_TTL_MS
  ) {
    return undefined
  }
  return session.mode
}

export function unlockDeepTest() {
  Taro.setStorageSync(DEEP_UNLOCK_KEY, Date.now())
}

export function isDeepUnlocked(): boolean {
  const unlockedAt = Number(Taro.getStorageSync(DEEP_UNLOCK_KEY))
  return (
    Number.isFinite(unlockedAt) &&
    Date.now() - unlockedAt <= DEEP_UNLOCK_TTL_MS
  )
}
