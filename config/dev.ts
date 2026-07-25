import type { UserConfigExport } from '@tarojs/cli'

export default {
  env: {
    NODE_ENV: '"development"'
  },
  defineConstants: {},
  mini: {},
  h5: {
    devServer: {
      host: '0.0.0.0',
      port: 10086
    }
  }
} satisfies UserConfigExport<'webpack5'>

