import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { shareResultOnWeb } from '@/lib/share'
import type { ColorVisionReport } from '@/types'

export default function ResultShareCard({
  report
}: {
  report: ColorVisionReport
}) {
  const isMiniProgram =
    Taro.getEnv() === Taro.ENV_TYPE.WEAPP ||
    Taro.getEnv() === Taro.ENV_TYPE.TT

  return (
    <View className='result-share-card'>
      <View className='result-share-copy'>
        <Text className='result-share-title'>分享结果摘要</Text>
        <Text className='result-share-description'>
          好友可查看辨色方向与程度线索，不会分享原始答案、反应时间和设备信息。
        </Text>
      </View>
      <Button
        className='primary-button result-share-button'
        openType={isMiniProgram ? 'share' : undefined}
        onClick={() => shareResultOnWeb(report)}
      >
        分享给好友
      </Button>
    </View>
  )
}
