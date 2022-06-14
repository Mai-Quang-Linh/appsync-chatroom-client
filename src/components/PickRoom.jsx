import React, { Component } from 'react';
import {Context} from './context';
import { AmplifySignOut } from '@aws-amplify/ui-react';
import gql from 'graphql-tag';

class PickRoom extends Component {
    static contextType = Context;
    constructor(props,context){
        super(props);
        this.state = {
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth,
            rooms:[],        //displayed message is stored here
            loading:"",     //"" is finished "loading" is loading
        }
        this.RoomName = React.createRef();
        this.RoomPanel = React.createRef();
        this.handleResize=this.handleResize.bind(this);
        this.handleAddedToRoom=this.handleAddedToRoom.bind(this);
        this.addRoom=this.addRoom.bind(this);
        this.ChangeRoom=this.ChangeRoom.bind(this);
    }
    componentDidMount(){
        //dynamically resize the chatbox
        window.addEventListener('resize', this.handleResize);    
        //fill room panel with rooms
        this.initRoomPanel();
    }
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
        this.subscription.unsubscribe();
    }
    render() { 
        return ( <div>
            {/* header */}
            <div className="form-inline justify-content-between bg-dark">
                <h2 className="text-white"> User: {this.context.user.username}</h2>
                <AmplifySignOut />
            </div>
            <div ref={this.RoomPanel} className=" bg-light rounded" style={{height:this.state.windowHeight-102,overflow:"auto"}}>
                <p className="text-center">{this.state.loading}</p>
                <div className="form-inline">
                    {this.state.rooms.map((room)=>
                    <div key={room.room} className="w-25 h-10 pb-3 pl-1 pr-1">
                        <button id={room.room} className="btn btn-primary btn-lg w-100 h-100" onClick={this.ChangeRoom}>
                            <h3 className="text-white">{room.room}</h3>
                        </button>
                    </div>)}
                </div>    
            </div>
            {/* messaging form */}
            <form onSubmit={this.addRoom}>
                      <div className="form-inline bg-secondary"> 
                        <input type="text" ref={this.RoomName}className="form-control my-2 ml-2" rows="2" style={{width:this.state.windowWidth-248}}></input>
                        <button type="submit" className="btn btn-primary my-2 mx-2" style={{width:200}}>Create Room</button>
                      </div> 
                </form>
        </div> );
    }
    handleResize(){
        //resize chat box
        this.setState({
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth,
            rooms: this.state.rooms,
            loading: this.state.loading,
        });
    }
    handleAddedToRoom(data){
        alert("You are added to "+data.data.asignUser.room);
        this.setState({
            windowHeight: this.state.windowHeight,
            windowWidth: this.state.windowWidth,
            rooms: this.state.rooms.concat([data.data.asignUserSub]),
            loading: this.state.loading,
        });
    }
    async addRoom(event){
        event.preventDefault();
        var room=event.currentTarget.getElementsByTagName("input")[0];
        if (room.value===""){
            alert("Invalid room name!");
            return;
        }
        const mutation = gql(`
            mutation MyMutation {
                createRoom(room: "${room.value}")
            }`);
        try{
            await this.context.client.mutate({ mutation: mutation });
            alert("Created a new room!");
            this.props.ChangeRoom(room.value);
        }catch(err){
            console.error(err);
            alert("This room already existed!");
        }
        room.value="";
    }
    ChangeRoom(event){
        this.props.ChangeRoom(event.currentTarget.id);
    }
    async initRoomPanel(){
        this.setState({
            windowHeight: this.state.windowHeight,
            windowWidth: this.state.windowWidth,
            rooms: this.state.rooms,
            loading: "loading...",
        });
        const query = gql(`
            query MyQuery {
                    getRooms {
                    items {
                        room
                    }
                }
            }
          `);
        try{
            var data= await this.context.client.query({ query: query });
            this.setState({
                windowHeight: this.state.windowHeight,
                windowWidth: this.state.windowWidth,
                rooms: data.data.getRooms.items,
                loading: "",
            });
            const subscript = gql(`
            subscription MySubscription {
                asignUserSub(user: "${this.context.user.username}") {
                  room
                }
              }`);
            this.subscription=this.context.client.subscribe({ query:subscript}).subscribe({
                next: this.handleAddedToRoom,
                error: error => {
                    console.error(error);
                }
            });
        }catch(err){
            console.log("err");
            console.error(err);
        }
    }
}
 
export default PickRoom;