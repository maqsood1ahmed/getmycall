import React from 'react';
import MyVideoControls from '../MyVideoControls';
import backArrowPNG from '../../assets/img/back-arrow.png';

const StudentRoomControls = ({roomData, raiseHand, localSource, ...props}) => {
    const isHandRaised = localSource.isHandRaised ? localSource.isHandRaised : false;
    return(<div className="student-mobile-controls w-100">
        <div className="student-mobile-controls-left">
            <div onClick={()=>props.unload()} className="student-mobile-controls-leave-room-icon">
                <img 
                    src={backArrowPNG}
                    alt="Go Back"
                    width="35px" height="40px" />
            </div>
            <div
                className="student-mobile-controls-hand-raised-icon"
                onClick={() => !isHandRaised && raiseHand(localSource)}>
                <i id={`studenthand-${localSource.id}`} className="fa fa-hand-point-up" style={{marginLeft: "2rem"}}/>
            </div>
        </div>
        <MyVideoControls
            {...props}
            isMobileOrTablet={props.isMobileOrTablet}
        />
    </div>);
};

export default StudentRoomControls;