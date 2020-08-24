import React from 'react';
import { Tooltip, Popconfirm } from 'antd';

const MyVideoControls = (props) => {
    const {
        id,
        type,
        remoteUserSwappedId,
        currentTeacherToggledView,
        isLocalVideoMute,
        isLocalAudioMute,
        isGlobalAudioMute,
        isScreenSharing,
        isVideoMuteByTeacher,
        isRecording,
        isMobileOrTablet
    } = props;
    return(<div id="main-video-actions-box-center" className={`${!isMobileOrTablet?"row":""}`}>
        <div className="main-video-actions-box-center-content d-flex flex-row justify-content-center"
            style={{
                width: type==="student"?"7rem":"13rem"
            }}>
            {
                (!isMobileOrTablet && (type === "teacher" || remoteUserSwappedId === id)) &&
                <Tooltip title={((currentTeacherToggledView==="board"||remoteUserSwappedId)  && type==="teacher")?"First move teacher to center.":""}>
                    <div
                        style={{
                            fontSize: "1.8rem",
                            cursor: "pointer",
                            opacity: (remoteUserSwappedId && type === "teacher") ?0.8:1,
                            marginRight: ".4rem"
                        }}>
                        {isScreenSharing ? 
                            <Popconfirm
                                placement="top"
                                title="Do you want to Stop Screen Share!"
                                onConfirm={() => props.unload(true)}
                                okText="Ok"
                                cancelText="Cancel"
                            >
                                <div className="screen-share-icon">
                                    <i className="fas fa-desktop" />
                                </div>
                                <div className="screen-share-stop-icon">
                                    <i className="fa fa-times" aria-hidden="true" />
                                </div>
                            </Popconfirm>:
                            <div
                                onClick={() => props.handleScreenShareButton(isScreenSharing)}
                                className="screen-share-icon">
                                <i className="fas fa-desktop" />
                            </div>
                        }
                        
                    </div>
                </Tooltip>
            }
            {<div
                onClick={() => { props.toggleLocalSource( id, isLocalAudioMute, 'audio' )}}
                style={{
                    cursor: "pointer",
                    marginLeft: type==="student"?"0":"8px"
                }}>
                <img
                    className="mic-image-icon"
                    src={((isGlobalAudioMute && type==="student" ) || isLocalAudioMute) ?
                        "http://api.getmycall.com/static/media/mic-off.png" :
                        "http://api.getmycall.com/static/media/mic-on.png"
                    }
                    style={{
                        width: "30px",
                        height:"30px",
                        opacity: `${(isGlobalAudioMute && type === "student")? 0.5 : 1}`
                    }}
                    alt="mic" 
                />
            </div>}
            {<div
                onClick={() => props.toggleLocalSource( id, isLocalVideoMute, 'video' )}
                style={{
                    cursor: "pointer",
                    marginLeft: "8px"
                }}
                className="toggle-video-icon-div">
                <img
                    className="video-image-icon"
                    src={isLocalVideoMute ?
                        "https://api.getmycall.com/static/media/video-slash-solid.png" :
                        "https://api.getmycall.com/static/media/video-solid.png"
                    }
                    style={{
                        width: "30px",
                        height:"30px",
                        opacity: `${(isVideoMuteByTeacher && type === "student")? 0.5 : 1}`
                    }}
                    alt="video"
                />
            </div>}

                    {
                    type==="teacher" &&
                        <div
                            onClick={() => props.handleRecordVideo()}
                            style={{
                                fontSize: "1.8rem",
                                cursor: "pointer",
                                color: isRecording?"red": "white",
                                marginLeft: ".5rem"
                            }}>
                                <i className="fas fa-circle" />
                            </div>
                    }
        </div>
    </div>)
};
export default MyVideoControls;