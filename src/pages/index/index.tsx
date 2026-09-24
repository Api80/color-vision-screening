import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import BrandMark from '@/components/BrandMark'
import HomeAdSlot from '@/components/HomeAdSlot'
import { HAS_REWARDED_AD, requestDeepUnlock } from '@/lib/ads'
import { isDeepUnlocked, loadReport } from '@/lib/storage'
import './index.css'

export default function HomePage() {
  const [hasQuickReport, setHasQuickReport] = useState(false)
  const [hasDeepReport, setHasDeepReport] = useState(false)
  const [deepUnlocked, setDeepUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  useDidShow(() => {
    setHasQuickReport(Boolean(loadReport('quick')))
    setHasDeepReport(Boolean(loadReport('deep')))
    setDeepUnlocked(isDeepUnlocked())
  })

  const enterMode = (mode: 'quick' | 'deep') => {
    Taro.navigateTo({ url: `/pages/prepare/index?mode=${mode}` })
  }

  const unlockDeep = async () => {
    if (unlocking) return
    if (deepUnlocked) {
      enterMode('deep')
      return
    }

    if (!HAS_REWARDED_AD) {
      const result = await requestDeepUnlock()
      if (result.unlocked) {
        setDeepUnlocked(true)
        enterMode('deep')
      }
      return
    }

    const modal = await Taro.showModal({
      title: '解锁深度自测',
      content:
        '观看一段激励视频，可解锁本次 42 题深度自测。完整观看后将自动进入测试。',
      confirmText: '看广告',
      cancelText: '暂不'
    })
    if (!modal.confirm) return

    setUnlocking(true)
    const result = await requestDeepUnlock()
    setUnlocking(false)
    if (!result.unlocked) {
      Taro.showToast({ title: '完整观看后可解锁', icon: 'none' })
      return
    }
    setDeepUnlocked(true)
    enterMode('deep')
  }

  return (
    <View className='page home-page'>
      <View className='page-narrow'>
        <View className='home-brand'>
          <BrandMark />
          <View className='home-brand-copy'>
            <Text className='home-brand-name'>辨色谱</Text>
            <Text className='home-brand-subtitle'>色觉自测</Text>
          </View>
        </View>
        <Text className='title'>色觉自测，了解你的辨色表现</Text>
        <Text className='subtitle'>
          关注色弱、色盲相关的颜色分辨困难？通过快速或深度自测，了解红绿、蓝黄方向的辨色表现。
        </Text>
        <Text className='home-mode-note'>
          两种模式均无需登录，自测记录保存在当前设备。
        </Text>

        <View className='mode-list'>
          <View className='mode-card'>
            <View className='mode-card-head'>
              <View>
                <Text className='mode-title'>快速自测</Text>
              </View>
              <Text className='mode-time'>15 题 · 约 1–2 分钟</Text>
            </View>
            <Text className='mode-description'>
              快速了解是否存在明显的红绿或蓝黄辨色困难，结果简洁，不做具体分型和程度判断。
            </Text>
            <Button
              className='primary-button mode-action'
              onClick={() => enterMode('quick')}
            >
              开始快速自测
            </Button>
            {hasQuickReport && (
              <Text
                className='mode-history'
                onClick={() =>
                  Taro.navigateTo({ url: '/pages/result/index?mode=quick' })
                }
              >
                查看上次快速结果 →
              </Text>
            )}
          </View>

          <View className='mode-card'>
            <View className='mode-card-head'>
              <View>
                <Text className='mode-title'>深度自测</Text>
                <Text className='mode-detail-tag'>更详细</Text>
              </View>
              <Text className='mode-time'>42 题 · 约 4–6 分钟</Text>
            </View>
            <Text className='mode-description'>
              观察三个辨色方向的相对表现，提供类型倾向、辨色困难程度和详细报告。
            </Text>
            <Button
              className={`secondary-button mode-action deep-action ${
                unlocking ? 'is-loading' : ''
              }`}
              onClick={unlockDeep}
            >
              {unlocking
                ? '正在准备广告…'
                : '开始深度自测'}
            </Button>
            {hasDeepReport && (
              <Text
                className='mode-history'
                onClick={() =>
                  Taro.navigateTo({ url: '/pages/result/index?mode=deep' })
                }
              >
                查看上次深度报告 →
              </Text>
            )}
          </View>
        </View>

        <View className='notice'>
          屏幕亮度和环境光会影响结果。本测试仅用于个人自测与了解，不能作为正式体检或资格判定依据。
        </View>

        <View
          className='color-guide-entry'
          onClick={() =>
            Taro.navigateTo({ url: '/pages/color-vision-guide/index' })
          }
        >
          <View className='color-guide-copy'>
            <Text className='color-guide-title'>了解色弱、色盲与辨色自测</Text>
            <Text className='color-guide-description'>
              了解测试方式、结果含义和屏幕自测的适用范围
            </Text>
          </View>
          <Text className='color-guide-arrow'>→</Text>
        </View>

        <HomeAdSlot />
      </View>
    </View>
  )
}
