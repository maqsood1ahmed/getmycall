import React from 'react';
const PageLoader = (props) => {
    const {
        isMobileOrTablet
    } = props;
    return(<div className={`${isMobileOrTablet ?"justify-content-start":"justify-content-center"}`} style= {{ width: "100%", height: "100%", top: "50%", backgroundColor: 'white' }}>
        <img 
            src={`https://api.getmycall.com/static/media/loading-icon.gif`}
            alt="" 
            width="200" height="200" 
            style={{ 
                marginTop: isMobileOrTablet ?"0px":"120px" 
            }} />
    </div>);
}
export default PageLoader;