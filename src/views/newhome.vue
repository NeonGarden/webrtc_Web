<template>
    <div>
        <div class="block">
            <el-row :gutter="10" type="flex" class="row-bg" style="flex-wrap: wrap" justify="start">      
                <el-col :span="8" justify="start" v-for="(item, index) in videos" :key="index">
                    <div class="grid-a-contentWidth">
                        <video :id="videoId(item,index)"  autoplay controls style="object-fit: fill;"></video>
                        <div>{{item}}</div>
                    </div>
                </el-col>
            </el-row>
        </div>
    </div>
</template>

<script>
export default {
    name: 'room',
    data() {
            return {
                roomid: '',
                account: '',
                isLogin: false,
                peerList: {},
                localStream: null,
                videos:[],
                videoStreams:{}
            }
    },
    created() {
        this.roomid = this.$route.query.roomid;
        this.account = this.$route.query.account;
        let that = this
        console.log(this.account )
        this.rtc.connect(this.roomid, (param) => { 
 	       switch (param.action) {
                case 'addStream':
                    that.addStream(param.stream, param.id)
                    break;
                case 'removeStream' : 
                    that.removeStream(param.username)
                    break
                default:
                    break;
            }
        })
     
    },
    mounted(){
           this.$on("pc_add_stream", (stream) => { 
 	        console.log('被调用')
                   //绑定本地媒体流到video标签用于输出       
            that.videos.push(account);
            that.videoStreams[account] = stream;
            this.$nextTick(function(){
                console.log("页面变化完成");
                let myVideo = document.querySelector('#video-'+that.account);
                myVideo.srcObject = stream;
            })
        })
        this.rtc.login(this.account);
    },
    beforeDestroy() {
        this.rtc.leaveRoom();
        this.rtc.close();
    },
    methods:{
        addStream(stream, username) {
            console.log('被调用')
                   //绑定本地媒体流到video标签用于输出       
            this.videos.push(username);
            this.videoStreams[username] = stream;
            this.$nextTick(function(){
                console.log("页面变化完成");
                let myVideo = document.querySelector('#video-'+username);
                myVideo.srcObject = stream;
            })
        },

        removeStream(r_username) {
              for (let index = 0; index < this.videos.length; index++) {
                    let username = this.videos[index];
                    if(r_username === username){
                        this.videos.splice(index,1)
                        delete this.videoStreams[username]
                    }
                }
                
                this.$nextTick(function(){
                    this.videosSrcObject();
                })
        },
        videoId(item,index){
            return "video-" +item;
        },
        close(){
            this.localStream.close();
                this.localStream = null;
                for (let k in this.peerList) {
                    this.closePeerConnection(k)
            }
        },
        videosSrcObject(){
            this.videos.forEach(username => {
                let stream = this.videoStreams[username];
                let video = document.querySelector('#video-' + username);
                video.srcObject = stream;
            })
        },
    }

}
</script>
<style scoped>
    .block{
        padding: 30px 24px;
        background-color: rgb(27, 16, 16);
    }
    .grid-a-contentWidth{
        background-color: rgb(44, 143, 121);
        border-radius: 4px;
        width: 100%;
     
        margin-top: 10px;
    }
    video{
        width: 100%;
        height: 100%;
    }
</style>