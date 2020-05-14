import React from 'react';
import { Popover, Input } from 'antd';
const { TextArea } = Input;

class RoomAnnouncement extends React.Component {
    constructor ( props ) {
        super(props);

        this.state = {
            isroomAnnouncementPopoverVisible: false
        }
    }
    
    componentDidMount () {
        this.setState({ roomTitle: this.props.announcment })
    }

    popOverJSXContent = () => {
        return (
            <div className="note-input-div">
                <div className="note-input">
                    <TextArea name="announcment" value={this.props.announcment} onChange={(e)=>this.props.handleChangeAnnouncement(e)} rows={3} />
                </div>
                <div className="input-note-buttons d-flex flex-row justify-content-between">
                    <div className="note-close-button">
                        <button onClick={()=>this.hideRoomAnnouncementPopover()} type="button" class="btn">Close</button>
                    </div>
                    <div className="note-save-button">
                        <button disabled={!this.props.announcment ? true : false} onClick={this.updateRoomAnnouncement.bind(this)} type="button" class="btn"> Change </button>
                    </div>
                </div>
            </div>
          );
    };

    updateRoomAnnouncement = async () => {
        const { id, roomId, socket, announcment } = this.props;
        let messageObj = {
            type: 'new-announcment',
            data: { //store user data at socket server as well
                id, //userId
                roomId,
                newAnnouncement: announcment
            }
        };
        socket.emit('event', messageObj);

        this.hideRoomAnnouncementPopover();
    }

    toggleRoomAnnouncementPopover = () => {
        if ( this.props.type === "teacher" ) {
            this.setState({ isroomAnnouncementPopoverVisible: !this.state.isroomAnnouncementPopoverVisible})
        }
    }
    hideRoomAnnouncementPopover = () => {
        this.setState({ isroomAnnouncementPopoverVisible: false });
    }

    render () {
        const { type, announcment } = this.props;
        return (
            <div className="class-room-header-content">
                {/* <span style={{ fontWeight: "700", color: "#757575b5"}}>{roomData.ann}</span><span id='class-header-teacher-name'> <span className="class-room-header-content-placeholder">with </span>{roomData.teacher_name ? roomData.teacher_name: (type==="teacher" ? roomData.name : 'teacher name')}</span> */}
                <span onClick={()=>{this.toggleRoomAnnouncementPopover()}} 
                    style={{ 
                        fontWeight: "700",
                        color: "#757575b5",
                        cursor: type==="teacher" ? "pointer" : "default"
                    }}>
                    {announcment}
                </span>
                <Popover 
                    placement="bottom" 
                    visible={this.state.isroomAnnouncementPopoverVisible} 
                    // title={this.chatBoxTitle()} 
                    content={this.popOverJSXContent()} 
                    trigger="click" 
                    overlayClassName="inputPopover"
                />   
            </div> 
        )
    }
}

export default RoomAnnouncement;