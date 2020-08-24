import React, { useState, useEffect } from 'react';

import StudentWorkingMode from '../StudentWorkinMode';
import StudentRoomControls from './StudentRoomControls';

const AppMobileView = (props) => {
    const {
        isFlipEnabled,
        roomData,
        allParticipants,
        isScreenSharing,
        isWorkingMode,
        currentTeacherToggledView
    } = props;

    const [showSmallTeacherVideo, showOrHideSmallTeacherVideoBox] = useState(true);
    const [showSmallStudentVideo, showOrHideSmallStudentVideoBox] = useState(true);
    const [showSmallStudentBoard, showOrHideSmallStudentBoardBox] = useState(true);
    const [showSmallStudentScreen, showOrHideSmallStudentScreenBox] = useState(true);

    const [currentScreen, changeCurrentScreen] = useState(currentTeacherToggledView);

    let isTeacherMuteStudentVideo = false;
    let localSource = props.roomData.sources.filter(source=>source.id===roomData.id);
    localSource = localSource && localSource[0];
    
    const sourceUserId = localSource && localSource.id;

    useEffect(() => {
        changeCurrentScreen(currentTeacherToggledView)
    }, [currentTeacherToggledView]);
    console.log('current teacher view===>', currentScreen, currentTeacherToggledView)
    if (isWorkingMode) {
        return(<div id="mobile-mode-container">
            <StudentWorkingMode 
                teacherViews={(value)=>props.teacherViews(value)} 
                isMobileOrTablet={true}>
                <StudentRoomControls
                    {...props}
                    localSource={localSource}
                    isMobileOrTablet={true}
                />
            </StudentWorkingMode>
        </div>);
    } else {
        return(<div id="mobile-mode-container">
            {/* 1=>main teacher view */}
            <div
                style ={{
                    position: currentScreen==="video"?"static":"absolute",
                    width: currentScreen==="video"? "100vw":"25vw",
                    height: currentScreen==="video"?"100vh":"35vh",
                    top: currentScreen==="board"?"4%":(currentScreen==="screen"?"45vh":"0"),
                    left: (currentScreen==="board"||currentScreen==="screen")?"4%":"0",
                    zIndex: currentScreen==="video"?"0":"1"
                }}
            >
                <video
                    style={{
                        opacity: showSmallTeacherVideo?1:0,
                        height: "100%",
                        border: currentScreen!=="video"?"3px solid white":"",
                        borderRadius: currentScreen!=="video"?"10px":"",
                        position: currentScreen!=="video"?"relative":""
                    }}
                    id="teacher-video-tag" autoPlay />
                <audio autoPlay width="0%" height="0%" id="teacher-audio-tag"></audio>
                {currentScreen!=="video" &&
                    <div className="hide-small-box-icon"
                        style={{left: "-1rem"}}
                        onClick={()=>showOrHideSmallTeacherVideoBox(!showSmallTeacherVideo)}>
                        {showSmallTeacherVideo?
                            <i className="fa fa-eye" aria-hidden="true" />:
                            <i className="fa fa-eye-slash" aria-hidden="true"></i>
                        }
                    </div>
                }
            </div>

            {/* 2=>board container */}
            <div
                style={{
                    position: currentScreen==="board"?"":"absolute",
                    width: currentScreen==="board"? "100vw":"25vw",
                    height: currentScreen==="board"?"100vh":"35vh",
                    top: currentScreen!=="board"?"4%":"0",
                    left: currentScreen!=="board"?"4%":"0",
                    zIndex: currentScreen==="board"?"0":"1"
                }}>
                <div
                    style={{
                        opacity: showSmallStudentBoard?1:0,
                        height: "100%",
                        border: currentScreen!=="board"?"3px solid white":"",
                        borderRadius: currentScreen!=="board"?"10px":"",
                        position: currentScreen!=="board"?"relative":""
                    }}>
                    { props.iframe() }
                </div>
                {currentScreen!=="board" &&
                    <div className="hide-small-box-icon"
                        style={{left: "-1rem"}}
                        onClick={()=>showOrHideSmallStudentBoardBox(!showSmallStudentBoard)}>
                        {showSmallStudentBoard?
                            <i className="fa fa-eye" aria-hidden="true" />:
                            <i className="fa fa-eye-slash" aria-hidden="true"></i>
                        }
                    </div>
                }
                {showSmallStudentBoard&&
                    <div
                        style={{
                            position: "absolute",
                            top: "75%",
                            right: "10%",
                            zIndex: "1"
                            // right: currentScreen==="board"?"90%":"10%"
                        }}
                        className="d-flex flex-row justify-content-end">
                        <button
                            onClick={()=>changeCurrentScreen(currentScreen==="board"?"video":"board")}
                            type="button"
                            className="btn btn-primary"
                            style={{
                                backgroundColor: currentScreen==="board"?"#6343AE":"",
                                width:"2.3rem", height:"2.3rem"
                            }}>
                            <i className={`fa ${currentScreen==="board"?"fa-arrow-up":"fa-arrow-down"}`} aria-hidden="true" />
                        </button>
                    </div>
                }
            </div>
            
            {/* 3=>screen share container */}
            {isScreenSharing &&
                <div
                    style={{
                        position: currentScreen==="screen"?"":"absolute",
                        width: currentScreen==="screen"? "100vw":"25vw",
                        height: currentScreen==="screen"?"100vh":"35vh",
                        top: currentScreen!=="screen"?"45vh":"0",
                        left: currentScreen!=="screen"?"4%":"0",
                        zIndex: currentScreen==="board"?"0":"1"
                    }}>
                    <div
                        style={{
                            opacity: showSmallStudentScreen?1:0,
                            height: "100%",
                            border: currentScreen!=="screen"?"3px solid white":"",
                            borderRadius: currentScreen!=="screen"?"10px":"",
                            position: currentScreen!=="screen"?"relative":""
                        }}>
                        <video id="teacher-screen-share-video"
                            autoPlay
                            poster="https://miro.medium.com/max/3200/0*-fWZEh0j_bNfhn2Q" 
                        />
                    </div>
                    {currentScreen!=="screen" &&
                        <div className="hide-small-box-icon"
                            style={{left: "-1rem"}}
                            onClick={()=>showOrHideSmallStudentScreenBox(!showSmallStudentScreen)}>
                            {showSmallStudentScreen?
                                <i className="fa fa-eye" aria-hidden="true" />:
                                <i className="fa fa-eye-slash" aria-hidden="true"></i>
                            }
                        </div>
                    }
                    {showSmallStudentScreen &&
                        <div
                            style={{
                                position: "absolute",
                                top: "75%",
                                right: "10%",
                                zIndex: "1"
                                // right: currentScreen==="board"?"90%":"10%"
                            }}
                            className="d-flex flex-row justify-content-end">
                            <button
                                onClick={()=>changeCurrentScreen(currentScreen==="screen"?"video":"screen")}
                                type="button"
                                className="btn btn-primary"
                                style={{
                                    // backgroundColor: currentScreen==="screen"?"#6343AE":"",
                                    width:"2.3rem", height:"2.3rem"
                                }}>
                                <i className={`fa ${currentScreen==="screen"?"fa-arrow-up":"fa-arrow-down"}`} aria-hidden="true" />
                            </button>
                        </div>
                    }
                </div>
            }

            {/* 4=>small student video container */}
            <div 
                className="mobile-small-video-box"
                id={`video-box-${localSource.position}`}
            >
                {
                    allParticipants[sourceUserId] &&
                    allParticipants[sourceUserId].tracks &&
                    allParticipants[sourceUserId].tracks.forEach(track=>{
                        if (track.getType() === 'video') {
                            isTeacherMuteStudentVideo = track.isMuted()
                        }
                    })
                }
                <video 
                    className="student-video-tag" 
                    style={{
                        background: ( isFlipEnabled || isTeacherMuteStudentVideo || sourceUserId === roomData.teacher_id )?"#4b3684":"white",
                        cursor: isFlipEnabled ? 'pointer' : 'none',
                        pointerEvents: isFlipEnabled? 'auto': 'none',
                        opacity: showSmallStudentVideo?1:0
                    }}
                    id={`video-tag-${localSource.position}`}
                    autoPlay
                    poster=""
                    />
                <audio autoPlay id={`audio-tag-${localSource.position}`} />
                <div className="hide-small-box-icon"
                    style={{right: "-1rem"}}
                    onClick={()=>showOrHideSmallStudentVideoBox(!showSmallStudentVideo)}
                >
                    {showSmallStudentVideo?
                        <i className="fa fa-eye" aria-hidden="true" />:
                        <i className="fa fa-eye-slash" aria-hidden="true"></i>
                    }
                </div>
            </div>
            
            {/* 5=>student room controls */}
            <StudentRoomControls
                {...props}
                localSource={localSource}
                isMobileOrTablet={true}
            />
        </div>);
    }
}
export default AppMobileView;