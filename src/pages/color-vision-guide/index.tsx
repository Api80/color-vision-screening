import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import BrandMark from '@/components/BrandMark'
import './index.css'

export default function ColorVisionGuidePage() {
  const startQuickTest = () => {
    Taro.navigateTo({ url: '/pages/prepare/index?mode=quick' })
  }

  return (
    <View className='page color-guide-page'>
      <View className='page-narrow'>
        <View className='guide-brand'>
          <BrandMark />
          <Text className='guide-brand-name'>辨色谱</Text>
        </View>

        <Text className='eyebrow'>颜色分辨与色觉自测</Text>
        <Text className='guide-title'>色弱测试和色盲测试能了解什么？</Text>
        <Text className='guide-lead'>
          辨色谱通过动态小圆点图案进行屏幕色觉自测，帮助你了解红绿、蓝黄方向的辨色表现。你可以选择快速自测获得初步提示，也可以通过深度自测查看更详细的表现。
        </Text>

        <View className='guide-card'>
          <Text className='guide-section-title'>辨色测试怎么做？</Text>
          <Text className='guide-paragraph'>
            观察由彩色小圆点组成的圆环，选择你看到的缺口方向：上、右、下或左。如果看不清，就选择“看不清缺口”。图案会随题目变化，按第一眼看到的情况作答即可。
          </Text>
        </View>

        <View className='guide-card'>
          <Text className='guide-section-title'>常见的颜色分辨表现</Text>
          <Text className='guide-paragraph'>
            红绿色觉方向出现差异时，红、绿、棕、橙等颜色在部分场景下可能更容易混淆；蓝黄色觉方向出现差异时，蓝与绿、黄与粉红等颜色可能不容易区分。每个人的实际表现和程度并不完全相同。
          </Text>
        </View>

        <View className='guide-card'>
          <Text className='guide-section-title'>两种模式的结果有什么区别？</Text>
          <Text className='guide-paragraph'>
            快速自测共15题，约1–2分钟，用于初步了解红绿、蓝黄方向是否出现辨色困难线索，不细分具体类型。深度自测共42题，约4–6分钟，比较偏红、偏绿和蓝黄三个方向的表现，提供类型倾向和辨色困难程度线索。这里的程度描述反映本次作答表现，不是医学分级。
          </Text>
        </View>

        <View className='guide-card'>
          <Text className='guide-section-title'>为什么屏幕结果会变化？</Text>
          <Text className='guide-paragraph'>
            屏幕亮度、护眼模式、色彩滤镜、环境光和作答状态都会影响颜色呈现与辨认结果。测试前应关闭色彩滤镜和自动色温，使用适中亮度与中性室内光线，并保持正常观看距离。
          </Text>
        </View>

        <View className='guide-limit'>
          <Text className='guide-limit-title'>自测结果的适用范围</Text>
          <Text className='guide-limit-copy'>
            本工具仅用于个人了解当前屏幕条件下的辨色表现，不能作为正式体检或资格判定依据。如需确认医学程度，请前往医院眼科或具备相应资质的医疗机构进行标准色觉检查。
          </Text>
        </View>

        <Button className='primary-button guide-action' onClick={startQuickTest}>
          开始快速色觉自测
        </Button>
        <Button
          className='secondary-button guide-home-action'
          onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}
        >
          返回首页
        </Button>
      </View>
    </View>
  )
}
