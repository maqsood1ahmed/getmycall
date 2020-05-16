import React from 'react';
import { ChatMessage } from './ChatMessage';

export const ChatMessages = (props) => {
    const { isPrivate, receiverId, userId } = props;
    let filteredMessages = props.messages.map(message => {
        if ( isPrivate && ( message.studentId === receiverId || message.studentId === userId ) ) {
            return message;
        } else if (!isPrivate ){
            return message
        }
    })
    return (
        <div id={props.divID} 
            className="chat-box-messages"
            style={{
                height: isPrivate?"15rem" : "78%"
            }}>
            {
                filteredMessages.map(message => {
                    if ( message && message.messageId ) {
                        return(
                            <ChatMessage
                                key={message.messageId}
                                message={message}
                                isPrivateMessage={message.studentId?true: false}
                            />
                        )
                    }
                    return '';
                })
            }
        </div>    
    )
}