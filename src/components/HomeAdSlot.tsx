import { Ad, Text, View } from '@tarojs/components'
import { HOME_AD_UNIT_ID } from '@/lib/ads'
import './HomeAdSlot.css'

export default function HomeAdSlot() {
  if (HOME_AD_UNIT_ID) {
    return (
      <View className='home-ad-slot'>
        <Text className='home-ad-label'>广告</Text>
        <Ad unitId={HOME_AD_UNIT_ID} adIntervals={60} type='banner' />
      </View>
    )
  }

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <View className='home-ad-slot home-ad-placeholder'>
      <Text className='home-ad-label'>广告位预览</Text>
      <Text className='home-ad-copy'>配置平台广告位 ID 后在这里展示</Text>
    </View>
  )
}
