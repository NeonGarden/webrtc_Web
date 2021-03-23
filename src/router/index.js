import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
  
    
    {
      path: '/',
      component: (resolve) => require(['@/views/many'], resolve)
    },
    {
      path: '/room',
      component: (resolve) => require(['@/views/home'], resolve)
    },
  ]
})
