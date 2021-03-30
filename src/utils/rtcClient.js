import global from '@/utils/global.js'
let RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
let  RTCIceCandidate = (window.mozRTCIceCandidate || window.RTCIceCandidate);
let  RTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription); 
let configuration = { 
    "iceServers": [{ "url": "stun:stun.l.google.com:19302",
                     "url": "stun:stun1.l.google.com:19302",
                     "url": "stun:stun2.l.google.com:19302",
                     "url": "stun:stun3.l.google.com:19302",
                     "url": "stun:stun4.l.google.com:19302" }] 
}; 

const rtc = {
  
    /*******************基础部分*********************/
    roomId:'', 
    peerList:[], 
    account:'',
    localStream:'',

    /*************************服务器连接部分***************************/
    connect(roomId,callbacks){
        this.roomId = roomId;
        let that = this
        global.ws.onmessage = function(res) {      
            let json = JSON.parse(res.data);
            that.handelReviceMsg(json,callbacks);
        };
        global.ws.onclose = function(res) {  
            that.close();
        }
        
    },
    login(account){
        this.account = account;
        let data = {"username":account};
        let dic = {"event":"_login","data":data};
        let message = JSON.stringify(dic);
        this.sendMessage(message);
    },
    leaveRoom(){
        let dic = {"event":"_leave"};
        let message = JSON.stringify(dic);
        this.sendMessage(message);
    },
    close(){
        this.localStream.close();
        this.localStream = null;
        for (let k in this.peerList) {
            this.closePeerConnection(k)
        }
    },
    joinRoom(){
        let data = {"roomId":this.roomId, "username":this.account};
        let dic = {"event":"_join","data":data};
        let message = JSON.stringify(dic);
        this.sendMessage(message);
    },
    sendMessage(msg){
        if (global.ws && global.ws.readyState == 1 && msg) {
            global.ws.send(msg);
        }
    },

      /*************************流处理部分*******************************/
    handelReviceMsg(json,callback){
        let event = json.event;
        let data = json.data;
        let sender = json.sender;
        console.log(json);
        switch (event) {
            case '_logined':{
                this.joinRoom();
            }
                break;
            case '_peers':{
                console.log('_peers');
                var that = this;
                this.getUserMedia().then((stream)=>{
                    that.localStream = stream;
                    data.peers.forEach(username => {
                        this.getPeerConnection(username, callback);
                        this.addStream(this.peerList[username]);
                    })
                    for (let k in this.peerList) {
                        that.createOffer(k, this.peerList[k]);
                    }
                 
                    let params = {"action":"addStream","stream":stream, "id":this.account}
                    callback(params )
                })
            }
                break;

            case '_new_peer':{
                this.getPeerConnection(data.username, callback);
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
                let params = {"action":"removeStream","username":data.username}
                callback(params)
              
            }
                break;
            default:
                break;
        }
    },




         //创建本地流
    getUserMedia() {
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
               resolve(stream);
            }, function(error){
                reject(error);
                // console.log(error);
                        //处理媒体流创建失败错误
            });
        })
    },
    getPeerConnection(username, callback){
        let that = this;
        let myConnection = new RTCPeerConnection(configuration); 
            // 如果检测到媒体流连接到本地，将其绑定到一个video标签上输出
        myConnection.onaddstream = function (event){
            console.log('视频回调');
            let params = {"action":"addStream","stream":event.stream, "id":username}
            callback(params)
        }


        let touser = username;
        myConnection.onicecandidate=(e)=>{   
            if (e.candidate !== null) {
                that.sendMessage(JSON.stringify({
                    "event": "_ice_candidate",
                    "sender": that.account,
                    "receiver": touser,
                    "roomId": that.roomId,
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
                    "roomId": that.roomId,
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

    closePeerConnection(username){
        this.peerList[username].close;
        this.peerList[username] = null;
        delete this.peerList[username];
    },
}


export default rtc