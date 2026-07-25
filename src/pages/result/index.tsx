import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { REPORT_VERSION } from '@/lib/report'
import { loadReport } from '@/lib/storage'
import type { Axis, ScreeningReport } from '@/types'
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
      '长波相关方向的辨色困难更突出，部分红、绿、棕色可能更容易混淆，红色也可能显得偏暗。'
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
      '两条或更多辨色方向同时偏高，可能与显示条件、注意状态或多方向色觉问题有关，建议复测。'
  },
  uncertain: {
    headline: '结果方向暂不明确',
    subtype: '暂时无法稳定分型',
    explanation:
      '当前作答没有形成稳定方向，建议调整屏幕和环境后重新测试。'
  }
}

const TERM_CARDS = [
  {
    term: 'protan',
    name: '偏红型',
    description: 'L 视锥相关，属于红绿色觉方向；红色有时会显得更暗。'
  },
  {
    term: 'deutan',
    name: '偏绿型',
    description: 'M 视锥相关，属于红绿色觉方向，也是常见分型。'
  },
  {
    term: 'tritan',
    name: '蓝黄型',
    description: 'S 视锥相关，主要影响蓝黄辨色，相对少见。'
  }
] as const

function scoreGrade(score: number) {
  if (score < 25) return { label: '接近正常范围', tone: 'typical' }
  if (score < 50) return { label: '轻微辨色困难', tone: 'mild' }
  if (score < 75) return { label: '明显辨色困难', tone: 'moderate' }
  return { label: '严重辨色困难', tone: 'marked' }
}

