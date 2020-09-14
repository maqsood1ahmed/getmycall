import React, { useState } from 'react';
import { Popover, Input } from 'antd';
const { TextArea } = Input;

const RoomAnnouncement = (props) => {
    const { type, announcment } = props;
    const [isroomAnnouncementPopoverVisible, setRoomAnnouncementPopoverVisiblility] = useState(false);

    // useEffect(() => {
    //     // this.setState({ roomTitle: announcment })
    // }, [announcment]);

    const toggleRoomAnnouncementPopover = (visible) => {
        if ( props.type === "teacher" ) {
            setRoomAnnouncementPopoverVisiblility(visible)
        }
    }

    const updateRoomAnnouncement = () => {
        const { id, roomId, socket, announcment } = props;
        let messageObj = {
            type: 'new-announcment',
            data: { //store user data at socket server as well
                id, //userId
                roomId,
                newAnnouncement: announcment
            }
        };
        socket.emit('event', messageObj);

        setRoomAnnouncementPopoverVisiblility(false);
    }

    const popOverJSXContent = () => {
        const { t } = props;
        return (
            <div className="note-input-div">
                <div className="note-input">
                    <TextArea name="announcment" value={announcment} onChange={(e)=>props.handleChangeAnnouncement(e.target.value)} rows={3} />
                </div>
                <div className="input-note-buttons d-flex flex-row justify-content-between">
                    <div className="note-close-button">
                        <button onClick={()=>toggleRoomAnnouncementPopover(false)} type="button" className="btn">{t('close')}</button>
                    </div>
                    <div className="note-save-button">
                        <button disabled={!announcment ? true : false} onClick={()=>updateRoomAnnouncement()} type="button" className="btn">{t('change')}</button>
                    </div>
                </div>
            </div>
          );
    };

    return (
        <div className="class-room-header-content">
            <span onClick={()=>{toggleRoomAnnouncementPopover(!isroomAnnouncementPopoverVisible)}} 
                style={{ 
                    fontWeight: "700",
                    color: "#757575b5",
                    cursor: type==="teacher" ? "pointer" : "default"
                }}>
                {announcment}
            </span>
            <Popover 
                placement="bottom" 
                visible={isroomAnnouncementPopoverVisible} 
                // title={this.chatBoxTitle()} 
                content={popOverJSXContent()} 
                trigger="click" 
                overlayClassName="inputPopover"
            />   
        </div> 
    )
}

export default RoomAnnouncement;