import React from 'react';
const ErrorMessage = (props) => {
    const {
        message
    } = props;
    return(<div className="container" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        <p style={{ fontSize: "35px", color: "#ff4d4f" }}>{message}</p>
    </div>);
}
export default ErrorMessage;