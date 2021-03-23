<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App',
  created() {
    //初始化方法
     this.localSocket()
  },
  methods:{
     localSocket() {
       let that = this;
         if ("WebSocket" in window) {
                    // console.log("您的浏览器支持 WebSocket!");
                    // location.host
                    that.ws = new WebSocket("ws://"+ '192.168.1.120:8087');
                    that.global.setWs(that.ws);
                    that.ws.onopen = function () {
                        console.log('websocket连接成功');
                        that.resetHeart(); //重置心跳
                    };

                    that.ws.onclose = function () {
                        // 关闭 websocket
                        console.log("连接已关闭...");
                        //断线重新连接
                        setTimeout(() => {
                            that.localSocket();
                        }, 2000);
                    };
                    that.ws.onerror = function () {
                        console.log("连接出错...");
                        //此时尝试重新链接Socket
                        that.createWebSocket();
                    }
          } else {
                    // 浏览器不支持 WebSocket
                    console.log("您的浏览器不支持 WebSocket!");
                    this.openNotificationWithIcon('error', '浏览器', '您的浏览器不支持显示消息请更换', 1,1)
        }
     },
     //在onopen开始之后直接进行f方法调用 数据数据发送
    startHeart() {　　　　// 发送心跳
          clearInterval(this.timeoutObj)
          this.timeoutObj = setInterval(() => {
            let that = this;
            let date = new Date()        
            if (that.global.ws && that.global.ws.readyState == 1) {
               
                // that.global.ws.send(`发送心跳给后端${date}`);
            }
          }, 2 * 60 * 1000)
    },
    resetHeart(){
                this.serverTimeoutObj = null;
                clearInterval(this.serverTimeoutObj);
                this.startHeart(); //重启心跳
    },
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
