import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { requestDeepUnlock } from '@/lib/ads'
import { QUICK_REPORT_VERSION, REPORT_VERSION } from '@/lib/report'
import {
  isDeepUnlocked,
  loadDeepClarityState,
  loadReport,
  unlockDeepTest
} from '@/lib/storage'
import type {
  Axis,
  ColorVisionReport,
  QuickReport,
  ScreeningReport,
  TestMode
} from '@/types'
import './index.css'

const AXIS_META: Record<
  Axis,
  { name: string; term: string; description: string }
> = {
  l: {
    name: '红绿辨色 · 偏红方向',
    term: 'protan / L',
    description: '观察长波（红）相关的辨色阈值'
  },
  m: {
    name: '红绿辨色 · 偏绿方向',
    term: 'deutan / M',
    description: '观察中波（绿）相关的辨色阈值'
  },
  s: {
    name: '蓝黄辨色方向',
    term: 'tritan / S',
    description: '观察短波（蓝）相关的辨色阈值'
  }
}

const TYPE_META: Record<
  ScreeningReport['type'],
  { headline: string; subtype: string; explanation: string }
> = {
  typical: {
    headline: '本次辨色表现接近正常范围',
    subtype: '三个辨色方向均未见明显困难',
    explanation:
      '在当前屏幕和环境下，没有发现稳定的红绿色或蓝黄色辨别困难。'
  },
  protan: {
    headline: '红绿色辨别存在困难',
    subtype: '更偏向偏红色觉型（protan）',
    explanation:
      '长波相关方向的辨色困难更突出，部分红、绿、棕色可能更容易混淆。'
  },
  deutan: {
    headline: '红绿色辨别存在困难',
    subtype: '更偏向偏绿色觉型（deutan）',
    explanation:
      '中波相关方向的辨色困难更突出，部分红、绿、棕、橙色可能更容易混淆。'
  },
  tritan: {
    headline: '蓝黄色辨别存在困难',
    subtype: '更偏向蓝黄色觉型（tritan）',
    explanation:
      '短波相关方向的辨色困难更突出，蓝与绿、黄与粉红等颜色可能更容易混淆。'
  },
  broad: {
    headline: '多个方向辨色存在困难',
    subtype: '暂时没有形成单一类型方向',
    explanation:
      '两个或更多辨色方向同时偏高，可能与显示条件、注意状态或多方向辨色问题有关。'
  },
  uncertain: {
    headline: '红绿色辨别存在困难',
    subtype: '红绿色觉具体类型暂不明确',
    explanation:
      '本次可以提示红绿色辨别困难方向，但偏红型和偏绿型的表现较为接近。'
  }
}

const QUICK_META: Record<
  QuickReport['result'],
  { headline: string; lead: string; tone: string }
> = {
  typical: {
    headline: '未发现明显辨色困难',
    lead: '本次快速题目中，红绿和蓝黄两个方向均未出现明显困难线索。',
    tone: 'typical'
  },
  'red-green': {
    headline: '可能存在红绿色辨别困难',
    lead: '红绿相关题目的辨认表现相对较弱，可以通过深度自测进一步观察。',
    tone: 'moderate'
  },
  'blue-yellow': {
    headline: '可能存在蓝黄色辨别困难',
    lead: '蓝黄相关题目的辨认表现相对较弱，可以通过深度自测进一步观察。',
    tone: 'moderate'
  },
  broad: {
    headline: '可能存在多个方向的辨色困难',
    lead: '红绿和蓝黄相关题目均出现辨认困难，也可能受到屏幕或作答状态影响。',
    tone: 'marked'
  },
  uncertain: {
    headline: '本次结果不够清晰',
    lead: '较容易的题目出现多次错误或作答过快，建议调整状态后重新测试。',
    tone: 'mild'
  }
}

function scoreGrade(score: number) {
  if (score < 25) return { label: '接近正常范围', tone: 'typical' }
  if (score < 50) return { label: '轻微辨色困难', tone: 'mild' }
  if (score < 75) return { label: '明显辨色困难', tone: 'moderate' }
  return { label: '严重辨色困难', tone: 'marked' }
}

