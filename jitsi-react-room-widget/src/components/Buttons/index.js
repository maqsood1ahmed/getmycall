import React from 'react';
import { Popconfirm } from 'antd';

const AppButtons = (props) => {
    const { buttonFor } = props;
    if ( buttonFor === "workingMode" ) {
        const { isWorkingMode, currentTeacherToggledView, switchToGlobalWorkingMode } = props;
        return (
            <Popconfirm
                placement="topRight"
                title={isWorkingMode? "Do you want to Stop!" :"Students will see now only the work screen!"}
                onConfirm={() => switchToGlobalWorkingMode(!isWorkingMode, true)}
                okText="Ok"
                cancelText="Cancel"
            >
                <button type="button"
                    className="btn btn-primary teacher-actions-button"
                    style={{
                        backgroundColor: isWorkingMode?"#6343AE":"",
                        pointerEvents: currentTeacherToggledView==="board"?"auto":"none",
                        cursor: currentTeacherToggledView==="board"?"pointer":"default",
                        opacity: currentTeacherToggledView==="board"?"1":"0.5",
                        width: "11rem", height: "2rem"
                    }}
                >
                    <div className="d-flex flex-row justify-content-center" style={{ marginTop: ".1rem"}}>
                        <div className="btn-chat-inner-text d-flex justify-content-end w-70">Working Mode</div>
                        <div className="global-action-button-icon d-flex justify-content-start w-30">
                            {/* {<div style={{ cursor: "pointer" }} >
                                <i className="fas fa-history"></i>
                            </div>} */}
                        </div>
                    </div>
                </button>
            </Popconfirm>)
        }
    return null;
};

export default AppButtons;