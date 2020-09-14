import React from 'react';
import MyVideoControls from '../MyVideoControls';
import backArrowPNG from '../../assets/img/back-arrow.png';

const StudentRoomControls = ({roomData, raiseHand, localSource, ...props}) => {
    const {
        currentScreen,
        currentTeacherToggledView,
        t
    } = props;
    const isHandRaised = localSource.isHandRaised ? localSource.isHandRaised : false;
    return(<div className="student-mobile-controls w-100">
        <div className="student-mobile-controls-left">
            <div onClick={()=>props.changeCurrentScreen(currentTeacherToggledView)} className="mobile-controls-change-default-screen-icon">
                <img 
                    style={{
                        opacity: ((currentTeacherToggledView!=="video")&&currentScreen!==currentTeacherToggledView)?1:.5,
                        pointerEvent: ((currentTeacherToggledView!=="video")&&currentScreen!==currentTeacherToggledView)?"none":"all"
                    }}
                    src={backArrowPNG}
                    alt={t("goBack")}
                    width="35px" height="40px" />
            </div>
            <div
                className="student-mobile-controls-hand-raised-icon"
                onClick={() => !isHandRaised && raiseHand(localSource)}>
                <i id={`studenthand-${localSource.id}`} className="fa fa-hand-point-up" 
                    style={{
                        marginLeft: "2rem", 
                        backgroundColor: isHandRaised?"#d0f543":"none"
                    }}/>
            </div>
        </div>
        <MyVideoControls
            {...props}
            t={t}
            isMobileOrTablet={props.isMobileOrTablet}
        />
    </div>);
};

export default StudentRoomControls;