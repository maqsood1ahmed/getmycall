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

    noteJSXContent = () => {
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
          let params = { 
              api: "notes",
              student_id, 
              class_id, 
              teacher_id, 
              note: this.state.noteText
            }; 

          const response = await axios.post("https://wfh.wnets.net/api.php", null, { params });
          console.log('note api response => =>', response);
          if ( response.data && response.data.status && response.data.message ) {
            message.success(response.data.message);
            this.props.hideInputNote();
          } else if(response.data && response.data.message ) {
              message.error(response.data.message);
          }
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
                content={this.noteJSXContent()} 
                trigger="click" 
                overlayClassName="inputPopover"
            />    
        )
    }
}

export default InputNote;