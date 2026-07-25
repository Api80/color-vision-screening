import type { Answer, Axis, AxisState, Direction, TrialRecord } from '@/types'
import { shuffle } from './random'

export const MIN_CONTRAST = 0.018
export const MAX_CONTRAST = 0.32
const START_CONTRAST = 0.22
const STEP_SIZES = [0.055, 0.04, 0.028, 0.02, 0.014]

export const AXES: Axis[] = ['l', 'm', 's']
export const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left']
export const QUICK_CONTRASTS = [0.24, 0.18, 0.13, 0.09, 0.06] as const

export interface QuickTrial {
  axis: Axis
  contrast: number
}

export function createAxisState(axis: Axis): AxisState {
  return {
    axis,
    contrast: START_CONTRAST,
    correctStreak: 0,
    reversals: 0,
    reversalContrasts: [],
    lastMove: 0,
    history: []
  }
}

export function createTrialOrder(seed: number, totalTrials: number): Axis[] {
  const order: Axis[] = []
  const blockCount = Math.ceil(totalTrials / AXES.length)
  for (let block = 0; block < blockCount; block += 1) {
    order.push(...shuffle(AXES, seed + block * 97))
  }
  return order.slice(0, totalTrials)
}

export function createQuickTrialOrder(seed: number): QuickTrial[] {
  const trials = AXES.flatMap((axis) =>
    QUICK_CONTRASTS.map((contrast) => ({ axis, contrast }))
  )
  return shuffle(trials, seed)
}

export function createDirectionOrder(
  seed: number,
  totalTrials: number
): Direction[] {
  const order: Direction[] = []
  const blockCount = Math.ceil(totalTrials / DIRECTIONS.length)

  for (let block = 0; block < blockCount; block += 1) {
    const blockDirections = shuffle(DIRECTIONS, seed + block * 193)
    const previous = order[order.length - 1]

    if (previous && blockDirections[0] === previous) {
      const swapIndex = blockDirections.findIndex(
        (direction) => direction !== previous
      )
      ;[blockDirections[0], blockDirections[swapIndex]] = [
        blockDirections[swapIndex],
        blockDirections[0]
      ]
    }

    order.push(...blockDirections)
  }

  return order.slice(0, totalTrials)
}

export function updateAxisState(
  state: AxisState,
  answer: Answer,
  direction: Direction,
  responseMs: number,
  seed: number
): AxisState {
  const correct = answer === direction
  let streak = correct ? state.correctStreak + 1 : 0
  let move: -1 | 0 | 1 = 0

  if (!correct) {
    move = 1
  } else if (streak >= 2) {
    move = -1
    streak = 0
  }

  const step = STEP_SIZES[Math.min(state.reversals, STEP_SIZES.length - 1)]
  const nextContrast = Math.max(
    MIN_CONTRAST,
    Math.min(MAX_CONTRAST, state.contrast + move * step)
  )
  const reversed =
    move !== 0 && state.lastMove !== 0 && move !== state.lastMove

  const record: TrialRecord = {
    axis: state.axis,
    contrast: state.contrast,
    direction,
    answer,
    correct,
    responseMs,
    seed
  }

  return {
    ...state,
    contrast: nextContrast,
    correctStreak: streak,
    reversals: state.reversals + (reversed ? 1 : 0),
    reversalContrasts: reversed
      ? [...state.reversalContrasts, state.contrast]
      : state.reversalContrasts,
    lastMove: move === 0 ? state.lastMove : move,
    history: [...state.history, record]
  }
}

export function recordFixedTrial(
  state: AxisState,
  answer: Answer,
  direction: Direction,
  responseMs: number,
  seed: number,
  contrast: number
): AxisState {
  const record: TrialRecord = {
    axis: state.axis,
    contrast,
    direction,
    answer,
    correct: answer === direction,
    responseMs,
    seed
  }
  return { ...state, history: [...state.history, record] }
}

function median(values: number[]): number {
  if (!values.length) return START_CONTRAST
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

export function estimateThreshold(state: AxisState): number {
  const reversalPoints = state.reversalContrasts.slice(-4)
  if (reversalPoints.length >= 2) {
    return Number(median(reversalPoints).toFixed(4))
  }

  const tail = state.history.slice(-4).map((record) => record.contrast)
  return Number(median(tail).toFixed(4))
}
