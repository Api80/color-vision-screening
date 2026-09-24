import { Button, Text, View } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import BrandMark from '@/components/BrandMark'
import { parseSharedResult, withSharePlatformOptions } from '@/lib/share'
import './index.css'

export default function SharedResultPage() {
  const router = useRouter()
  const summary = parseSharedResult(router.params)

  useShareAppMessage(() => {
    const safeParams = ['v', 'm', 'r', 'g']
      .filter((key) => router.params[key] !== undefined)
      .map(
        (key) =>
          `${key}=${encodeURIComponent(router.params[key] ?? '')}`
      )
      .join('&')

    return withSharePlatformOptions({
      title: summary
        ? `好友的辨色自测摘要：${summary.headline}`
        : '来做一次辨色自测',
      path: summary
        ? `/pages/shared-result/index?${safeParams}`
        : '/pages/index/index'
    })
  })

  const startQuickTest = () => {
    Taro.reLaunch({ url: '/pages/prepare/index?mode=quick' })
  }

  if (!summary) {
    return (
      <View className='page shared-result-page'>
        <View className='page-narrow'>
          <Text className='eyebrow'>分享内容已失效</Text>
          <Text className='result-type'>暂时无法查看这份结果</Text>
          <Text className='result-lead'>
            分享参数可能不完整或来自较早的版本，你仍可以进行一次自己的辨色自测。
          </Text>
          <Button className='primary-button shared-primary' onClick={startQuickTest}>
            我也测一下
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className='page shared-result-page'>
      <View className='page-narrow'>
        <View className='shared-brand'>
          <BrandMark />
          <View>
            <Text className='shared-brand-name'>辨色谱</Text>
            <Text className='shared-brand-caption'>好友分享的自测结果</Text>
          </View>
        </View>

        <Text className='eyebrow'>
          {summary.mode === 'quick' ? '快速自测摘要 · 15 题' : '深度自测摘要 · 42 题'}
        </Text>
        <Text className='shared-headline'>{summary.headline}</Text>

        <View className='card shared-summary-card'>
          <View className='shared-summary-row'>
            <Text className='shared-summary-label'>辨色方向</Text>
            <Text className='shared-summary-value'>{summary.direction}</Text>
          </View>
          {summary.tendency && (
            <View className='shared-summary-row'>
              <Text className='shared-summary-label'>类型倾向</Text>
              <Text className='shared-summary-value'>{summary.tendency}</Text>
            </View>
          )}
          {summary.degree && (
            <View className='shared-summary-row'>
              <Text className='shared-summary-label'>程度线索</Text>
              <Text className='shared-summary-value'>{summary.degree}</Text>
            </View>
          )}
        </View>

        <View className='shared-notice'>
          这是用户主动分享的屏幕自测摘要，仅用于个人了解，不是医学诊断或正式证明，也不能用于体检及资格判定。
        </View>

        <Button className='primary-button shared-primary' onClick={startQuickTest}>
          我也测一下
        </Button>
        <Button
          className='secondary-button shared-secondary'
          onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}
        >
          查看两种自测方式
        </Button>
      </View>
    </View>
  )
}
