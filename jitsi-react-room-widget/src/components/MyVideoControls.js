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
        isMobileOrTablet,
        t
    } = props;
    return(<div id="main-video-actions-box-center" className={`${!isMobileOrTablet?"row":""}`}>
        <div className="main-video-actions-box-center-content d-flex flex-row justify-content-center"
            style={{
                width: type==="student"?"7rem":"13rem",
                paddingLeft: type==="teacher"?"0.8rem":"auto"
            }}>
            {
                (!isMobileOrTablet && (type === "teacher" || remoteUserSwappedId === id)) &&
                <Tooltip title={((currentTeacherToggledView==="board"||remoteUserSwappedId)  && type==="teacher")?t('flipMainResourceMessage'):""}>
                    
                    <div className='controls-icon-div'>
                        <div
                            style={{
                                fontSize: "28px",
                                opacity: (remoteUserSwappedId && type === "teacher") ?0.8:1,
                            }}>
                            {isScreenSharing ? 
                                <Popconfirm
                                    placement="top"
                                    title="Do you want to Stop Screen Share!"
                                    onConfirm={() => props.unload(true)}
                                    okText={t('okText')}
                                    cancelText={t('cancelText')}
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
                    </div>
                </Tooltip>
            }
            {<div className='controls-icon-div'>
                <div
                    onClick={() => { props.toggleLocalSource( id, isLocalAudioMute, 'audio' )}}
                    style={{
                        cursor: "pointer"   
                    }}
                    className="control-icon">
                        <i
                            className={`${((isGlobalAudioMute && type==="student" ) || isLocalAudioMute)? 
                                    'fas fa-microphone-slash': 'fas fa-microphone'}`}
                            style={{
                                opacity: `${(isGlobalAudioMute && type === "student")? 0.5 : 1}`,
                            }}
                        />
                </div>
            </div>}
            {<div className="controls-icon-div">
                <div
                    onClick={() => props.toggleLocalSource( id, isLocalVideoMute, 'video' )}
                    className="control-icon">
                    {
                        <i 
                            className={`${isLocalVideoMute?'fas fa-video-slash': 'fas fa-video'}`}
                            style={{ 
                                opacity: `${(isVideoMuteByTeacher && type === "student")? 0.5 : 1}`,
                                // padding: '0.45em 0.4em'
                            }} 
                        />
                    }
                </div>
            </div>}

            {type==="teacher" &&
                <div className="controls-icon-div">
                    <div
                        onClick={() => props.handleRecordVideo()}
                        style={{
                            fontSize: "28px",
                            color: isRecording?"red": "white",
                        }}
                        className="control-icon">
                            <i className="fas fa-circle" />
                    </div>
                </div>
            }
        </div>
    </div>)
};
export default MyVideoControls;