function formatDate(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')} ${String(
    date.getHours()
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function EmptyResult({ mode }: { mode: TestMode }) {
  return (
    <View className='page empty-result'>
      <Text className='section-title'>还没有这项自测结果</Text>
      <Button
        className='primary-button'
        onClick={() =>
          mode === 'deep'
            ? Taro.reLaunch({ url: '/pages/index/index' })
            : Taro.redirectTo({ url: '/pages/prepare/index?mode=quick' })
        }
      >
        {mode === 'quick' ? '开始快速自测' : '返回首页解锁深度自测'}
      </Button>
    </View>
  )
}

function QuickResultView({ report }: { report: QuickReport }) {
  const meta = QUICK_META[report.result]
  const [unlocking, setUnlocking] = useState(false)

  const startDeep = async () => {
    if (unlocking) return
    if (isDeepUnlocked()) {
      Taro.redirectTo({ url: '/pages/prepare/index?mode=deep' })
      return
    }
    const modal = await Taro.showModal({
      title: '继续深度自测',
      content:
        '完整观看一段激励视频，可开始 42 题深度自测。若广告不可用，将直接开放。',
      confirmText: '看广告'
    })
    if (!modal.confirm) return
    setUnlocking(true)
    const result = await requestDeepUnlock()
    setUnlocking(false)
    if (!result.unlocked) {
      Taro.showToast({ title: '完整观看后可解锁', icon: 'none' })
      return
    }
    Taro.redirectTo({ url: '/pages/prepare/index?mode=deep' })
  }

  return (
    <View className='page result-page quick-result-page'>
      <View className='page-narrow'>
        <Text className='eyebrow'>快速自测结果 · 15 题</Text>
        <Text className='result-type'>{meta.headline}</Text>
        <View className='result-badges'>
          <Text className={`result-grade-badge grade-${meta.tone}`}>
            快速方向提示
          </Text>
        </View>
        <Text className='result-lead'>{meta.lead}</Text>

        <View className='card quick-explain-card'>
          <Text className='section-title'>这份结果说明什么？</Text>
          <Text className='result-copy'>
            快速自测用于初步了解辨色表现。由于题量较少，本结果不区分具体色觉类型，仅提示可能存在的辨色困难方向。
          </Text>
          <View className='quick-direction-grid'>
            <View className='quick-direction-item'>
              <Text className='quick-direction-name'>红绿方向</Text>
              <Text className='quick-direction-value'>
                {report.result === 'red-green' || report.result === 'broad'
                  ? '发现困难线索'
                  : report.result === 'uncertain'
                    ? '暂不明确'
                    : '未见明显线索'}
              </Text>
            </View>
            <View className='quick-direction-item'>
              <Text className='quick-direction-name'>蓝黄方向</Text>
              <Text className='quick-direction-value'>
                {report.result === 'blue-yellow' || report.result === 'broad'
                  ? '发现困难线索'
                  : report.result === 'uncertain'
                    ? '暂不明确'
                    : '未见明显线索'}
              </Text>
            </View>
          </View>
        </View>

        <View className='deep-upgrade-card'>
          <Text className='deep-upgrade-kicker'>想了解得更详细？</Text>
          <Text className='deep-upgrade-title'>42 题深度自测</Text>
          <Text className='deep-upgrade-copy'>
            进一步观察类型倾向、辨色困难程度和三个辨色方向。
          </Text>
          <Button
            className={`primary-button deep-upgrade-button ${
              unlocking ? 'is-loading' : ''
            }`}
            onClick={startDeep}
          >
            {unlocking
              ? '正在准备广告…'
              : isDeepUnlocked()
                ? '开始深度自测'
                : '看一段广告，解锁深度自测'}
          </Button>
        </View>

        <Text className='result-time'>测试时间：{formatDate(report.createdAt)}</Text>
        <View className='notice'>
          本次结果反映你在当前屏幕条件下的辨色表现，不能用于体检或资格判定。
        </View>
        <View className='button-stack'>
          <Button
            className='secondary-button'
            onClick={() =>
              Taro.redirectTo({ url: '/pages/prepare/index?mode=quick' })
            }
          >
            重新快速自测
          </Button>
          <Button
            className='secondary-button'
            onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}
          >
            返回首页
          </Button>
        </View>
      </View>
    </View>
  )
}

