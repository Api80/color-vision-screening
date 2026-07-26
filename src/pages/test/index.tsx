import { Button, Canvas, Text, View } from '@tarojs/components'
import Taro, { useLoad, useReady } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import BrandMark from '@/components/BrandMark'
import {
  createAxisState,
  chooseDeepAxis,
  createDirectionOrder,
  createQuickTrialOrder,
  createTrialOrder,
  recordFixedTrial,
  updateAxisState
} from '@/lib/adaptive'
import { buildQuickReport, buildReport } from '@/lib/report'
import { drawStimulus, resolveStimulusSeed } from '@/lib/stimulus'
import { consumePreparation, loadDevice, saveReport } from '@/lib/storage'
import type {
  Answer,
  Axis,
  AxisState,
  Direction,
  TestMode
} from '@/types'
import './index.css'

const CANVAS_ID = 'color-test-canvas'
const QUICK_TRIALS = 15
const DEEP_TRIALS = 42
const DEEP_BALANCED_TRIALS = 30
const DIRECTION_LABELS: Array<{
  value: Direction
  arrow: string
  label: string
}> = [
  { value: 'up', arrow: '↑', label: '上' },
  { value: 'right', arrow: '→', label: '右' },
  { value: 'down', arrow: '↓', label: '下' },
  { value: 'left', arrow: '←', label: '左' }
]

function initialStates(): Record<Axis, AxisState> {
  return {
    l: createAxisState('l'),
    m: createAxisState('m'),
    s: createAxisState('s')
  }
}

