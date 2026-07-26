import type {
  Axis,
  AxisResult,
  AxisState,
  DeviceSnapshot,
  QuickAxisResult,
  QuickReport,
  ScreeningReport
} from '@/types'
import {
  AXES,
  estimateThreshold,
  isAxisEvidenceSufficient,
  MAX_CONTRAST,
  MIN_CONTRAST
} from './adaptive'

export const REPORT_VERSION = '0.3.0'
export const QUICK_REPORT_VERSION = '0.1.0'

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
  const maxScore = top.score
  const redGreenScore = Math.max(axes.l.score, axes.m.score)
  const redGreenGap = Math.abs(axes.l.score - axes.m.score)
  const blueYellowScore = axes.s.score
  const directionGap = Math.abs(redGreenScore - blueYellowScore)

  let type: ScreeningReport['type'] = 'uncertain'
  let typeLabel = '结果方向暂不明确'

  if (maxScore < 25) {
    type = 'typical'
    typeLabel = '本次辨色表现接近正常范围'
  } else if (
    redGreenScore >= 50 &&
    blueYellowScore >= 50 &&
    directionGap < 10
  ) {
    type = 'broad'
    typeLabel = '多个方向辨色存在困难'
  } else if (redGreenScore >= blueYellowScore) {
    if (redGreenGap < 10) {
      type = 'uncertain'
      typeLabel = '红绿色辨别困难（具体类型暂不明确）'
    } else if (axes.l.score > axes.m.score) {
      type = 'protan'
      typeLabel = '红绿色辨别困难（偏红色觉型）'
    } else {
      type = 'deutan'
      typeLabel = '红绿色辨别困难（偏绿色觉型）'
    }
  } else {
    type = 'tritan'
    typeLabel = '蓝黄色辨别困难'
  }

  let severityLabel = '接近正常范围'
  if (maxScore >= 25) severityLabel = '轻微辨色困难'
  if (maxScore >= 50) severityLabel = '明显辨色困难'
  if (maxScore >= 75) severityLabel = '严重辨色困难'

  const records = AXES.flatMap((axis) => states[axis].history).sort(
    (left, right) =>
      (left.sequence ?? Number.MAX_SAFE_INTEGER) -
      (right.sequence ?? Number.MAX_SAFE_INTEGER)
  )
  const ultraFast = records.filter((record) => record.responseMs < 180).length
  const fastThreshold = Math.max(8, Math.ceil(records.length * 0.25))
  let consecutiveUltraFast = 0
  let maximumConsecutiveUltraFast = 0
  records.forEach((record) => {
    consecutiveUltraFast =
      record.responseMs < 180 ? consecutiveUltraFast + 1 : 0
    maximumConsecutiveUltraFast = Math.max(
      maximumConsecutiveUltraFast,
      consecutiveUltraFast
    )
  })
  const hasFastResponsePattern =
    records.length >= 42 &&
    ultraFast >= fastThreshold &&
    maximumConsecutiveUltraFast >= 4
  const unresolvedAxes = AXES.filter(
    (axis) => !isAxisEvidenceSufficient(states[axis])
  )
  const sessionStatus: ScreeningReport['sessionStatus'] =
    records.length < 42
      ? 'incomplete'
      : hasFastResponsePattern
        ? 'answer-anomaly'
        : 'valid'
  const typeClarity: ScreeningReport['typeClarity'] =
    type === 'broad' || type === 'uncertain' ? 'unclear' : 'clear'
  const analysisReasons: ScreeningReport['analysisReasons'] = []
  if (hasFastResponsePattern) {
    analysisReasons.push({
      code: 'fast-responses',
      message: '检测到部分题目出现连续快速作答。'
    })
  }
  if (records.length < 42) {
    analysisReasons.push({
      code: 'incomplete-records',
      message: '本次没有获得足够数量的完整作答记录。'
    })
  }
  const detailLevel: ScreeningReport['detailLevel'] =
    sessionStatus === 'valid' ? 'full' : 'preliminary'
  const qualityWarnings = analysisReasons.map((reason) => reason.message)

  const confidenceScore = clamp(
    Math.round(92 - ultraFast * 2 - unresolvedAxes.length * 10),
    40,
    95
  )
  const confidenceLabel =
    confidenceScore >= 80 ? '较高' : confidenceScore >= 60 ? '中等' : '偏低'

  return {
    mode: 'deep',
    id: `cvd-${Date.now()}`,
    createdAt: new Date().toISOString(),
    version: REPORT_VERSION,
    type,
    typeLabel,
    severityLabel,
    confidenceLabel,
    confidenceScore,
    detailLevel,
    sessionStatus,
    typeClarity,
    analysisReasons,
    qualityWarnings,
    axes,
    device,
    records
  }
}

function quickAxisResult(axis: Axis, state: AxisState): QuickAxisResult {
  const correct = state.history.filter((record) => record.correct).length
  const easy = state.history.filter((record) => record.contrast >= 0.18)
  const easyCorrect = easy.filter((record) => record.correct).length
  return {
    axis,
    correctRate: state.history.length
      ? Math.round((correct / state.history.length) * 100)
      : 0,
    easyCorrectRate: easy.length
      ? Math.round((easyCorrect / easy.length) * 100)
      : 0
  }
}

export function buildQuickReport(
  states: Record<Axis, AxisState>,
  device?: DeviceSnapshot
): QuickReport {
  const axes = AXES.reduce(
    (result, axis) => {
      result[axis] = quickAxisResult(axis, states[axis])
      return result
    },
    {} as Record<Axis, QuickAxisResult>
  )
  const records = AXES.flatMap((axis) => states[axis].history)
  const easyMisses = records.filter(
    (record) => record.contrast >= 0.18 && !record.correct
  ).length
  const tooFast = records.filter((record) => record.responseMs < 250).length
  const qualityWarnings: string[] = []

  if (easyMisses >= 3) {
    qualityWarnings.push('较容易辨认的题目出现多次错误。')
  }
  if (tooFast >= 3) {
    qualityWarnings.push('多次作答过快。')
  }

  const redGreenRate = Math.min(axes.l.correctRate, axes.m.correctRate)
  const blueYellowRate = axes.s.correctRate
  const redGreenDifficult = redGreenRate <= 60
  const blueYellowDifficult = blueYellowRate <= 60
  let result: QuickReport['result'] = 'typical'
  let resultLabel = '未发现明显辨色困难'

  if (easyMisses >= 3 || tooFast >= 3) {
    result = 'uncertain'
    resultLabel = '本次结果不够清晰'
  } else if (redGreenDifficult && blueYellowDifficult) {
    result = 'broad'
    resultLabel = '多个方向存在辨色困难线索'
  } else if (redGreenDifficult) {
    result = 'red-green'
    resultLabel = '发现红绿色辨别困难线索'
  } else if (blueYellowDifficult) {
    result = 'blue-yellow'
    resultLabel = '发现蓝黄色辨别困难线索'
  }

  return {
    mode: 'quick',
    id: `cvd-quick-${Date.now()}`,
    createdAt: new Date().toISOString(),
    version: QUICK_REPORT_VERSION,
    result,
    resultLabel,
    qualityWarnings,
    axes,
    device,
    records
  }
}
