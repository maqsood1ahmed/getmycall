import React from 'react';
import { connect } from 'react-redux';
import { Popover, Input } from 'antd';
import uid from 'uid';

import arrowSend from './assets/img/arrow-send.png';
import { ChatMessages } from './components/ChatMessages';
import { addMessages } from './actions';

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