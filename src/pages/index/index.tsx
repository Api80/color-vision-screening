import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { loadReport } from '@/lib/storage'
import './index.css'

export default function HomePage() {
  const [hasReport, setHasReport] = useState(false)

  useDidShow(() => {
    setHasReport(Boolean(loadReport()))
  })

  return (
    <View className='page home-page'>
      <View className='page-narrow'>
        <Text className='eyebrow'>辨色谱 · 色觉自测</Text>
        <Text className='title'>用几分钟，了解你的颜色辨别情况</Text>
        <Text className='subtitle'>
          通过动态小圆点和自适应难度，观察红绿色、蓝黄色辨别表现，提供类型方向和辨色困难程度。
        </Text>

        <View className='feature-grid'>
          <View className='feature-item'>
            <Text className='feature-value'>3</Text>
            <Text className='feature-label'>个辨色方向</Text>
          </View>
          <View className='feature-item'>
            <Text className='feature-value'>42</Text>
            <Text className='feature-label'>道动态题目</Text>
          </View>
          <View className='feature-item'>
            <Text className='feature-value'>约5分钟</Text>
            <Text className='feature-label'>完成自测</Text>
          </View>
        </View>

        <View className='button-stack'>
          <Button
            className='primary-button'
            onClick={() => Taro.navigateTo({ url: '/pages/prepare/index' })}
          >
            开始色觉自测
          </Button>
          {hasReport && (
            <Button
              className='secondary-button'
              onClick={() => Taro.navigateTo({ url: '/pages/result/index' })}
            >
              查看上次结果
            </Button>
          )}
        </View>

        <View className='notice'>
          屏幕亮度和环境光会影响结果。本测试仅用于个人自测与了解，不能用于驾照、招录、入学或职业资格评定。
        </View>

        <View className='privacy-line'>
          <Text>无需登录 · 不上传个人信息 · 结果仅保存在当前设备</Text>
        </View>
      </View>
    </View>
  )
}
