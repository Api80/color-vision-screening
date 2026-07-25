import { Button, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { markPrepared, saveDevice } from '@/lib/storage'
import type { DeviceSnapshot } from '@/types'
import './index.css'

const CHECKS = [
  {
    key: 'filters',
    title: '关闭护眼、夜间和色彩滤镜',
    detail: '同时关闭原彩显示、True Tone或类似自动色温功能。'
  },
  {
    key: 'brightness',
    title: '屏幕亮度调到约70%',
    detail: '不要使用自动亮度，避免强光直射屏幕。'
  },
  {
    key: 'lighting',
    title: '使用中性室内光线',
    detail: '避免昏暗环境和彩色灯光，距离屏幕约40–60厘米。'
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

  useLoad(() => {
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
    markPrepared()
    Taro.redirectTo({ url: '/pages/test/index' })
  }

  return (
    <View className='page prepare-page'>
      <View className='page-narrow'>
        <Text className='section-title'>测试前温馨提醒</Text>
        <Text className='subtitle prepare-intro'>
          完成以下准备有助于减少屏幕和环境带来的误差，让测试结果更稳定。
        </Text>

        {showDevice && (
          <View className='device-chip'>
            <Text>当前设备：{device.brand} {device.model}</Text>
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
            我已了解以上提醒，并已做好测试准备
          </Text>
        </View>

        <Button
          className='primary-button prepare-action'
          disabled={!confirmed}
          onClick={startTest}
        >
          {confirmed ? '开始色觉自测' : '请先勾选确认'}
        </Button>
      </View>
    </View>
  )
}
