import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import App from './App.vue';
import router from './router';
import api from '@/utils/requests';

Vue.use(ElementUI);

Vue.prototype.$api = api;

new Vue({
  el: '#app',
  router,
  render: h => h(App)
});