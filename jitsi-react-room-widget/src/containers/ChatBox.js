import React from 'react';
import { connect } from 'react-redux';
import { Popover, Input } from 'antd';
import uid from 'uid';

import arrowSend from '../assets/img/arrow-send.png';
import { ChatMessages } from '../components/ChatMessages';
import { addMessages } from '../actions';

const { TextArea } = Input;

class ChatBox extends React.Component {
    constructor ( props ) {
        super(props);

        this.state = {
            messageText: ''
        }
    }
    componentDidUpdate( prevProps, prevState ) {
        let noOfNewMessages = this.props.noOfNewMessages;
        let messageId = (this.props.messages.length > 0) &&this.props.messages.slice(-noOfNewMessages)[0].messageId;  //get of of old unread message
        if ( noOfNewMessages > 0 && this.props.isChatBoxVisible ) { //only update when chatbox open
            this.props.clearNoOfNewMessages();
            setTimeout(()=>{
                let messageDiv = document.getElementById(messageId);
                if ( messageDiv ) {
                    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
                }
            }, 800);
        }

        if ( prevProps.messages.length !== this.props.messages.length && this.state.messageText ) {
            let messagesDiv = document.getElementsByClassName("chat-box-messages")[0]
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            this.setState({ messageText: '' })
        }
    }
    
    chatBoxTitle = () => {
        return(
            <div className="chat-box-title d-flex flex-direction-row justify-content-center">
                <span className='chat-header-text'>Close Chat <i className="fas fa-comment chat-box-icon"></i></span>
            </div>
        )
    };

    handleChange = ( e ) => {
        console.log(e.target.value, 'message text')
        if (e.target.name === "messageText" ) {
            this.setState({ messageText: e.target.value })
        }
    }

    chatBoxContent = () => {
        return (
            <div className="chat-box-body d-flex flex-column justify-content-between">
              <ChatMessages messages={this.props.messages} />
              <div className="chat-send-message">
                <div className="chat-input">
                    <TextArea name="messageText" value={this.state.messageText} onChange={this.handleChange.bind(this)} rows={3} />
                </div>
                <div className="chat-send-button d-flex flex-row justify-content-end">
                    <button disabled={!this.state.messageText ? true : false} onClick={this.sendMessage.bind(this)} type="button" class="btn"><img width="20px" height="20px" src={arrowSend} alt="Send" /></button>
                </div>
              </div>
            </div>
          );
    };

    sendMessage = () => {
        let { profile, socket } = this.props;
        let { messageText } = this.state;
        let messageId = uid();
        let messageObj = {
            type: 'chat-message',
            data: {
                userId: profile.userId,
                name: profile.name,
                roomId: profile.roomId,
                messageId,
                time: new Date().getHours() + ":" + new Date().getMinutes(),
                messageText,
                type: 'text',
                author: "them"  //for local its me
            }
        };
        console.log('socket obj => =>', socket)
        socket.emit('event', messageObj);

        messageObj.data['author'] = "me"; //for local its me
        this.props.addMessages([messageObj.data]);
    }
    render () {
        const { isChatBoxVisible } = this.props;
        return (
            <Popover 
                placement="bottom" 
                visible={isChatBoxVisible} 
                title={this.chatBoxTitle()} 
                content={this.chatBoxContent()} 
                trigger="click" 
                overlayStyle={{
                    // background: "rgba(0,0,0,1)",
                    height: "100vh"
                  }}
            /> 
            // <div className="ant-popover-content">
            //     <div className="ant-popover-arrow" />
            //     <div className="ant-popover-inner" role="tooltip">
            //         <div className="ant-popover-title">
            //             <div className="chat-box-title d-flex flex-direction-row justify-content-center">
            //                 <span className="chat-header-text">Close Chat <i className="fas fa-comment chat-box-icon"></i></span>
            //             </div>
            //         </div>
            //         <div className="ant-popover-inner-content">
            //             <div className="chat-box-body d-flex flex-column justify-content-between">
            //                 <div className="chat-box-messages"></div>
            //                 <div className="chat-send-message">
            //                     <div className="chat-input">
            //                         <textarea name="messageText" rows="3" className="ant-input"></textarea>
            //                     </div>
            //                     <div className="chat-send-button d-flex flex-row justify-content-end">
            //                         <button disabled="" type="button" className="btn">
            //                             <img width="20px" height="20px" src="data:image/png;base64,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" alt="Send" />
            //                         </button>
            //                     </div>
            //                 </div>
            //             </div>
            //         </div>
            //     </div>
            // </div>     
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

export default connect( mapStateToProps , mapDispatchToProps )(ChatBox);