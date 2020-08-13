import React from 'react';
import ErrorMessage from '../ErrorMessage';
import rotatePhoneIcon from '../../assets/img/rotate_phone.png';

const PortraitModeWarning = (props) => {
    // const {
    //     isMobileOrTablet
    // } = props;
    return(<div id="mobile-device-warning-message">
        <ErrorMessage message="This WebApp is only viewable in landscape mode. Please rotate your device." />
        <div className="d-flex justify-content-center">
            <img 
                src={rotatePhoneIcon} 
                alt=""
                width="250"
                height="200"
            />
        </div>
    </div>);
}
export default PortraitModeWarning;