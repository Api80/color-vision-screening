export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/prepare/index',
    'pages/test/index',
    'pages/result/index',
    'pages/shared-result/index',
    'pages/color-vision-guide/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f5f3ee',
    navigationBarTitleText: '辨色谱',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f5f3ee'
  },
  sitemapLocation: 'sitemap.json',
  lazyCodeLoading: 'requiredComponents'
})
