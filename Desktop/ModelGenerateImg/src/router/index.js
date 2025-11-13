import Vue from 'vue'
import VueRouter from 'vue-router'
import Main from '@/views/Main.vue'
import studio from '@/views/studio.vue'
Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: Main,
  },
  {
    path:'/studio',
    name:'studio',
    component:studio
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})


export default router
