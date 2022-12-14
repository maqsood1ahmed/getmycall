import React from 'react';

export const ChatMessage = (props) => {
    const { isPrivateMessage } = props;
    const { author, messageId, name, messageText, time, type, studentName } = props.message;
    console.log(". => => is Private message",props)
    let customStyle = {
            chatMessage: {
                float: author==="me"? "right" : "left"
            },
            chatMessageContent: {
                backgroundColor: isPrivateMessage ? (author==="me"?"#fd7c75":"#fd7c758f"): (author==="me"?"#b398ec":"#d5c8f4"),
                borderRadius: author==="me"? "1.5rem 1.5rem 0rem 1.5rem" : "1.5rem 1.5rem 1.5rem 0rem"
            },
            chatMessageTime: {
                padding: author==="me"? "0rem 1.5rem 0rem 0rem" : "0rem 1.3rem 0rem 1.3rem"
            }
    }
    return (
        <div id={messageId} className="chat-message" style={customStyle.chatMessage}>
            <div className="chat-message-content d-flex flex-column justify-content-center" style={customStyle.chatMessageContent}>
    <div className={`chat-participant-name d-flex ${author==="me"? "justify-content-end" : "justify-content-start"}`}>{name?name:"No Name"} : {isPrivateMessage?studentName:""}</div>
                <div className={`chat-message-text d-flex ${author==="me"? "justify-content-end" : "justify-content-start"}`}>{type==="text" ? messageText : 'Object'}</div>
            </div>
            <div className={`chat-message-time d-flex ${author==="me"? "justify-content-end" : "justify-content-start"}`} style={customStyle.chatMessageTime}>
                <div>{time}</div>
            </div>
        </div>
    )
}