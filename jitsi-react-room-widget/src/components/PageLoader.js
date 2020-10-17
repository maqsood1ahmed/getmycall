import React from 'react';
// import loadingIcon from '../assets/img/loading-icon.gif';
const PageLoader = (props) => {
    const {
        isMobileOrTablet
    } = props;
    return(<div style={{ paddingLeft: "0px", paddingRight: "0px", width: "100vw", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        <div className={`${isMobileOrTablet ?"justify-content-start":"justify-content-center"}`} style= {{ width: "100%", height: "100%", top: "50%", backgroundColor: 'white' }}>
            <img 
                src={'https://api.getmycall.com/static/media/loading-icon.gif'}
                alt="" 
                width="200" height="200" 
                style={{ 
                    marginTop: isMobileOrTablet ?"0px":"120px" 
                }} />
        </div>
    </div>);
}
export default PageLoader;