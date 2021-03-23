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


let RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
let  RTCIceCandidate = (window.mozRTCIceCandidate || window.RTCIceCandidate);
let  RTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription); 

export default {
    name: 'room',
    data() {
            return {
                roomid: '',
                account: '',
                isLogin: false,
                peerList: {},
                candidate: null,
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
        this.global.ws.onmessage = function(res) {      
            let json = JSON.parse(res.data);
            that.handelReviceMsg(json);
        };
        this.global.ws.onclose = function(res) {  
            that.close();
        }
    },
    mounted(){
        this.login();
    },
    beforeDestroy() {
        this.leaveRoom();
        this.close();
    },
    destroyed(){
        
    },
   
    watch:{

    },
    methods:{
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
        getUserMedia() {
            let that = this
            //兼容浏览器的getUserMedia写法
            let getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia);
                //获取本地的媒体流，并绑定到一个video标签上输出，并且发送这个媒体流给其他客户端
            return new Promise((resolve, reject) => {
                getUserMedia.call(navigator, {
                    "audio": true,
                    "video": true
                }, (stream) => {
                    //绑定本地媒体流到video标签用于输出
                   
                    that.localStream = stream;
                    that.videos.push(this.account);
                    that.videoStreams[this.account] = stream;
                    this.$nextTick(function(){
                       console.log("页面变化完成");
                        let myVideo = document.querySelector('#video-'+that.account);
                        myVideo.srcObject = stream;
                    })
                   
                    resolve();
                 }, function(error){
                    reject(error);
                    // console.log(error);
                    //处理媒体流创建失败错误
                });
            })
        },
        getPeerConnection(username){
            let that = this;
            let configuration = { 
                "iceServers": [{ "url": "stun:stun.l.google.com:19302",
                                 "url": "stun:stun1.l.google.com:19302",
                                 "url": "stun:stun2.l.google.com:19302",
                                 "url": "stun:stun3.l.google.com:19302",
                                 "url": "stun:stun4.l.google.com:19302" }] 
            }; 
            let myConnection = new RTCPeerConnection(configuration); 
              // 如果检测到媒体流连接到本地，将其绑定到一个video标签上输出
             myConnection.onaddstream = function (event){
                console.log('视频回调');
                that.videos.push(username);
                that.videoStreams[username] = event.stream;
                console.log(that.videos)
                that.$nextTick(function(){
                    let video = document.querySelector('#video-' + username);
                    video.srcObject = event.stream;
                })
            }
            let touser = username;
            myConnection.onicecandidate=(e)=>{   
                if (e.candidate !== null) {
                    that.sendMessage(JSON.stringify({
                        "event": "_ice_candidate",
                        "sender": that.account,
                        "receiver": touser,
                        "roomId": that.roomid,
                        "data": {
                            "candidate": e.candidate
                        }
                    }));
                }
            };
            myConnection.ondatachannel = (event) => {
               
            }
            myConnection.oniceconnectionstatechange = (evt) => {
              
            };
        
            this.peerList[username] = myConnection;
        },
        videosSrcObject(){
            this.videos.forEach(username => {
                let stream = this.videoStreams[username];
                let video = document.querySelector('#video-' + username);
                video.srcObject = stream;
            })
        },
        addStream(myConnection){
            myConnection.addStream(this.localStream)
        },
        
        createOffer(username, myConnection) {
            let that = this;
            let touser = username;
            myConnection.createOffer().then((desc) =>{
                console.log("sendoffer");
                // 将创建好的offer设置为本地offer
                myConnection.setLocalDescription(desc).then((e)=>{
                    that.sendMessage(JSON.stringify({
                        "event": "_offer",
                        "sender": that.account,
                        "receiver": touser,
                        "roomId": that.roomid,
                        "data": {
                                "sdp": desc,
                            }
                        })
                    )
                });
            })
        },
        createAnswer(username, myConnection){
            let that = this;
            let touser = username;
            myConnection.createAnswer().then((desc) =>{
                // 将创建好的answer设置为本地Answer
                // myConnection.setLocalDescription
                myConnection.setLocalDescription(desc).then((e)=>{
                    // 通过socket发送answer
                    that.sendMessage(JSON.stringify({ // 发送answer
                        "event": "_answer",
                        "sender": that.account,
                        "receiver": touser,
                        "roomId": that.roomid,
                        "data": {
                            "sdp": desc,
                        }
                    })
                );
            });
            }, function(error){
                // 创建answer失败
                console.log("创建answer失败");
            })
        },
        setRemoteSDP(sdp,myConnection){
            myConnection.setRemoteDescription(new RTCSessionDescription(sdp)).then((e)=>{
            });
        },
        setIceCandidate(candidate, myConnection){
            myConnection.addIceCandidate(new RTCIceCandidate(candidate));
          
        },
        login(){
            if(!this.account){
                return;
            }
            let data = {"username":this.account};
            let dic = {"event":"_login","data":data};
            let message = JSON.stringify(dic);
            this.sendMessage(message);
        },
        joinRoom(){
             if(!(this.account && this.account)){
                return;
            }
            let data = {"roomId":this.roomid, "username":this.account};
            let dic = {"event":"_join","data":data};
            let message = JSON.stringify(dic);
            this.sendMessage(message);
        },
        leaveRoom(){
            let dic = {"event":"_leave"};
            let message = JSON.stringify(dic);
            this.sendMessage(message);
        },
        sendMessage(msg){
            if (this.global.ws && this.global.ws.readyState == 1 && msg) {
              
                this.global.ws.send(msg);
            }
        },
        closePeerConnection(username){
            this.peerList[username].close;
            this.peerList[username] = null;
            delete this.peerList[username];
        },
        handelReviceMsg(json){
            let event = json.event;
            let data = json.data;
            let sender = json.sender;
            switch (event) {
                case '_logined':{
                    this.isLogin = data.state;
                    let that = this
                    that.joinRoom();
                }
                    break;
                case '_peers':{
                    console.log('_peers');
                    this.getUserMedia().then((e)=>{
                        data.peers.forEach(username => {
                            this.getPeerConnection(username);
                            this.addStream(this.peerList[username]);
                        })
                        for (let k in this.peerList) {
                            this.createOffer(k, this.peerList[k]);
                        }
                    })
                }
                    break;
                case '_new_peer':{
                    this.getPeerConnection(data.username);
                    this.addStream(this.peerList[data.username]);
                    console.log('_new_peer');
                }
                    break;
                case '_offer':{
                    this.peerList[sender].setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
                            this.createAnswer(sender,this.peerList[sender])
                            console.log('sendAnswer')
                    })
                }
                    break;
                case '_answer':{
                    this.setRemoteSDP(data.sdp, this.peerList[sender]);
                }
                    break;
                case '_ice_candidate':{
                    this.setIceCandidate(data.candidate,  this.peerList[sender]);
                }
                    break;
                case '_leave_peer': {
                    console.log('_leave_peer')
                    this.closePeerConnection(data.username);
                    for (let index = 0; index < this.videos.length; index++) {
                        let username = this.videos[index];
                        if(data.username === username){
                            this.videos.splice(index,1)
                            delete this.videoStreams[username]
                        }
                    }
                   this.$nextTick(function(){
                        this.videosSrcObject();
                   })
                }
                break;
                default:
                    break;
            }
        }
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