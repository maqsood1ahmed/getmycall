import React from 'react';

export const ChatMessage = (props) => {
    const { author, messageId, name, messageText, time, type } = props.message;

    let customStyle = {
            chatMessage: {
                float: author==="me"? "right" : "left"
            },
            chatMessageContent: {
                backgroundColor: author==="me"? "white" : "#f6edb0",
                borderRadius: author==="me"? "1.5rem 1.5rem 0rem 1.5rem" : "1.5rem 1.5rem 1.5rem 0rem"
            },
            chatMessageTime: {
                padding: author==="me"? "0rem 1.5rem 0rem 0rem" : "0rem 1.3rem 0rem 1.3rem"
            }
    }
    return (
        <div id={messageId} className="chat-message" style={customStyle.chatMessage}>
            <div className="chat-message-content d-flex flex-column justify-content-center" style={customStyle.chatMessageContent}>
                <div className={`chat-participant-name d-flex ${author==="me"? "justify-content-end" : "justify-content-start"}`}>{name?name:"No Name"}</div>
                <div className={`chat-message-text d-flex ${author==="me"? "justify-content-end" : "justify-content-start"}`}>{type==="text" ? messageText : 'Object'}</div>
            </div>
            <div className={`chat-message-time d-flex ${author==="me"? "justify-content-end" : "justify-content-start"}`} style={customStyle.chatMessageTime}>
                <div>{time}</div>
            </div>
        </div>
    )
}