function screeningConclusion(score: number) {
  if (score < 25) return '本次表现接近正常范围'
  if (score < 50) return '本次表现为轻微辨色困难'
  if (score < 75) return '本次表现为明显辨色困难'
  return '本次表现为严重辨色困难，建议进一步检查'
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

function buildRetryReasons(report: ScreeningReport) {
  const reasons: string[] = []
  const easyMisses = report.records.filter(
    (record) => record.contrast >= 0.2 && !record.correct
  ).length
  const tooFast = report.records.filter(
    (record) => record.responseMs < 250
  ).length
  const axisResults = (['l', 'm', 's'] as Axis[])
    .map((axis) => report.axes[axis])
    .sort((left, right) => right.score - left.score)

  if (easyMisses >= 3) {
    reasons.push('容易辨认的题目出现多次错误，请检查显示设置并认真作答。')
  }
  if (tooFast >= 3) {
    reasons.push('多次作答过快，请凭第一眼判断后再选择。')
  }
  if (
    axisResults[0].score >= 35 &&
    axisResults[0].score - axisResults[1].score < 8
  ) {
    reasons.push('不同辨色方向的结果过于接近，暂时无法形成清晰方向。')
  }
  if (axisResults.some((item) => item.score > 0 && item.reversals < 2)) {
    reasons.push('部分方向的有效变化次数不足，建议重新测试。')
  }

  return reasons.length > 0
    ? reasons
    : ['本次前后作答没有形成清晰规律，建议调整状态后重新测试。']
}

export default function ResultPage() {
  const [report, setReport] = useState<ScreeningReport>()

  useDidShow(() => {
    setReport(loadReport())
  })

  if (!report) {
    return (
      <View className='page empty-result'>
        <Text className='section-title'>还没有自测结果</Text>
        <Button
          className='primary-button'
          onClick={() => Taro.redirectTo({ url: '/pages/prepare/index' })}
        >
          开始测试
        </Button>
      </View>
    )
  }

  if (report.version !== REPORT_VERSION) {
    return (
      <View className='page empty-result'>
        <View className='card legacy-result-card'>
          <Text className='eyebrow'>测试算法已更新</Text>
          <Text className='section-title legacy-result-title'>
            旧结果已作废
          </Text>
          <Text className='result-copy'>
            旧版存在程度偏高和方向顺序可预测的问题，不能继续用于判断。请使用新版重新测试。
          </Text>
          <Button
            className='primary-button legacy-result-button'
            onClick={() => Taro.redirectTo({ url: '/pages/prepare/index' })}
          >
            使用新版重新测试
          </Button>
        </View>
      </View>
    )
  }

  if (report.confidenceScore < 60) {
    const retryReasons = buildRetryReasons(report)

    return (
      <View className='page result-page retry-result-page'>
        <View className='page-narrow'>
          <Text className='eyebrow'>辨色谱 · 建议重新测试</Text>
          <Text className='result-type'>本次暂时无法得出清晰结果</Text>
          <Text className='result-lead'>
            作答过程可能受到速度、注意力或显示环境影响。本次不展示类型和辨色困难程度。
          </Text>

          <View className='card retry-reasons-card'>
            <Text className='section-title'>重测前请注意</Text>
            <View className='retry-reason-list'>
              {retryReasons.map((reason) => (
                <Text className='retry-reason' key={reason}>
                  • {reason}
                </Text>
              ))}
            </View>
          </View>

          <View className='summary-grid summary-grid-single'>
            <View className='summary-item'>
              <Text className='summary-label'>测试时间</Text>
              <Text className='summary-value summary-date'>
                {formatDate(report.createdAt)}
              </Text>
            </View>
          </View>

          <View className='button-stack'>
            <Button
              className='primary-button'
              onClick={() => Taro.redirectTo({ url: '/pages/prepare/index' })}
            >
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
  const severityLabel = overallGrade.label
  const markerPosition = Math.min(98, Math.max(2, maxScore))

  return (
    <View className='page result-page'>
      <View className='page-narrow'>
        <Text className='eyebrow'>辨色谱 · 色觉自测结果</Text>
        <Text className='result-type'>{typeMeta.headline}</Text>
        <View className='result-badges'>
          <Text className='result-type-badge'>{typeMeta.subtype}</Text>
          <Text className={`result-grade-badge grade-${overallGrade.tone}`}>
            {severityLabel}
          </Text>
        </View>
        <Text className='result-lead'>{typeMeta.explanation}</Text>

        <View className='diagnosis-limit'>
          <View className='diagnosis-heading'>
            <View className='diagnosis-icon'>!</View>
            <View className='diagnosis-copy'>
              <Text className='diagnosis-title'>本次辨色困难程度</Text>
              <Text className='diagnosis-result'>
                {screeningConclusion(maxScore)}
              </Text>
            </View>
          </View>

          <View className='degree-scale'>
            <View className='degree-groups'>
              <Text className='degree-group degree-group-normal'>
                正常范围
              </Text>
              <Text className='degree-group degree-group-weak'>辨色困难</Text>
              <Text className='degree-group degree-group-blind'>
                建议检查
              </Text>
            </View>
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
            本次结果反映你在当前屏幕条件下的辨色表现。如需进一步确认本次结果，或用于体检和资格判定，请以标准色觉检查结果为准。
          </Text>
        </View>

        <View className='summary-grid summary-grid-single'>
          <View className='summary-item'>
            <Text className='summary-label'>测试时间</Text>
            <Text className='summary-value summary-date'>
              {formatDate(report.createdAt)}
            </Text>
          </View>
        </View>

        <View className='card'>
          <Text className='section-title'>三个辨色方向</Text>
          <Text className='small muted'>
            指数越高，表示本次需要更大的色差才能辨认。它用于比较三个方向的表现，不代表医学分级。
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

        <View className='card glossary-card'>
          <Text className='section-title'>这些英文分别是什么意思？</Text>
          <Text className='small muted'>
            它们是不同的色觉表现方向，不等同于“完全看不见某种颜色”。
          </Text>
          <View className='term-grid'>
            {TERM_CARDS.map((item) => (
              <View className='term-item' key={item.term}>
                <View className='term-head'>
                  <Text className='term-code'>{item.term}</Text>
                  <Text className='term-name'>{item.name}</Text>
                </View>
                <Text className='term-description'>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className='card'>
          <Text className='section-title'>下一步怎么做</Text>
          <Text className='result-copy'>
            若重复测试仍出现同一方向的明显或严重辨色困难，可以到眼科或正规视光机构使用标准色觉图、HRR、D-15或异常镜进一步确认。
          </Text>
          <View className='divider' />
          <Text className='result-copy'>
            若颜色辨别近期突然变化、左右眼明显不同，或伴随视力下降、眼痛、复视，应尽快就医。
          </Text>
        </View>

        <View className='notice'>
          不能将本报告用于驾照、招录、入学、征兵或其他职业资格判定。
        </View>

        <View className='button-stack'>
          <Button
            className='primary-button'
            onClick={() => Taro.redirectTo({ url: '/pages/prepare/index' })}
          >
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
