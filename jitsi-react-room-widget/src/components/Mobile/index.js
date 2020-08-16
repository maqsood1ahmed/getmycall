import React from 'react';
import MyVideoControls from '../MyVideoControls';
import backArrowPNG from '../../assets/img/back-arrow.png';

const AppMobileView = (props) => {
    return(<div id="mobile-mode-container">
        {props.teacherViews('video')}
        {/* {props.teacherViews('board')} */}
        <div className="student-mobile-controls w-100">
            <div className="student-mobile-controls-left">
                <div onClick={()=>props.unload()} className="student-mobile-controls-leave-room-icon">
                    <img 
                        src={backArrowPNG}
                        alt="Go Back"
                        width="35px" height="40px" />
                </div>
                <div className="student-mobile-controls-hand-raised-icon">
                    <i className="fa fa-hand-point-up" style={{marginLeft: "2rem"}}/>
                </div>
            </div>
            <MyVideoControls
                {...props}
                isMobileOrTablet={true}
            />
            <div/>
        </div>
    </div>);
}
export default AppMobileView;