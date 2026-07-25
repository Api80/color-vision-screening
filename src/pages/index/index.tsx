import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import HomeAdSlot from '@/components/HomeAdSlot'
import { requestDeepUnlock } from '@/lib/ads'
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

    const modal = await Taro.showModal({
      title: '解锁深度自测',
      content:
        '完整观看一段激励视频，可开始本次 42 题深度自测。若广告暂时不可用，将直接为你开放。',
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
    if (result.source === 'fallback') {
      Taro.showToast({ title: '广告不可用，已直接开放', icon: 'none' })
    }
    setTimeout(() => enterMode('deep'), result.source === 'fallback' ? 500 : 0)
  }

  return (
    <View className='page home-page'>
      <View className='page-narrow'>
        <Text className='eyebrow'>辨色谱 · 色觉自测</Text>
        <Text className='title'>先快速测一测，需要时再详细了解</Text>
        <Text className='subtitle'>
          通过动态小圆点图案，了解红绿色和蓝黄色辨别表现。无需登录，结果仅保存在当前设备。
        </Text>

        <View className='mode-list'>
          <View className='mode-card mode-card-primary'>
            <View className='mode-card-head'>
              <View>
                <Text className='mode-recommend'>推荐先测</Text>
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
              免费开始
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
                : deepUnlocked
                  ? '开始深度自测'
                  : '看一段广告，解锁深度自测'}
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

        <HomeAdSlot />

        <View className='notice'>
          屏幕亮度和环境光会影响结果。本测试仅用于个人自测与了解，不能用于驾照、招录、入学或职业资格评定。
        </View>
      </View>
    </View>
  )
}