export default function TestPage() {
  const sessionSeed = useMemo(() => Date.now() % 100000000, [])
  const quickOrder = useMemo(
    () => createQuickTrialOrder(sessionSeed),
    [sessionSeed]
  )
  const deepOrder = useMemo(
    () => createTrialOrder(sessionSeed, DEEP_BALANCED_TRIALS),
    [sessionSeed]
  )
  const directionOrder = useMemo(
    () => createDirectionOrder(sessionSeed + 4171, DEEP_TRIALS),
    [sessionSeed]
  )
  const [states, setStates] = useState<Record<Axis, AxisState>>(initialStates)
  const [trialIndex, setTrialIndex] = useState(0)
  const [mode, setMode] = useState<TestMode>('quick')
  const [authorized, setAuthorized] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const [drawing, setDrawing] = useState(true)
  const [selectedAnswer, setSelectedAnswer] = useState<Answer>()
  const startedAt = useRef(Date.now())

  const totalTrials = mode === 'quick' ? QUICK_TRIALS : DEEP_TRIALS
  const quickTrial = quickOrder[Math.min(trialIndex, QUICK_TRIALS - 1)]
  const axis =
    mode === 'quick'
      ? quickTrial.axis
      : trialIndex < DEEP_BALANCED_TRIALS
        ? deepOrder[trialIndex]
        : chooseDeepAxis(states, sessionSeed + trialIndex * 3571)
  const initialTrialSeed = sessionSeed + trialIndex * 7919
  const direction = directionOrder[Math.min(trialIndex, DEEP_TRIALS - 1)]
  const contrast =
    mode === 'quick' ? quickTrial.contrast : states[axis].contrast
  const trialSeed = useMemo(
    () =>
      resolveStimulusSeed(
        axis,
        contrast,
        direction,
        initialTrialSeed
      ),
    [axis, contrast, direction, initialTrialSeed]
  )

  useLoad(() => {
    const preparedMode = consumePreparation()
    if (!preparedMode) {
      Taro.redirectTo({ url: '/pages/prepare/index?mode=quick' })
      return
    }
    setMode(preparedMode)
    setAuthorized(true)
  })

  useReady(() => {
    setCanvasReady(true)
  })

  useEffect(() => {
    if (!authorized || !canvasReady || trialIndex >= totalTrials) return
    setDrawing(true)
    const timer = setTimeout(() => {
      drawStimulus(CANVAS_ID, axis, contrast, direction, trialSeed)
      startedAt.current = Date.now()
      setDrawing(false)
    }, 60)
    return () => clearTimeout(timer)
  }, [
    authorized,
    axis,
    canvasReady,
    contrast,
    direction,
    totalTrials,
    trialIndex,
    trialSeed
  ])

  const finish = (nextStates: Record<Axis, AxisState>) => {
    const report =
      mode === 'quick'
        ? buildQuickReport(nextStates, loadDevice())
        : buildReport(nextStates, loadDevice())
    saveReport(report)
    Taro.redirectTo({ url: `/pages/result/index?mode=${mode}` })
  }

  const submit = (answer: Answer, responseMs?: number) => {
    if (!authorized || drawing) return
    const measuredResponseMs = responseMs ?? Date.now() - startedAt.current
    const nextAxisState =
      mode === 'quick'
        ? recordFixedTrial(
            states[axis],
            answer,
            direction,
            measuredResponseMs,
            trialSeed,
            contrast,
            trialIndex
          )
        : updateAxisState(
            states[axis],
            answer,
            direction,
            measuredResponseMs,
            trialSeed,
            trialIndex
          )
    const nextStates = { ...states, [axis]: nextAxisState }
    setStates(nextStates)

    if (trialIndex + 1 >= totalTrials) {
      finish(nextStates)
      return
    }
    setTrialIndex((value) => value + 1)
  }

  const selectAnswer = (answer: Answer) => {
    if (drawing || selectedAnswer !== undefined) return
    const responseMs = Date.now() - startedAt.current
    setSelectedAnswer(answer)
    setTimeout(() => {
      submit(answer, responseMs)
      setSelectedAnswer(undefined)
    }, 120)
  }

  const progress = Math.round(((trialIndex + 1) / totalTrials) * 100)

  if (!authorized) {
    return (
      <View className='test-page test-gate'>
        <Text>正在检查测试准备条件…</Text>
      </View>
    )
  }

  return (
    <View className='test-page'>
      <View className='test-panel'>
        <View className='test-brand'>
          <View className='test-brand-main'>
            <BrandMark size='small' />
            <Text className='brand-name'>辨色谱</Text>
          </View>
          <Text className='focus-chip'>
            {mode === 'quick' ? '快速模式 · 15题' : '深度模式 · 42题'}
          </Text>
        </View>

        <View className='test-top'>
          <View className='progress-copy'>
            <Text className='progress-step'>
              第 {trialIndex + 1} 题
              <Text className='progress-total'> / {totalTrials}</Text>
            </Text>
            <Text className='progress-percent'>{progress}%</Text>
          </View>
          <View className='progress-track'>
            <View className='progress-fill' style={{ width: `${progress}%` }} />
          </View>
        </View>

        <View className='question-copy'>
          <Text className='question-kicker'>判断缺口方向</Text>
          <Text className='test-instruction'>凭第一眼作答，不必反复寻找</Text>
        </View>

        <View className='canvas-shell'>
          <Canvas
            canvasId={CANVAS_ID}
            id={CANVAS_ID}
            width='320px'
            height='320px'
            className='test-canvas'
            aria-label='由彩色小圆点组成的缺口圆环'
          />
          {drawing && (
            <View className='canvas-loading'>
              <View className='loading-dot' />
              <Text>准备下一题…</Text>
            </View>
          )}
        </View>

        <Text className='answer-prompt'>你看到的缺口朝向</Text>
        <View className='direction-grid'>
          {DIRECTION_LABELS.map((item) => (
            <Button
              key={item.value}
              className={`choice-button direction-button ${
                selectedAnswer === item.value ? 'is-selected' : ''
              }`}
              disabled={drawing}
              aria-label={`缺口朝${item.label}`}
              onClick={() => selectAnswer(item.value)}
            >
              <Text className='direction-arrow'>{item.arrow}</Text>
              <Text className='direction-label'>{item.label}</Text>
            </Button>
          ))}
        </View>

        <Button
          className={`cant-see-button ${
            selectedAnswer === 'none' ? 'is-selected' : ''
          }`}
          disabled={drawing}
          onClick={() => selectAnswer('none')}
        >
          <View className='cant-see-icon'>?</View>
          <View className='cant-see-copy'>
            <Text className='cant-see-label'>看不清缺口</Text>
            <Text className='cant-see-hint'>没有明显方向时选择</Text>
          </View>
        </Button>

        <View className='test-footnote'>
          <Text className='footnote-dot'>i</Text>
          <Text>图案每题都会变化，请勿截图放大，也不需要猜数字。</Text>
        </View>
      </View>
    </View>
  )
}
