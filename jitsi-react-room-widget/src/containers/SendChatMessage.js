import React from 'react';
import { connect } from 'react-redux';
import { Popover, Input } from 'antd';
import uid from 'uid';

import arrowSend from '../assets/img/arrow-send.png';
import { addMessages } from '../actions';

const { TextArea } = Input;

class SendChatMessage extends React.Component {
    constructor ( props ) {
        super(props);

        this.state = {
            messageText: ''
        }
    }
    

    handleChange = ( e ) => {
        if (e.target.name === "messageText" ) {
            this.setState({ messageText: e.target.value })
        }
    }

    chatBoxContent = () => {
        return (
            <div className="chat-box-body d-flex flex-column justify-content-between">
                <div className="chat-send-message">
                    <div className="chat-input">
                        <TextArea name="messageText" value={this.state.messageText} onChange={this.handleChange.bind(this)} rows={3} />
                    </div>
                    <div className="chat-send-button d-flex flex-row justify-content-end">
                    </div>
                    <div className="input-note-buttons d-flex flex-row justify-content-between">
                        <div className="note-close-button">
                            <button onClick={()=>this.props.hideMessageBox()} type="button" class="btn">Close</button>
                        </div>
                        <div className="chat-send-button">
                            <button disabled={!this.state.messageText ? true : false} onClick={this.sendMessage.bind(this)} type="button" class="btn"><img width="20px" height="20px" src={arrowSend} alt="Send" /></button>
                    </div>
                </div>
                </div>
          </div>
          );
    };

    sendMessage = () => {
        let socket = this.props.socket;
        let messageId = uid();
        let roomData= this.props.roomData;
        let studentId = this.props.studentId;
        let studentName = this.props.studentName;
        let messageObj = {
            type: 'private-chat-message',
            data: {
                userId: roomData.userId,
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
        socket.emit('event', messageObj);

        messageObj.data['author'] = "me"; //for local its me
        this.props.addMessages([messageObj.data]);
    }
    render () {
        const { isSendMessageBoxVisible } = this.props;
        return (
            <Popover 
                placement="top" 
                visible={isSendMessageBoxVisible} 
                // title={this.chatBoxTitle()} 
                content={this.chatBoxContent()} 
                trigger="click" 
                overlayClassName="inputPopover"
            />    
        )
    }
}
// const mapStateToProps = state => ({
//     messages: state.messages,
// })

const mapDispatchToProps = dispatch => {
    return {
      addMessages: (message) => dispatch(addMessages(message))
    }
}

export default connect( null , mapDispatchToProps )(SendChatMessage);