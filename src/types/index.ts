export type Axis = 'l' | 'm' | 's'
export type Direction = 'up' | 'right' | 'down' | 'left'
export type Answer = Direction | 'none'

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

export interface ScreeningReport {
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
  qualityWarnings: string[]
  axes: Record<Axis, AxisResult>
  device?: DeviceSnapshot
  records: TrialRecord[]
}
