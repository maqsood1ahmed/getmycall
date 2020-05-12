import React from 'react';
import { Popover, Input, message } from 'antd';
import axios from 'axios';

const { TextArea } = Input;

class InputNote extends React.Component {
    constructor ( props ) {
        super(props);

        this.state = {
            noteText: ''
        }
    }
    

    handleChange = ( e ) => {
        if (e.target.name === "inputNote" ) {
            this.setState({ noteText: e.target.value })
        }
    }

    chatBoxContent = () => {
        return (
            <div className="note-input-div">
                <div className="note-input">
                    <TextArea name="inputNote" value={this.state.noteText} onChange={this.handleChange.bind(this)} rows={3} />
                </div>
                <div className="input-note-buttons d-flex flex-row justify-content-between">
                    <div className="note-close-button">
                        <button onClick={()=>this.props.hideInputNote()} type="button" class="btn">Close</button>
                    </div>
                    <div className="note-save-button">
                        <button disabled={!this.state.noteText ? true : false} onClick={this.saveNote.bind(this)} type="button" class="btn">Save</button>
                    </div>
                </div>
            </div>
          );
    };

    saveNote = async () => {
        const { student_id, class_id, teacher_id } = this.props;
        
        try {
          let params = { student_id, class_id, teacher_id, note: "test note1 from teacher" }; 

          const response = await axios.post("https://wfh.wnets.net/api.php?api=notes&student_id=91&class_id=1&teacher_id=11&note=somenote");
          console.log('note api response => =>', response);
          if ( response.status ) {
            message.error('Note saved successfully.');
          }
          this.props.hideInputNote()
        } catch (error) {
            message.error('something went wrong when saving note.');
            console.error('something went wrong when saving note. => ', error);
        }
    }

    render () {
        const { isInputNoteVisible } = this.props;
        console.log('roomDAta from input note', this.props.roomData)
        return (
            <Popover 
                placement="top" 
                visible={isInputNoteVisible} 
                // title={this.chatBoxTitle()} 
                content={this.chatBoxContent()} 
                trigger="click" 
                overlayClassName="inputPopover"
                overlayStyle={{
                    // background: "rgba(0,0,0,1)",
                    height: "200px"
                  }}
            />    
        )
    }
}

export default InputNote;