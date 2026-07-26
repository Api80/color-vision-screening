import { Ad, Text, View } from '@tarojs/components'
import { HOME_AD_UNIT_ID } from '@/lib/ads'
import './HomeAdSlot.css'

export default function HomeAdSlot() {
  if (!HOME_AD_UNIT_ID) return null

  return (
    <View className='home-ad-slot'>
      <Text className='home-ad-label'>广告</Text>
      <Ad unitId={HOME_AD_UNIT_ID} adIntervals={60} type='banner' />
    </View>
  )
}
