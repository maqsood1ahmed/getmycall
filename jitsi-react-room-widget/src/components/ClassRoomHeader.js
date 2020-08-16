import React from 'react';
import RoomAnnouncement from './RoomAnnouncement';

const ClassRoomHeader = (props) => {
    const { socket, roomData, isChatBoxVisible, noOfNewMessages } = props;
    return(<div className="w-100" id="classroom-header">
        <div className="classroom-header-inner d-flex flex-row justify-content-between">
            <div className="d-flex flex-column justify-content-center">
                <div className="time-box-container d-flex flex-row justify-content-between">
                    <div className="back-button-container">
                        <button onClick={()=>props.unload()} type="button" width= "11rem" height="2rem" className="btn btn-primary main-button">
                            <div className="d-flex flex-row justify-content-center">
                                <div className="d-flex justify-content-start w-30">
                                    <i className="fa fa-arrow-left btn-back-icon" aria-hidden="true" />
                                </div>
                                <div className="btn-chat-inner-text d-flex justify-content-end w-70">Go Back</div>
                            </div>
                        </button>
                    </div>
                    <div className="time-box-info">
                        <span className="time-start">08:30</span>  -  <span className="time-end">09:15</span>
                    </div>
                </div>
            </div>
            <div className="class-room-header-info d-flex flex-column justify-content-center">
                <RoomAnnouncement
                    id={roomData}
                    roomId={roomData.roomId}
                    announcment={roomData.announcment}
                    type={roomData.type}
                    socket={socket}
                    handleChangeAnnouncement={(e) => props.handleChangeAnnouncement(e)}
                />
            </div>
            <div className="main-button d-flex flex-column justify-content-center">
            <div className="chat-button-container d-flex flex-column justify-content-center">
                <button onClick={()=>props.toggleChatBox()} type="button" className="btn btn-primary main-button"
                    style={{
                        width: '9rem',
                        height: "2rem",
                        background: `${isChatBoxVisible? "rgb(121, 119, 128)" : "#9772E8"}`
                    }}>
                    <div className="d-flex flex-row justify-content-center">
                        <div className="btn-chat-inner-text d-flex justify-content-end w-70">Class Chat</div>
                        <div className="chat-button-icon d-flex justify-content-start w-30">
                            <i className="fas fa-comment btn-chat-icon" />
                        </div>
                    </div>
                </button>
                {
                    (noOfNewMessages !== 0) &&
                        <div className="chat-messages-count">
                            <span className="chat-messages-count-text">{noOfNewMessages}</span>
                        </div>
                }
            </div>
        </div>
        </div>
    </div>);
};

export default ClassRoomHeader;