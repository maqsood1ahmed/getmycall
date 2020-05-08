import React from 'react';
import { ChatMessage } from './ChatMessage';

export const ChatMessages = (props) => {
    return (
        <div className="chat-box-messages">
            {
                props.messages.map(message => {
                    return(
                        <ChatMessage
                            key={message.messageId}
                            message={message}
                        />
                    )
                })
            }
        </div>    
    )
}