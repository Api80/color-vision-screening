import Taro from '@tarojs/taro'
import type { ColorVisionReport, QuickResultType, ScreeningReport } from '@/types'

const SHARE_VERSION = '1'

type DegreeCode = 'typical' | 'mild' | 'moderate' | 'marked'

export interface SharedResultSummary {
  mode: 'quick' | 'deep'
  headline: string
  direction: string
  tendency?: string
  degree?: string
}

const QUICK_RESULT_CODES: Record<QuickResultType, string> = {
  typical: 'ok',
  'red-green': 'rg',
  'blue-yellow': 'by',
  broad: 'multi',
  uncertain: 'unclear'
}

const QUICK_SUMMARIES: Record<string, SharedResultSummary> = {
  ok: {
    mode: 'quick',
    headline: '未发现明显辨色困难',
    direction: '红绿和蓝黄方向均未见明显困难线索'
  },
  rg: {
    mode: 'quick',
    headline: '可能存在红绿色辨别困难',
    direction: '红绿色辨别方向'
  },
  by: {
    mode: 'quick',
    headline: '可能存在蓝黄色辨别困难',
    direction: '蓝黄色辨别方向'
  },
  multi: {
    mode: 'quick',
    headline: '可能存在多个方向的辨色困难',
    direction: '红绿和蓝黄辨别方向'
  },
  unclear: {
    mode: 'quick',
    headline: '本次结果不够清晰',
    direction: '暂未形成清晰的辨色困难方向'
  }
}

const DEEP_TYPE_CODES: Record<ScreeningReport['type'], string> = {
  typical: 'ok',
  protan: 'p',
  deutan: 'd',
  tritan: 't',
  broad: 'multi',
  uncertain: 'unclear'
}

const DEEP_SUMMARIES: Record<
  string,
  Pick<SharedResultSummary, 'headline' | 'direction' | 'tendency'>
> = {
  ok: {
    headline: '本次辨色表现接近正常范围',
    direction: '三个辨色方向均未见明显困难',
    tendency: '未形成明显类型倾向'
  },
  p: {
    headline: '红绿色辨别存在困难',
    direction: '红绿色辨别方向',
    tendency: '更偏向偏红色觉型（protan）'
  },
  d: {
    headline: '红绿色辨别存在困难',
    direction: '红绿色辨别方向',
    tendency: '更偏向偏绿色觉型（deutan）'
  },
  t: {
    headline: '蓝黄色辨别存在困难',
    direction: '蓝黄色辨别方向',
    tendency: '更偏向蓝黄色觉型（tritan）'
  },
  multi: {
    headline: '多个方向辨色存在困难',
    direction: '多个辨色方向',
    tendency: '暂未形成单一类型倾向'
  },
  unclear: {
    headline: '红绿色辨别存在困难',
    direction: '红绿色辨别方向',
    tendency: '具体类型倾向暂不明确'
  }
}

const DEGREE_LABELS: Record<DegreeCode, string> = {
  typical: '接近正常范围',
  mild: '轻微辨色困难线索',
  moderate: '明显辨色困难线索',
  marked: '严重辨色困难线索'
}

function degreeCode(score: number): DegreeCode {
  if (score < 25) return 'typical'
  if (score < 50) return 'mild'
  if (score < 75) return 'moderate'
  return 'marked'
}

export function createSharedResultPath(report: ColorVisionReport) {
  const params: string[] = [`v=${SHARE_VERSION}`]

  if (report.mode === 'quick') {
    params.push('m=q', `r=${QUICK_RESULT_CODES[report.result]}`)
  } else {
    const maxScore = Math.max(
      report.axes.l.score,
      report.axes.m.score,
      report.axes.s.score
    )
    params.push(
      'm=d',
      `r=${DEEP_TYPE_CODES[report.type]}`,
      `g=${degreeCode(maxScore)}`
    )
  }

  return `/pages/shared-result/index?${params.join('&')}`
}

export function parseSharedResult(
  params: Record<string, string | undefined>
): SharedResultSummary | undefined {
  if (params.v !== SHARE_VERSION || !params.r) return undefined

  if (params.m === 'q') {
    return QUICK_SUMMARIES[params.r]
  }

  if (params.m === 'd') {
    const base = DEEP_SUMMARIES[params.r]
    const degree =
      params.g && params.g in DEGREE_LABELS
        ? DEGREE_LABELS[params.g as DegreeCode]
        : undefined
    if (!base || !degree) return undefined
    return { mode: 'deep', ...base, degree }
  }

  return undefined
}

export function createShareMessage(report: ColorVisionReport) {
  const summary =
    report.mode === 'quick'
      ? QUICK_SUMMARIES[QUICK_RESULT_CODES[report.result]]
      : DEEP_SUMMARIES[DEEP_TYPE_CODES[report.type]]

  const message = {
    title: `我完成了辨色自测：${summary.headline}`,
    path: createSharedResultPath(report)
  }

  return withSharePlatformOptions(message)
}

export function withSharePlatformOptions<T extends { title: string; path: string }>(
  message: T
) {
  if (Taro.getEnv() === Taro.ENV_TYPE.TT && __TT_SHARE_TEMPLATE_ID__) {
    return { ...message, templateId: __TT_SHARE_TEMPLATE_ID__ }
  }

  return message
}

export async function shareResultOnWeb(report: ColorVisionReport) {
  if (Taro.getEnv() !== Taro.ENV_TYPE.WEB) return

  const path = createSharedResultPath(report)
  const url = `${window.location.origin}${window.location.pathname}#${path}`
  const title = '我的辨色自测结果'

  if (navigator.share) {
    try {
      await navigator.share({ title, text: title, url })
      return
    } catch {
      return
    }
  }

  await Taro.setClipboardData({ data: url })
  Taro.showToast({ title: '结果链接已复制', icon: 'success' })
}
