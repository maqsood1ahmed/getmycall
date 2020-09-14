import React from 'react';
import { Tooltip  } from 'antd';

const ScreenModesButtons = (props) => {
    const { teacherView, currentScreenMode, changeScreenMode, t } = props;
    return(
        <div className="row main-video-actions-box-right-content d-flex flex-row justify-content-end">
            {
                <Tooltip title={currentScreenMode==="chatMode"?t('commentsModeExitMsg'):t('commentsModeMsg')}>
                    <div
                        onClick={() => changeScreenMode("chatMode", teacherView)}
                        style={{
                            cursor: "pointer",
                            opacity: 1,
                            marginLeft: ".7rem",
                            flex: "1 1 0"
                        }}>
                        <div id="rectangle-button" />
                    </div>
                </Tooltip>
            }
            {
                <Tooltip title={currentScreenMode==="fullPageMode"?t('exitFullPageModeMsg'):t('fullPageModeMsg')}>
                    <div
                        id="full-screen-icon"
                        onClick={() => changeScreenMode("fullPageMode", teacherView)}
                        style={{}}>
                        <i className="fas fa-expand" />
                    </div>
                </Tooltip>
            }
        </div>);
}

export default ScreenModesButtons;