import type {
  Axis,
  AxisResult,
  AxisState,
  DeviceSnapshot,
  ScreeningReport
} from '@/types'
import {
  AXES,
  estimateThreshold,
  MAX_CONTRAST,
  MIN_CONTRAST
} from './adaptive'

export const REPORT_VERSION = '0.2.1'

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function thresholdToScore(threshold: number): number {
  return Math.round(
    clamp(
      ((threshold - MIN_CONTRAST) / (MAX_CONTRAST - MIN_CONTRAST)) * 100,
      0,
      100
    )
  )
}

function axisResult(axis: Axis, state: AxisState): AxisResult {
  const threshold = estimateThreshold(state)
  const correctCount = state.history.filter((record) => record.correct).length
  return {
    axis,
    threshold,
    score: thresholdToScore(threshold),
    correctRate: state.history.length
      ? Math.round((correctCount / state.history.length) * 100)
      : 0,
    reversals: state.reversals
  }
}

export function buildReport(
  states: Record<Axis, AxisState>,
  device?: DeviceSnapshot
): ScreeningReport {
  const axes = AXES.reduce(
    (result, axis) => {
      result[axis] = axisResult(axis, states[axis])
      return result
    },
    {} as Record<Axis, AxisResult>
  )
  const ranked = AXES.map((axis) => axes[axis]).sort(
    (left, right) => right.score - left.score
  )
  const top = ranked[0]
  const second = ranked[1]
  const maxScore = top.score
  const combinedHigh = top.score + second.score
  const gap = top.score - second.score

  let type: ScreeningReport['type'] = 'uncertain'
  let typeLabel = '结果方向暂不明确'

  if (maxScore < 25) {
    type = 'typical'
    typeLabel = '本次辨色表现接近正常范围'
  } else if (gap < 10 && combinedHigh >= 100) {
    type = 'broad'
    typeLabel = '多个方向辨色存在困难'
  } else if (top.axis === 'l') {
    type = 'protan'
    typeLabel = '红绿色辨别困难（偏红色觉型）'
  } else if (top.axis === 'm') {
    type = 'deutan'
    typeLabel = '红绿色辨别困难（偏绿色觉型）'
  } else {
    type = 'tritan'
    typeLabel = '蓝黄色辨别困难'
  }

  let severityLabel = '接近正常范围'
  if (maxScore >= 25) severityLabel = '轻微辨色困难'
  if (maxScore >= 50) severityLabel = '明显辨色困难'
  if (maxScore >= 75) severityLabel = '严重辨色困难'

  const records = AXES.flatMap((axis) => states[axis].history)
  const easyMisses = records.filter(
    (record) => record.contrast >= 0.2 && !record.correct
  ).length
  const tooFast = records.filter((record) => record.responseMs < 250).length
  const qualityWarnings: string[] = []
  if (easyMisses >= 3) {
    qualityWarnings.push('容易辨认的题目出现多次错误，请检查显示设置并认真作答。')
  }
  if (tooFast >= 3) {
    qualityWarnings.push('多次作答过快，请凭第一眼判断后再选择。')
  }
  if (gap < 8 && maxScore >= 35) {
    qualityWarnings.push('不同辨色方向的结果过于接近，暂时无法形成清晰方向。')
  }
  const unstableAxes = AXES.filter((axis) => {
    const result = axes[axis]
    return result.threshold > MIN_CONTRAST + 0.02 && result.reversals < 2
  })
  if (unstableAxes.length > 0) {
    qualityWarnings.push('部分方向的有效变化次数不足，建议重新测试。')
  }

  const stabilityPenalty = AXES.reduce((penalty, axis) => {
    const result = axes[axis]
    if (result.threshold <= MIN_CONTRAST + 0.02) return penalty
    return penalty + Math.max(0, 3 - result.reversals) * 5
  }, 0)

  const confidenceScore = clamp(
    Math.round(
      92 -
        easyMisses * 6 -
        tooFast * 4 -
        stabilityPenalty -
        qualityWarnings.length * 3
    ),
    35,
    95
  )
  const confidenceLabel =
    confidenceScore >= 80 ? '较高' : confidenceScore >= 60 ? '中等' : '偏低'

  if (confidenceScore < 60) {
    type = 'uncertain'
    typeLabel = '结果稳定性不足'
    severityLabel = '本次不作程度判断'
  }

  return {
    id: `cvd-${Date.now()}`,
    createdAt: new Date().toISOString(),
    version: REPORT_VERSION,
    type,
    typeLabel,
    severityLabel,
    confidenceLabel,
    confidenceScore,
    qualityWarnings,
    axes,
    device,
    records
  }
}