function DeepResultView({
  report,
  unclearCount
}: {
  report: ScreeningReport
  unclearCount: number
}) {
  const restartDeepTest = () => {
    unlockDeepTest()
    Taro.redirectTo({ url: '/pages/prepare/index?mode=deep' })
  }

  if (report.sessionStatus === 'incomplete') {
    return (
      <View className='page result-page retry-result-page'>
        <View className='page-narrow'>
          <Text className='eyebrow'>深度自测 · 测试未完成</Text>
          <Text className='result-type'>本次测试未完整完成</Text>
          <Text className='result-lead'>
            完成全部题目后才能生成深度自测结果。
          </Text>
          <View className='card preliminary-result-card'>
            <Text className='section-title'>需要重新开始测试</Text>
            <Text className='result-copy'>
              本次没有获得完整的42题作答记录，因此不进行辨色方向和程度分析。
            </Text>
          </View>
          <View className='button-stack'>
            <Button className='primary-button' onClick={restartDeepTest}>
              重新开始测试
            </Button>
            <Button
              className='secondary-button'
              onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}
            >
              返回首页
            </Button>
          </View>
        </View>
      </View>
    )
  }

  if (report.sessionStatus === 'answer-anomaly') {
    return (
      <View className='page result-page retry-result-page'>
        <View className='page-narrow'>
          <Text className='eyebrow'>深度自测 · 作答异常</Text>
          <Text className='result-type'>本次结果需要重新确认</Text>
          <Text className='result-lead'>
            检测到部分题目出现连续快速作答。
          </Text>

          <View className='retry-callout'>
            <View className='retry-callout-heading'>
              <Text className='retry-callout-icon'>!</Text>
              <View className='retry-callout-heading-copy'>
                <Text className='retry-callout-title'>建议重新测试</Text>
                <Text className='retry-callout-copy'>
                  本次结果暂不建议作为参考。为避免给出可能误导的结论，请重新完成测试。
                </Text>
              </View>
            </View>
            <View className='retry-reason-list'>
              <Text className='retry-reason'>
                重新测试时请凭第一眼逐题作答，同时避免连续快速点击。
              </Text>
            </View>
          </View>

          <View className='button-stack'>
            <Button className='primary-button' onClick={restartDeepTest}>
              重新测试
            </Button>
            <Button
              className='secondary-button'
              onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}
            >
              返回首页
            </Button>
          </View>
        </View>
      </View>
    )
  }

  const axisEntries = (['l', 'm', 's'] as Axis[]).map(
    (axis) => report.axes[axis]
  )
  const maxScore = Math.max(...axisEntries.map((item) => item.score))
  const overallGrade = scoreGrade(maxScore)
  const typeMeta = TYPE_META[report.type]
  const markerPosition = Math.min(98, Math.max(2, maxScore))
  const typeIsUnclear = report.typeClarity === 'unclear'
  const repeatedUnclear = typeIsUnclear && unclearCount >= 2

  return (
    <View className='page result-page'>
      <View className='page-narrow'>
        <Text className='eyebrow'>深度自测报告 · 42 题</Text>
        <Text className='result-type'>{typeMeta.headline}</Text>
        <View className='result-badges'>
          <Text className='result-type-badge'>{typeMeta.subtype}</Text>
          <Text
            className={`result-grade-badge grade-${overallGrade.tone}`}
          >
            {overallGrade.label}
          </Text>
        </View>
        <Text className='result-lead'>{typeMeta.explanation}</Text>

        {typeIsUnclear && (
          <View className='card clarity-note-card'>
            <Text className='section-title'>具体类型暂不明确</Text>
            <Text className='result-copy'>
              {repeatedUnclear
                ? '多次屏幕自测均未形成明确的具体类型方向。如需进一步确认，建议进行标准色觉检查。'
                : '本次结果仍可用于了解辨色困难方向。如果希望进一步确认具体类型，可以在状态合适时再次测试。'}
            </Text>
          </View>
        )}

        <View className='diagnosis-limit'>
          <Text className='diagnosis-title'>本次辨色困难程度</Text>
          <Text className='diagnosis-result'>{overallGrade.label}</Text>
          <View className='degree-scale'>
            <View className='degree-track'>
              <View className='degree-segment segment-normal' />
              <View className='degree-segment segment-mild' />
              <View className='degree-segment segment-moderate' />
              <View className='degree-segment segment-marked' />
              <View
                className='degree-marker'
                style={{ left: `${markerPosition}%` }}
              >
                <View className='degree-marker-dot' />
              </View>
            </View>
            <View className='degree-labels'>
              <Text className='degree-label'>正常范围</Text>
              <Text className='degree-label'>轻微困难</Text>
              <Text className='degree-label'>明显困难</Text>
              <Text className='degree-label'>严重困难</Text>
            </View>
          </View>
          <Text className='diagnosis-question'>结果说明</Text>
          <Text className='diagnosis-text'>
            本次结果反映你在当前屏幕条件下的辨色表现，可提供类型倾向和辨色困难程度，但不能可靠判断是色弱还是色盲及其医学程度。如需用于体检或资格判定，请以标准色觉检查结果为准。
          </Text>
        </View>

        <View className='card'>
          <Text className='section-title'>三个辨色方向</Text>
          <Text className='small muted'>
            指数越高，表示本次需要更大的色差才能辨认。它用于比较三个方向，不代表医学分级。
          </Text>
          <View className='axis-list'>
            {axisEntries.map((item) => {
              const grade = scoreGrade(item.score)
              return (
                <View className='axis-row' key={item.axis}>
                  <View className='axis-head'>
                    <View className='axis-copy'>
                      <View className='axis-title-line'>
                        <Text className='axis-name'>
                          {AXIS_META[item.axis].name}
                        </Text>
                        <Text className='axis-term'>
                          {AXIS_META[item.axis].term}
                        </Text>
                      </View>
                      <Text className='axis-description'>
                        {AXIS_META[item.axis].description}
                      </Text>
                    </View>
                    <View className='axis-result'>
                      <Text className={`axis-level grade-${grade.tone}`}>
                        {grade.label}
                      </Text>
                      <Text className='axis-score'>指数 {item.score}</Text>
                    </View>
                  </View>
                  <View className='axis-track'>
                    <View
                      className='axis-fill'
                      style={{ width: `${Math.max(3, item.score)}%` }}
                    />
                  </View>
                  <Text className='axis-rate'>
                    稳定反转 {item.reversals} 次 · 题目正确率 {item.correctRate}%
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        <View className='card'>
          <Text className='section-title'>名词说明</Text>
          <Text className='result-copy'>
            protan 是偏红方向，deutan 是偏绿方向，两者都属于红绿色觉方向；tritan
            是蓝黄色觉方向。这些词表示倾向，不等于完全看不见某种颜色。
          </Text>
        </View>

        <Text className='result-time'>测试时间：{formatDate(report.createdAt)}</Text>
        <View className='notice'>
          本报告不能用于驾照、招录、入学、征兵或其他职业资格判定。
        </View>
        <View className='button-stack'>
          {!repeatedUnclear && (
            <Button className='primary-button' onClick={restartDeepTest}>
              {typeIsUnclear ? '再测一次进行确认' : '重新深度自测'}
            </Button>
          )}
          <Button
            className='secondary-button'
            onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}
          >
            返回首页
          </Button>
        </View>
      </View>
    </View>
  )
}

export default function ResultPage() {
  const router = useRouter()
  const requestedMode: TestMode =
    router.params.mode === 'deep' ? 'deep' : 'quick'
  const [report, setReport] = useState<ColorVisionReport>()
  const [deepUnclearCount, setDeepUnclearCount] = useState(0)

  useDidShow(() => {
    setReport(loadReport(requestedMode))
    setDeepUnclearCount(
      requestedMode === 'deep'
        ? loadDeepClarityState()?.consecutiveUnclearCount ?? 0
        : 0
    )
  })

  if (!report) return <EmptyResult mode={requestedMode} />

  const expectedVersion =
    report.mode === 'quick' ? QUICK_REPORT_VERSION : REPORT_VERSION
  if (report.version !== expectedVersion) {
    return (
      <View className='page empty-result'>
        <View className='card legacy-result-card'>
          <Text className='eyebrow'>测试算法已更新</Text>
          <Text className='section-title legacy-result-title'>
            旧结果需要重新测试
          </Text>
          <Button
            className='primary-button legacy-result-button'
            onClick={() =>
              Taro.redirectTo({
                url: `/pages/prepare/index?mode=${requestedMode}`
              })
            }
          >
            使用新版重新测试
          </Button>
        </View>
      </View>
    )
  }

  return report.mode === 'quick' ? (
    <QuickResultView report={report} />
  ) : (
    <DeepResultView report={report} unclearCount={deepUnclearCount} />
  )
}
