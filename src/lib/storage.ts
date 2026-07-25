import Taro from '@tarojs/taro'
import type { DeviceSnapshot, ScreeningReport } from '@/types'

const REPORT_KEY = 'cvd:last-report'
const DEVICE_KEY = 'cvd:device'
const PREPARED_KEY = 'cvd:prepared-at'
const PREPARATION_TTL_MS = 10 * 60 * 1000

export function saveReport(report: ScreeningReport) {
  Taro.setStorageSync(REPORT_KEY, report)
}

export function loadReport(): ScreeningReport | undefined {
  return Taro.getStorageSync(REPORT_KEY) || undefined
}

export function saveDevice(device: DeviceSnapshot) {
  Taro.setStorageSync(DEVICE_KEY, device)
}

export function loadDevice(): DeviceSnapshot | undefined {
  return Taro.getStorageSync(DEVICE_KEY) || undefined
}

export function markPrepared() {
  Taro.setStorageSync(PREPARED_KEY, Date.now())
}

export function consumePreparation(): boolean {
  const preparedAt = Number(Taro.getStorageSync(PREPARED_KEY))
  Taro.removeStorageSync(PREPARED_KEY)
  return Number.isFinite(preparedAt) && Date.now() - preparedAt <= PREPARATION_TTL_MS
}
