import React from 'react';
import PropTypes from 'prop-types';

const StudentWorkingMode = (props) => {
    const {
        isMobileOrTablet
    } = props;
    return(<div
                className="board-source-container"
                style={{ 
                    width: "100%", height: "100%", 
                }}
            >
        {props.teacherViews('board')}
        {props.children}
        <div className={`${isMobileOrTablet?"teacher-video-div-working-mode-mobile":"teacher-video-div-working-mode"}`}>
            <video id="teacher-video-tag" className={`${isMobileOrTablet?"teacher-video-tag-working-mode-mobile":""}`} autoPlay />
            <audio autoPlay width="0%" height="0%" id="teacher-audio-tag"></audio>
        </div>
    </div>);
}

StudentWorkingMode.propTypes = {
    isMobileOrTablet: PropTypes.bool,
    teacherViews: PropTypes.func.isRequired,
    children: PropTypes.element.isRequired
}

export default StudentWorkingMode;