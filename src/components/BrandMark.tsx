import { View } from '@tarojs/components'
import './BrandMark.css'

interface BrandMarkProps {
  size?: 'small' | 'medium'
}

export default function BrandMark({ size = 'medium' }: BrandMarkProps) {
  return (
    <View
      className={`brand-symbol ${
        size === 'small' ? 'brand-symbol--small' : ''
      }`}
      aria-label='辨色谱标志'
    >
      <View className='brand-symbol-ring' />
      <View className='brand-symbol-dot brand-symbol-dot--blue' />
      <View className='brand-symbol-dot brand-symbol-dot--orange' />
    </View>
  )
}
