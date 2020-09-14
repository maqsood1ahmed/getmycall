import React from 'react';
import { Popconfirm } from 'antd';

const AppButtons = (props) => {
    const { buttonFor, roomData, isWorkingMode, currentTeacherToggledView, 
        switchToGlobalWorkingMode, toggleGlobalSources, isGlobalAudioMute,
        t
    } = props;
    if ( buttonFor === "workingMode" ) {
        return (
            <Popconfirm
                placement="topRight"
                title={isWorkingMode? t("stopMessage")+"!" :t('startWorkScreenMessage')+"!"}
                onConfirm={() => switchToGlobalWorkingMode(!isWorkingMode, true)}
                okText={t('okText')}
                cancelText={t('cancelText')}
            >
                <button type="button"
                    className="btn btn-primary teacher-actions-button"
                    style={{
                        backgroundColor: isWorkingMode?"#6343AE":"",
                        pointerEvents: currentTeacherToggledView==="board"?"auto":"none",
                        cursor: currentTeacherToggledView==="board"?"pointer":"default",
                        opacity: currentTeacherToggledView==="board"?"1":"0.5",
                        paddingLeft: "1.3rem",
                        marginLeft: "0.2rem",
                        border: "2px solid white",
                        letterSpacing: 0
                    }}
                >
                    <div className="d-flex flex-row justify-content-center" style={{ marginTop: ".1rem"}}>
                    <div className="btn-chat-inner-text d-flex justify-content-end w-70">{t('workingMOde')}</div>
                        <div className="global-action-button-icon d-flex justify-content-start w-30">
                            {/* {<div style={{ cursor: "pointer" }} >
                                <i className="fas fa-history"></i>
                            </div>} */}
                        </div>
                    </div>
                </button>
            </Popconfirm>)
    } else if (buttonFor === "muteAll") {
        const id = (roomData && roomData.id) || "";
        return (
            <button 
                onClick={() => toggleGlobalSources( id, "mute-all-students-audio" )} 
                type="button" 
                style={{ border: "2px solid white", letterSpacing: 0 }} 
                className="btn btn-primary teacher-actions-button">
                <div className="d-flex flex-row justify-content-center" style={{ marginTop: ".1rem" }}>
                    <div className="btn-chat-inner-text d-flex justify-content-end w-70">{isGlobalAudioMute?t('unmuteAll'):t('muteAll')}</div>
                    <div className="global-action-button-icon d-flex justify-content-start w-30">
                        {<div style={{ cursor: "pointer" }}>
                            <i className={`fas ${isGlobalAudioMute ? "fa-microphone-slash" : "fa-microphone"}`}></i>
                        </div>}
                    </div>
                </div>
            </button>);
    }
    return null;
};

export default AppButtons;