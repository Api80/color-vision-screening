import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import devConfig from './dev'
import prodConfig from './prod'

export default defineConfig<'webpack5'>(async (merge, { command, mode }) => {
  const h5PublicPath = process.env.H5_PUBLIC_PATH || '/'
  const targetPlatform = process.env.TARO_ENV || 'h5'
  const adUnitIds = {
    weappHome: process.env.TARO_APP_WEAPP_HOME_AD_UNIT_ID || '',
    weappRewarded: process.env.TARO_APP_WEAPP_REWARDED_AD_UNIT_ID || '',
    ttHome: process.env.TARO_APP_TT_HOME_AD_UNIT_ID || '',
    ttRewarded: process.env.TARO_APP_TT_REWARDED_AD_UNIT_ID || ''
  }
  const shareTemplateIds = {
    tt: process.env.TARO_APP_TT_SHARE_TEMPLATE_ID || ''
  }

  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'color-vision-screening',
    date: '2026-07-26',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: `dist/${targetPlatform}`,
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: true
    },
    plugins: [
      '@tarojs/plugin-platform-weapp',
      '@tarojs/plugin-platform-tt',
      '@tarojs/plugin-platform-h5'
    ],
    alias: {
      '@': require('path').resolve(__dirname, '..', 'src')
    },
    copy: {
      patterns: [
        {
          from: require('path').resolve(__dirname, '..', 'src', 'sitemap.json'),
          to: `dist/${targetPlatform}/sitemap.json`
        }
      ],
      options: {}
    },
    defineConstants: {
      __WEAPP_HOME_AD_UNIT_ID__: JSON.stringify(adUnitIds.weappHome),
      __WEAPP_REWARDED_AD_UNIT_ID__: JSON.stringify(adUnitIds.weappRewarded),
      __TT_HOME_AD_UNIT_ID__: JSON.stringify(adUnitIds.ttHome),
      __TT_REWARDED_AD_UNIT_ID__: JSON.stringify(adUnitIds.ttRewarded),
      __TT_SHARE_TEMPLATE_ID__: JSON.stringify(shareTemplateIds.tt)
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false
        }
      }
    },
    h5: {
      publicPath: h5PublicPath,
      staticDirectory: 'static',
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false
        }
      }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
