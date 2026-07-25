import { Button, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import {
  isDeepUnlocked,
  markPrepared,
  saveDevice
} from '@/lib/storage'
import type { DeviceSnapshot, TestMode } from '@/types'
import './index.css'

const CHECKS = [
  {
    key: 'filters',
    title: '关闭护眼、夜间和色彩滤镜',
    detail: '同时关闭原彩显示、True Tone 或类似自动色温功能。'
  },
  {
    key: 'brightness',
    title: '屏幕亮度调到约 70%',
    detail: '不要使用自动亮度，避免强光直射屏幕。'
  },
  {
    key: 'lighting',
    title: '使用中性室内光线',
    detail: '避免昏暗环境和彩色灯光，距离屏幕约 40–60 厘米。'
  },
  {
    key: 'vision',
    title: '佩戴平时使用的眼镜',
    detail: '保持双眼睁开；若两眼差异明显，之后应分别到眼科检查。'
  }
] as const

export default function PreparePage() {
  const [confirmed, setConfirmed] = useState(false)
  const [device, setDevice] = useState<DeviceSnapshot>()
  const [mode, setMode] = useState<TestMode>('quick')

  useLoad((options) => {
    const requestedMode: TestMode =
      options.mode === 'deep' ? 'deep' : 'quick'
    if (requestedMode === 'deep' && !isDeepUnlocked()) {
      Taro.showToast({ title: '请先从首页解锁深度自测', icon: 'none' })
      setTimeout(() => Taro.reLaunch({ url: '/pages/index/index' }), 500)
      return
    }
    setMode(requestedMode)

    try {
      const info = Taro.getDeviceInfo()
      const snapshot: DeviceSnapshot = {
        brand: info.brand || '未知',
        model: info.model || '未知',
        platform: info.platform || '未知',
        system: info.system || '未知',
        taroEnv: process.env.TARO_ENV || '未知',
        testedAt: new Date().toISOString()
      }
      setDevice(snapshot)
      saveDevice(snapshot)
    } catch {
      const snapshot: DeviceSnapshot = {
        brand: '未知',
        model: '浏览器设备',
        platform: 'web',
        system: '未知',
        taroEnv: process.env.TARO_ENV || 'h5',
        testedAt: new Date().toISOString()
      }
      setDevice(snapshot)
      saveDevice(snapshot)
    }
  })

  const showDevice =
    device &&
    !['unknown', '未知'].includes(device.brand.toLowerCase()) &&
    !['unknown', '未知'].includes(device.model.toLowerCase())

  const startTest = () => {
    if (!confirmed) return
    markPrepared(mode)
    Taro.redirectTo({ url: '/pages/test/index' })
  }

  return (
    <View className='page prepare-page'>
      <View className='page-narrow'>
        <Text className='eyebrow'>
          {mode === 'quick' ? '快速自测 · 15 题' : '深度自测 · 42 题'}
        </Text>
        <Text className='section-title prepare-title'>测试前温馨提醒</Text>
        <Text className='subtitle prepare-intro'>
          做好这些准备有助于减少屏幕和环境带来的误差。下面是提醒事项，不代表设备已自动完成设置。
        </Text>

        {showDevice && (
          <View className='device-chip'>
            <Text>
              当前设备：{device.brand} {device.model}
            </Text>
          </View>
        )}

        <View className='check-list'>
          {CHECKS.map((item, index) => (
            <View className='check-row' key={item.key}>
              <View className='check-index'>{index + 1}</View>
              <View className='check-copy'>
                <Text className='check-title'>{item.title}</Text>
                <Text className='check-detail'>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View
          className={`consent-row ${confirmed ? 'is-confirmed' : ''}`}
          onClick={() => setConfirmed((value) => !value)}
        >
          <View className='consent-box'>{confirmed ? '✓' : ''}</View>
          <Text className='consent-text'>
            我已阅读以上提醒，并准备在当前条件下开始自测
          </Text>
        </View>

        <Button
          className='primary-button prepare-action'
          disabled={!confirmed}
          onClick={startTest}
        >
          {confirmed
            ? `开始${mode === 'quick' ? '快速' : '深度'}自测`
            : '请先勾选确认'}
        </Button>
      </View>
    </View>
  )
}
