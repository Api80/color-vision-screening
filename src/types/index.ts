export type Axis = 'l' | 'm' | 's'
export type Direction = 'up' | 'right' | 'down' | 'left'
export type Answer = Direction | 'none'
export type TestMode = 'quick' | 'deep'

export interface TrialRecord {
  axis: Axis
  contrast: number
  direction: Direction
  answer: Answer
  correct: boolean
  responseMs: number
  seed: number
}

export interface AxisState {
  axis: Axis
  contrast: number
  correctStreak: number
  reversals: number
  reversalContrasts: number[]
  lastMove: -1 | 0 | 1
  history: TrialRecord[]
}

export interface DeviceSnapshot {
  brand: string
  model: string
  platform: string
  system: string
  taroEnv: string
  testedAt: string
}

export interface AxisResult {
  axis: Axis
  threshold: number
  score: number
  correctRate: number
  reversals: number
}

export type ReportDetailLevel = 'full' | 'preliminary'
export type AnalysisReasonCode =
  | 'fast-responses'
  | 'insufficient-convergence'
  | 'incomplete-records'

export interface AnalysisReason {
  code: AnalysisReasonCode
  message: string
}

export type QuickResultType =
  | 'typical'
  | 'red-green'
  | 'blue-yellow'
  | 'broad'
  | 'uncertain'

export interface QuickAxisResult {
  axis: Axis
  correctRate: number
  easyCorrectRate: number
}

export interface QuickReport {
  mode: 'quick'
  id: string
  createdAt: string
  version: string
  result: QuickResultType
  resultLabel: string
  qualityWarnings: string[]
  axes: Record<Axis, QuickAxisResult>
  device?: DeviceSnapshot
  records: TrialRecord[]
}

export interface ScreeningReport {
  mode: 'deep'
  id: string
  createdAt: string
  version: string
  type:
    | 'typical'
    | 'protan'
    | 'deutan'
    | 'tritan'
    | 'broad'
    | 'uncertain'
  typeLabel: string
  severityLabel: string
  confidenceLabel: string
  confidenceScore: number
  detailLevel: ReportDetailLevel
  analysisReasons: AnalysisReason[]
  qualityWarnings: string[]
  axes: Record<Axis, AxisResult>
  device?: DeviceSnapshot
  records: TrialRecord[]
}

export type ColorVisionReport = QuickReport | ScreeningReport
