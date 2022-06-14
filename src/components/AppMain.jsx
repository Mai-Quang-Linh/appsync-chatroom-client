import React, { Component } from 'react';
import {Context} from './context';
import gql from 'graphql-tag';
import './custom.css';
import dateAndTime from 'date-and-time';


class AppMain extends Component {
    static contextType = Context;
    subscription;
    constructor(props,context){
        super(props);
        this.state = {
            disToBottom: 0,
            pageToken: "",
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth,
            msgs:[],        //displayed message is stored here
            loading:"loading...",     //"" is finished "loading" is loading
            msgCount:-1,    //number of msg for paging calculation | -1 is undefied
        }
        this.chatBox = React.createRef();
        this.handleResize=this.handleResize.bind(this);
        this.postMsg=this.postMsg.bind(this);
        this.handleScrollup=this.handleScrollup.bind(this);
        this.handleNewMsg=this.handleNewMsg.bind(this);
        this.handleLeaveRoom=this.handleLeaveRoom.bind(this);
        this.addUser=this.addUser.bind(this);
    }
    componentDidMount(){
        //dynamically resize the chatbox
        window.addEventListener('resize', this.handleResize);    
        //fill chat box with message
        this.initChatBox();
    }
    componentDidUpdate(){
        this.chatBox.current.scrollTop=this.chatBox.current.scrollHeight-this.chatBox.current.offsetHeight-this.state.disToBottom;
    }
    render() {
        return (
            <div>
                {/* header */}
                <div className="form-inline justify-content-between bg-dark">
                    <h2 className="text-white"> User: {this.context.user.username}</h2>
                    <h2 className="text-white"> Room: {this.context.room}</h2>
                    <button className="btn btn-warning btn-lg" onClick={this.handleLeaveRoom}>Leave Room</button>
                    <form onSubmit={this.addUser} className="w-100 justify-content-left">
                        <input type="text" className="form-control my-2 ml-2" rows="2" style={{width:(this.state.windowWidth/2.5)-248}}></input>
                        <button type="submit" className="btn btn-primary my-2 mx-2" style={{width:200}}>Add friend</button>
                    </form>
                </div>

                {/* chat box */}
                <div ref={this.chatBox} className="w-95 bg-light rounded" style={{height:this.state.windowHeight-156,overflow:"auto"}}>
                    <p className="text-center">{this.state.loading}</p>

                    {/* check whether if the user is the author */}
                    {this.state.msgs.map((msg)=>msg.from.localeCompare(this.context.user.username)!==0?
                    <div key={msg.msgId} className="card w-75 mb-3 ml-1">{/* the user is not the sender */}
                        <div className="card-body">
                            <div className="form-inline justify-content-between">
                                <h6 className="card-title">{msg.from}</h6>
                                <h6 className="card-subtitle text-muted">{dateAndTime.format(new Date(msg.upDate),'YYYY/MM/DD HH:mm:ss')}</h6>
                            </div>
                            <p className="card-text">{msg.msg}</p>
                        </div>
                    </div>:
                    <div key={msg.msgId} className="d-flex justify-content-end">{/* the user is the sender */}
                        <div className="card w-75 text-right mb-3 mr-1 text-white bg-primary">
                            <div className="card-body">
                                <div className="form-inline justify-content-between">
                                    <h6 className="card-subtitle">{dateAndTime.format(new Date(msg.upDate),'YYYY/MM/DD HH:mm:ss')}</h6>
                                    <h6 className="card-title">{msg.from}</h6>
                                </div>
                                <p className="card-text">{msg.msg}</p>
                            </div>
                        </div>
                    </div>
                    )}
                </div>

                {/* messaging form */}
                <form onSubmit={this.postMsg}>
                      <div className="form-inline bg-secondary"> 
                        <input type="text" className="form-control my-2 ml-2" rows="2" style={{width:this.state.windowWidth-248}}></input>
                        <button type="submit" className="btn btn-primary my-2 mx-2" style={{width:200}}>Submit</button>
                      </div> 
                </form>
            </div>
        );
    }
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
        this.chatBox.current.removeEventListener('scroll',this.handleScrollup);
        this.subscription.unsubscribe();
    }
    handleLeaveRoom(){
        this.props.LeaveRoom("");
    }
    handleResize(){
        //resize chat box
        this.setState({
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth,
            msgs: this.state.msgs,
            loading: this.state.loading,
            msgCount:this.state.msgCount,
            disToBottom: this.state.disToBottom,
            pageToken: this.state.pageToken,
        });
    }
    //get new page on scroll up to top
    handleScrollup(event){
        this.state.disToBottom=event.target.scrollHeight-event.target.scrollTop-event.target.offsetHeight;
        if(event.target.scrollTop===0&&this.state.loading.localeCompare("")===0&&this.state.pageToken!==null){
            this.getMsg();
        }
    }

    //get new message on server notification
    handleNewMsg(data){
        this.setState({
            windowHeight: this.state.windowHeight,
            windowWidth: this.state.windowWidth,
            msgs: this.state.msgs.concat([data.data.postMsgSub]),
            loading: this.state.loading,
            msgCount:this.state.msgCount+1,
            disToBottom: this.state.disToBottom,
            pageToken: this.state.pageToken,
        });
    }
    async initChatBox(){
        while(this.chatBox.current.offsetHeight>=this.chatBox.current.scrollHeight&&this.state.pageToken!==null) {
            await this.getMsg();
        }
        this.chatBox.current.scrollTop=this.chatBox.current.scrollHeight-this.chatBox.current.offsetHeight;
        this.chatBox.current.addEventListener('scroll',this.handleScrollup);
        const subscript = gql(`
        subscription MySubscription {
            postMsgSub(room: "${this.context.room}") {
                upDate
                room
                msgId
                from
                msg
            }
        }`);
        this.subscription=this.context.client.subscribe({ query:subscript}).subscribe({
            next: this.handleNewMsg,
            error: error => {
                console.error(error);
            }
        });
    }
    async addUser(event){
        event.preventDefault();
        var user=event.currentTarget.getElementsByTagName("input")[0];
        if (user.value===""){
            alert("Invalid username!!");
            return;
        }
        const mutation = gql(`
            mutation MyMutation {
                asignUser(room: "${this.context.room}", user: "${user.value}") {
                    room
                    user
                }
            }`);
        try{
            await this.context.client.mutate({ mutation: mutation });
            alert("Successfully added "+user.value+"!!");
        }catch(err){
            if (err.message.localeCompare("GraphQL error: Existed")===0){
                alert("This person is already in the room")
            }
            console.log(err.message);
        }
        user.value="";
    }
    async postMsg(event){
        event.preventDefault();
        var msg = event.currentTarget.getElementsByTagName("input")[0];
        if (msg.value.localeCompare("")===0||this.state.loading.localeCompare("loading...")===0){
            return;
        }
        const mutation = gql(`
            mutation MyMutation {
                postMsg(msg: "${msg.value}", msgId: ${this.state.msgCount+1}, room: "${this.context.room}") {
                    msgId
                    room
                    from
                    msg
                    upDate
                }
            }`);
        try{
            await this.context.client.mutate({ mutation: mutation });
            msg.value="";
            this.state.disToBottom=0;
        }catch(err){
            console.log(err);
        }
    }
    async getMsg(){
        if (this.state.msgCount===-1){
            const query = gql(`
                query MyQuery {
                    getMsg(msgId: 1, room: "${this.context.room}") {
                        count
                    }
                }`);
            try{
                var countData= await this.context.client.query({ query: query });
                this.state.msgCount=countData.data.getMsg.count;
            }catch(err){
                console.log(err);
            }
        }
        this.setState({
            windowHeight: this.state.windowHeight,
            windowWidth: this.state.windowWidth,
            msgs: this.state.msgs,
            loading: "loading...",
            msgCount:this.state.msgCount,
            disToBottom: this.state.disToBottom,
            pageToken: this.state.pageToken,
        });
        const query = gql(`
            query MyQuery {
                getPage(room: "${this.context.room}", token: "${this.state.pageToken}") {
                    items {
                        from
                        msg
                        msgId
                        room
                        upDate
                    }
                    nextToken
                }
            }`);
        try{
            var data= await this.context.client.query({ query: query });
            this.setState({
                windowHeight: this.state.windowHeight,
                windowWidth: this.state.windowWidth,
                msgs: data.data.getPage.items.slice(0).reverse().concat(this.state.msgs),
                loading: "",
                msgCount:this.state.msgCount,
                disToBottom: this.state.disToBottom,
                pageToken: data.data.getPage.nextToken,
            });
        }catch(err){
            console.log("err");
            console.error(err);
        }
    }
}

export default AppMain;