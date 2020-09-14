import React from 'react';
import { connect } from 'react-redux';
import { Popover, Input } from 'antd';
import uid from 'uid';

import arrowSend from '../assets/img/arrow-send.png';
import { addMessages } from '../actions';
import { ChatMessages } from '../components/ChatMessages';

const { TextArea } = Input;

class SendChatMessage extends React.Component {
    constructor ( props ) {
        super(props);

        this.state = {
            messageText: ''
        }
    }

    componentDidUpdate( prevProps, prevState ) {
        let { selectedSource, noOfNewPrivateMessages } = this.props;
        let filteredMessages = this.props.messages.map(message => {
            // if ( message.studentId === selectedSource.id  || roomData.id === message.id ) { 
                return message;
            // }
        })
        let messageId = (filteredMessages.length > 0) && filteredMessages.slice(-noOfNewPrivateMessages)[0].messageId;  //get of of old unread message
        if ( noOfNewPrivateMessages > 0 && this.props.isSendMessageBoxVisible ) { //only update when message box open
            this.props.clearNoOfNewPrivateMessages(selectedSource);
            setTimeout(()=>{
                let messageDiv = document.getElementById(messageId);
                if ( messageDiv ) {
                    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
                }
            }, 800);
        }

        if ( prevProps.messages.length !== this.props.messages.length || prevProps.isSendMessageBoxVisible !== this.props.isSendMessageBoxVisible ) {
            let messagesDiv = document.getElementById("private-chat-messages");
            if ( messagesDiv ) {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            this.setState({ messageText: '' })
        }
    }
    

    handleChange = ( e ) => {
        if (e.target.name === "messageText" ) {
            this.setState({ messageText: e.target.value })
        }
    }

    chatBoxTitle = () => {
        const { t } = this.props;
        return(
            <div className="send-private-message-box-title d-flex flex-direction-row justify-content-around">
                <span className="chat-box-close-icon d-flex flex-row justify-content-start" style={{ width: "35%" }}>
                    <i onClick={()=>this.props.hideMessageBox()} className="fas fa-times"></i>
                </span>
                <span className='p-1 chat-box-close-icon d-flex flex-row justify-content-start chat-header-text' style={{ width: "65%" }}>{t('privateChat')}<i className="fas fa-comment chat-box-icon"></i></span>
            </div>
        )
    };

    chatBoxContent = () => {
        const { t } = this.props;
        return (
            <div className="chat-box-body d-flex flex-column justify-content-between">
                <ChatMessages 
                    isPrivate={true} 
                    receiverId={this.props.studentId}
                    userId={this.props.roomData.id} 
                    messages={this.props.messages}
                    divID="private-chat-messages" />
                <div className="chat-send-message">
                    <div className="chat-input">
                        <TextArea name="messageText" value={this.state.messageText} onPressEnter={this.sendMessage.bind(this)} onChange={this.handleChange.bind(this)} rows={3} />
                    </div>
                    <div className="chat-send-button d-flex flex-row justify-content-end">
                    </div>
                    <div className="input-note-buttons d-flex flex-row justify-content-between">
                        <div className="note-close-button">
                            <button onClick={()=>this.props.hideMessageBox()} type="button" class="btn">{t('close')}</button>
                        </div>
                        <div className="chat-send-button">
                            <button disabled={!this.state.messageText ? true : false} onClick={this.sendMessage.bind(this)} type="button" class="btn"><img width="20px" height="20px" src={arrowSend} alt="Send" /></button>
                    </div>
                </div>
                </div>
          </div>
          );
    };

    sendMessage = (e) => {
        e.preventDefault();
        let socket = this.props.socket;
        let messageId = uid();
        let roomData= this.props.roomData;
        let studentId = this.props.studentId;
        let studentName = this.props.studentName;
        let messageObj = {
            type: 'private-chat-message',
            data: {
                userId: roomData.id,
                name: roomData.name,
                roomId: roomData.roomId,
                messageId,
                time: new Date().getHours() + ":" + new Date().getMinutes(),
                messageText: this.state.messageText,
                type: 'text',
                author: "them",  //for local its me,
                studentId,  //send message to specific student
                studentName
            }
        };
        console.log('send message object => => ', messageObj)
        socket.emit('event', messageObj);

        messageObj.data['author'] = "me"; //for local its me
        this.props.addMessages([messageObj.data]);
        // let messagesDiv = document.getElementsByClassName("chat-box-messages")[0]
        // if ( messagesDiv ) {
        //     messagesDiv.scrollTop = messagesDiv.scrollHeight;
        // }
        this.setState({ messageText: "" })
    }
    render () {
        const { isSendMessageBoxVisible } = this.props;
        return (
            <Popover 
                placement="top" 
                visible={isSendMessageBoxVisible} 
                title={this.chatBoxTitle()} 
                content={this.chatBoxContent()} 
                trigger="click" 
                overlayClassName={`${this.props.isWorkingMode ? 'input-popover-working-mode inputPopover' : 'inputPopover'} `}
            />    
        )
    }
}
const mapStateToProps = state => ({
    messages: state.messages,
})

const mapDispatchToProps = dispatch => {
    return {
      addMessages: (message) => dispatch(addMessages(message))
    }
}

export default connect( mapStateToProps , mapDispatchToProps )(SendChatMessage);