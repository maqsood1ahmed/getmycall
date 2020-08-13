import React from 'react';
import MyVideoControls from '../MyVideoControls';

const AppMobileView = (props) => {
    return(<div id="mobile-mode-container">
        {props.teacherViews('video')}
        <MyVideoControls
            {...props}
            isMobileOrTablet={true}
        />
    </div>);
}
export default AppMobileView;