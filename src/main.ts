import { createApp } from 'vue'
import { ElEmpty, ElIcon, ElResult } from 'element-plus'
import 'element-plus/es/components/empty/style/css'
import 'element-plus/es/components/icon/style/css'
import 'element-plus/es/components/result/style/css'
import 'github-markdown-css/github-markdown-light.css'
import App from './App.vue'
import router from './router'
import { initializeTheme } from './lib/theme'
import './style-blog.css'

initializeTheme()

createApp(App).component('ElIcon', ElIcon).component('ElEmpty', ElEmpty).component('ElResult', ElResult).use(router).mount('#app')
