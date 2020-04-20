/* eslint-disable */
import React from 'react';

import { message, Select  } from 'antd';
// import LoadingSpinner from '../../components/UI/Spinner/Spinner';
import './Conference.scss';

import stopIcon from '../../assets/img/stop.png';

const { Option } = Select;

const options = {
    hosts: {
        domain: 'beta.meet.jit.si',
        muc: 'conference.beta.meet.jit.si' // FIXME: use XEP-0030
    },
    bosh: 'https://beta.meet.jit.si/http-bind', // FIXME: use xep-0156 for that

    // The name of client node advertised in XEP-0115 'c' stanza
    clientNode: 'http://jitsi.org/jitsimeet'
};

let connection, isJoined, room;
let localTracks = [];
let remoteTracks = {};

let studentTracks = {}
let teacherTracks = [];

let isConnected = false;

class Conference extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            roomInfo: {
                roomName: "maqroom1234", //changed
                userName: "maq", //changed
                rollNo: "",
                password: "",
                moderator: true //changed
            },
            loading: false,
            isLoggedIn: true, //changed
            errors: {},
            isTrackUpdate: false,
            resolutions: [ "180", "360", "720", "1080" ]
        };

        if (window.performance) {
            if (performance.navigation.type === 1) {
                this.state.jitsiMeetClient && this.state.jitsiMeetClient.leaveRoom();
            }
        }
    }
    componentDidMount () {
        window.JitsiMeetJS.init();
        connection = new window.JitsiMeetJS.JitsiConnection(null, null, options);
        this.setConnectionListeners();
        connection.connect();

        window.addEventListener(window.JitsiMeetJS.errors.conference.PASSWORD_REQUIRED, function () { message.error('Please provide room password'); });
        let that = this;
        window.addEventListener("beforeunload", that.unload);
    }

    componentDidUpdate () {
        console.log('students tracks', studentTracks);
        console.log('teacher tracks', teacherTracks);
        if( this.state.isTrackUpdate ) {
            this.setState({ isTrackUpdate : false }); //setting false for new tracks update

            for (let i = 0; i < teacherTracks.length ; i++) {
                let teacherVideoTag = document.getElementById(`teacher-video-tag`);
                let teacherAudioTag = document.getElementById(`teacher-audio-tag`);
    
                if( teacherTracks[i].getType() === 'video' ) {
                    if( teacherVideoTag ) {
                        teacherTracks[i].attach($(`#teacher-video-tag`)[0]);
                    }
                } else if ( teacherAudioTag ) {
                    teacherTracks[i].attach($(`#teacher-audio-tag`)[0]);
                }
            }
            let allStudentTracksKeys = Object.keys(studentTracks);
            allStudentTracksKeys.forEach(key => {
                for (let i = 0; i < studentTracks[key].length ; i++) {
                    let track = studentTracks[key][i];

                    if(track.isLocal()){
                        let studentRollNo = this.state.roomInfo.rollNo;
                        if (studentRollNo) {
                            //map local track to small videos
                            if (track.getType() === 'video') {
                                track.attach($(`#video-tag-${studentRollNo}`)[0]);
                                let localUserName = this.state.roomInfo.userName;
                                if ( localUserName ) {
                                    $(`#name-box-${studentRollNo} h6`).text(localUserName);
                                }
                            } else {
                                track.attach($(`#audio-tag-${studentRollNo}`)[0]);
                            }
                        }
                    } else {
                        let participant = track.getParticipantId();
                        let userName = room.getParticipantById(participant)._displayName;
                        let studentRollNo = userName.split('###')[1];

                        if (studentRollNo) {
                            //map local track to small videos
                            if (track.getType() === 'video') {
                                track.attach($(`#video-tag-${studentRollNo}`)[0]);
                                let remoteUserName = userName.split('###')[0];;
                                if ( remoteUserName ) {
                                    $(`#name-box-${studentRollNo} h6`).text(remoteUserName);
                                }
                            } else {
                                track.attach($(`#audio-tag-${studentRollNo}`)[0]);
                            }
                        }
                    }
                }
            });
            
        }
        
    }

    setConnectionListeners () {
        connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
            isConnected = true;
            message.success('connection established.');

            setTimeout(()=> {
                this.joinRoom()
            }, 2000)
        });
        connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_FAILED, function () {
            isConnected = false;
            message.error('connection failed.');
        });
        connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,() => this.disconnect());
    }

    disconnect () {
        console.log('disconnect!');
        this.unload();
        this.setState({ isLoggedIn: false });
        window.location.reload();
    }

    onConferenceJoined () {
        console.log('conference joined');
        message.success('conference joined');
        let userName = this.state.roomInfo && this.state.roomInfo.userName;
        let rollNo = this.state.roomInfo && this.state.roomInfo.rollNo;
        let uid = "";
        if(!this.state.roomInfo.moderator){
            uid = userName + "###" + rollNo;
        } else {
            uid = userName + "###" + "IamTeacher321123";   //before rendering user tracks will check this to identify whether its teacher or student
        }
        room.setDisplayName(uid); //set my user name
        let myRole = room.getRole(); //get my role
        console.log(myRole, "myrole");
        if (myRole === "moderator") {
            message.info("You are moderator of the Conference.", 5);
        }
        isJoined = true;
        console.log(localTracks, 'localtracks');
        for (let i = 0; i < localTracks.length; i++) {
            room.addTrack(localTracks[i]);
        }
    }

    joinRoom () {
        let roomName = (this.state.roomInfo && this.state.roomInfo.roomName) || "";
        room = connection.initJitsiConference(roomName, {}); //name of conference

        room.on(window.JitsiMeetJS.events.conference.TRACK_ADDED, (track) => this.onRemoteTrack(track));
        room.on(window.JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => this.onRemoveTrack(track)); //to remove track
        room.on(window.JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
            this.onConferenceJoined();
            this.setState({ isLoggedIn: true });
            this.getLocalTracks();
        });
        // room.on( window.JitsiMeetJS.events.conference.CONNECTION_FAILED, function(){console.log('conference join failed')} );
        // room.on(jitsiClientApi.events.conference.USER_JOINED, id => { remoteTracks[id] = [] }); //when remote user joined
        room.on(window.JitsiMeetJS.events.conference.USER_LEFT, id => this.onUserLeft(id)); //user left
        // room.on(jitsiClientApi.events.conference.TRACK_MUTE_CHANGED,
        //     track => { console.log(`${track.getType()} - ${track.isMuted()}`) }); //mute in conference (found by track)
        // room.on( jitsiClientApi.events.conference.DISPLAY_NAME_CHANGED,
        //     (userID, displayName) => console.log(`${userID} - ${displayName}`)); //display name changed
        // room.on(
        //     jitsiClientApi.events.conference.TRACK_AUDIO_LEVEL_CHANGED, //audio level changed event
        //     (userID, audioLevel) => console.log(`${userID} - ${audioLevel}`));
        // room.on(
        //     jitsiClientApi.events.conference.PHONE_NUMBER_CHANGED, //user phone changed
        //     () => console.log(`${room.getPhoneNumber()} - ${room.getPhonePin()}`));
        let password = this.state.roomInfo && this.state.roomInfo.password;
        room.join(password); //after adding all conference/room listeneres join the room

        //after join set student lowest resolution to receive to other users and for teacher maximum
        if  (this.state.roomInfo.moderator) {
            room.setReceiverVideoConstraint("1080");  //we can increase it further
        } else {
            room.setReceiverVideoConstraint("180");
        }

    }

    getLocalTracks () {
        window.JitsiMeetJS.createLocalTracks({ devices: ['audio', 'video'] })
            .then((tracks) => {
                this.onLocalTracks(tracks);
            })
            .catch(error => {
                throw error;
            });
    }
    onUserLeft (id) {
        // console.log('user left => ', id,);
        // if (!remoteTracks[id]) {
        //     return;
        // }
        // const tracks = remoteTracks[id];
        // for (let i = 0; i < tracks.length; i++) {
        //     let trackId = "#" + id.toString() + tracks[i].getType().toString();
        //     tracks[i].detach($(`#${id}${tracks[i].getType()}`)); //must see it again
        //     delete tracks[trackId];
        //     $(trackId).parent().remove();

        //     $(`${participant}-li-${idx}`).parent().remove();
        //     $(`#${participant}audio${idx}`).parent().remove();
        // }
        // remoteTracks = tracks;
        const participant = id;
        if( teacherTracks[0] &&  teacherTracks[0].getParticipantId() === participant ) {
            message.info('Teacher Left!');
            teacherTracks = [];
        } else {
            let studentRollNo = null;
            if(studentTracks){
                Object.keys(studentTracks).forEach(key => {
                    studentTracks[key].forEach(oldTrack => {
                        if ( oldTrack.getParticipantId() === participant ) {
                            studentRollNo = key;
                        }
                    })
                })
            }
    
            if (studentRollNo) {
                //detach remote track from small videos\
                for( let i; i< studentTracks[studentRollNo].length ; i++){
                    let track = studentTracks[studentRollNo][i];
                    if (track.getType() === 'video') {
                        track.detach($(`#video-tag-${studentRollNo}`));
                        $(`#video-tag-${studentRollNo}`).attr('poster', 'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU');
                    } else {
                        track.detach($(`#audio-tag-${studentRollNo}`));
                    }
                }
                delete studentTracks[studentRollNo];
                console.log(studentRollNo, 'remove')
            } 
        }
    }

    onLocalTracks (tracks) {
        // localTracks = tracks;
        for (let i = 0; i < tracks.length; i++) {
            tracks[i].addEventListener(
                window.JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                audioLevel => console.log(`Audio Level local: ${audioLevel}`));
            tracks[i].addEventListener(
                window.JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                () => console.log('local track muted'));
            tracks[i].addEventListener(
                window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                () => console.log('local track stoped'));
            tracks[i].addEventListener(
                window.JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
                deviceId =>
                    console.log(`track audio output device was changed to ${deviceId}`));

            if ( this.state.roomInfo.moderator ) {
                console.log('teacher tracks (tracks)', tracks)
                teacherTracks.push(tracks[i]);
            } else {
                if (!studentTracks[this.state.roomInfo.rollNo]) {
                    studentTracks[this.state.roomInfo.rollNo] = [];
                }
                studentTracks[this.state.roomInfo.rollNo].push(tracks[i]);
            }
            if (isJoined) {
                room.addTrack(tracks[i]);
            }
            this.setState({ isTrackUpdate: true });
        }
    }

    onRemoteTrack (track) {
        console.log('got track');
        if (track.isLocal()) {
            return;
        }
        const participant = track.getParticipantId();

        // if (!remoteTracks[participant]) {
        //     remoteTracks[participant] = [];
        // }
        console.log('get user name=', room.getParticipantById(participant))
        let userName = room.getParticipantById(participant)._displayName;
        let studentRollNo = userName.split('###')[1];

        if(studentRollNo === "IamTeacher321123") {
            // if(this.state.roomInfo.moderator) {
            //     console.log('teacher already exist.');
            //     message.error('Teacher already exist');
            //     this.unload();
            //     this.setState({ isLoggedIn: false });
            //     window.location.reload();
            // } else {
            teacherTracks.push(track);
            // }
        } else {
            studentTracks[studentRollNo] = [];
            studentTracks[studentRollNo].push(track);
        }

        track.addEventListener(
            window.JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
            audioLevel => console.log(`Audio Level remote: ${audioLevel}`));
        track.addEventListener(
            window.JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
            () => console.log('remote track muted'));
        track.addEventListener(
            window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
            () => console.log('remote track stoped'));
        track.addEventListener(
            window.JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
            deviceId => console.log(`track audio output device was changed to ${deviceId}`));

        this.setState({ isTrackUpdate: true });
    }

    onRemoveTrack (track) {
        if (track.isLocal()) {
            return;
        }
        const participant = track.getParticipantId();

        console.log('participant remove => ', participant, room, track)
        // let userName = room.getParticipantById(participant)._displayName;
        // let studentRollNo = userName.split('###')[1];
        let studentRollNo = null;
        if(studentTracks){
            Object.keys(studentTracks).forEach(key => {
                studentTracks[key].forEach(oldTrack => {
                    if ( oldTrack.getParticipantId() === track.getParticipantId() ) {
                        studentRollNo = key;
                    }
                })
            })
        }
        conosle
        if (studentRollNo) {
            // //detach remote track from small videos
            // if (track.getType() === 'video') {
            //     track.detach($(`#video-tag-${studentRollNo}`));
            // } else {
            //     track.detach($(`#audio-tag-${studentRollNo}`));
            // }
            studentTracks[studentRollNo] = [];
            console.log(studentRollNo, 'deleted')
        } 
    }

    unload () {
        for (let i = 0; i < localTracks.length; i++) {
            localTracks[i].dispose();

            teacherTracks[i].dispose();
        }
        room.leave();
        connection.disconnect();
    }

    componentWillUnmount () {
        this.unload();
        window.removeEventListener("beforeunload", () => this.unload());
    }

    handleChange = (event) => {
        let { roomInfo, errors } = this.state;
        const name = event.target.name;
        const value = event.target.value;

        if (name === "moderator") {
            roomInfo[name] = !roomInfo[name];
        } else if (name === "rollNo") {
            const regex = /^[0-9\b]+$/;
            if (value === "" || regex.test(value)) {
                roomInfo[name] = value;
            } else {
                errors["rollNo"] = "Roll Number must be integer";
                this.setState({ errors })
            }
        } else {
            roomInfo[name] = value; 
        }
        this.setState({ roomInfo });
    }

    handleFormSubmit = async () => {
        if (this.handleFormValidation()) {
            //add other code here like api call etc
            this.joinRoom();
        }
    }
    handleFormValidation = () => {
        let fields = this.state.roomInfo;
        let errors = {};
        let formIsValid = true;

        if (!fields["roomName"]) {
            formIsValid = false;
            errors["roomName"] = "Cannot be empty";
        }

        if (!fields["roomName"].match(/^[a-z0-9]+$/)) {
            formIsValid = false;
            errors["roomName"] = "Room Name should must be small characters";
        }

        if (!fields["userName"]) {
            formIsValid = false;
            errors["userName"] = "Cannot be empty";
        }

        if(!this.state.roomInfo.moderator){
            if (!fields["rollNo"]) {
                formIsValid = false;
                errors["rollNo"] = "Student must provide roll number";
            }
        }
        // if (!fields["password"]) {
        //     formIsValid = false;
        //     errors["password"] = "Cannot be empty";
        // }

        this.setState({ errors: errors });
        return formIsValid;
    }

    renderForm = () => {
        console.log('rendering form');
        const { errors } = this.state;
        const { roomName, rollNo, userName, password, moderator } = this.state.roomInfo;
        return (<div id="form-section">
            <form id="user-form">
                <div className="form-group">
                    <label htmlFor="roomname">Room Name</label>
                    <input
                        type="name"
                        value={roomName}
                        name="roomName"
                        className="form-control"
                        id="room-name"
                        onChange={this.handleChange}/>
                    <span className="help-block">{(errors['roomName'])}</span>
                </div>
                {
                    !moderator && <div className="form-group">
                                    <label htmlFor="username">Student Roll No</label>
                                    <input
                                        type="username"
                                        value={rollNo}
                                        name="rollNo"
                                        className="form-control"
                                        id="roll-no"
                                        onChange={this.handleChange}/>
                                    <span className="help-block">{(errors['rollNo'])}</span>
                                </div> 
                }
                <div className="form-group">
                    <label htmlFor="username">Name</label>
                    <input
                        type="username"
                        value={userName}
                        name="userName"
                        className="form-control"
                        id="user-name"
                        onChange={this.handleChange}/>
                    <span className="help-block">{(errors['userName'])}</span>
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        value={password}
                        name="password"
                        className="form-control"
                        id="password"
                        onChange={this.handleChange}/>
                    <span className="help-block">{(errors['password'])}</span>
                </div>
                <div className="checkbox">
                    <label>
                        <input name="moderator" value={moderator} onChange={this.handleChange} type="checkbox" /> Are you Teacher?
                    </label>
                </div>
                <button disabled={!isConnected} type="button" onClick={this.handleFormSubmit.bind(this)} className="btn btn-default">{moderator ? "Create Room" : "Login"}</button>
            </form>
        </div>);
    }

    handleChangeResolutions = (value) => {
        room.setReceiverVideoConstraint(value);
        message.success(`Resolution Changed to ${value}`)
    }

    leaveRoomBtn = (e) => {
        this.unload();
        this.setState({ isLoggedIn: false });
        window.location.reload();
    }
    

    render () {
        const { isLoggedIn, roomInfo } = this.state;
        const { roomName, userName } = roomInfo;

        if ( !roomName || !userName || !isLoggedIn ) {
            return this.renderForm();
        } else {
            return (
                <div className="product-block content-container">
                    <div className="container teacher-container">
                        <div className="row" style={{ height: "100%", width: "100%" }}>
                            <div className="col-md-8 col-sm-12 col-xs-12 large-video-container">
                                <div className="row" id="large-video-div" width="100%" height="100%">
                                    <video id="teacher-video-tag" autoPlay width="100%" height="100%" poster="https://www.clipartmax.com/png/middle/148-1488113_teachers-icon-teachers-png.png" /> 
                                    <audio autoPlay width="0%" id="teacher-audio-tag"></audio>
                                    { this.state.roomInfo.moderator &&
                                        <Select
                                            defaultValue={this.state.resolutions[3]}
                                            style={{ width: 80 }}
                                            onChange={(value) => this.handleChangeResolutions(value)}
                                        >
                                        {this.state.resolutions.map(resolution => (
                                          <Option key={resolution}>{resolution}</Option>
                                        ))}
                                      </Select>
                                    }
                                    <div className="btnStop" onClick={this.leaveRoomBtn.bind(this)} style={{ backgroundImage: `url(${stopIcon})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }} />
                                </div>
                            </div>
                            <div className="col-md-4 col-sm-4 col-xs-8" id="teacher-dashboard">
                                <div className="row">
                                    <div className="col-md-12">
                                        <video autoPlay width="350" height="199" controls>
                                            <source src="" type="video/mp4" />>
                                            <source src="" type="video/ogg" />
                                        </video>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-12">
                                        <video autoPlay width="350" height="199" controls>
                                            <source src="" type="video/mp4" />>
                                            <source src="" type="video/ogg" />
                                        </video>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="container row" id="small-videos-box">
                        <div className="student-small-video" id="student-box-1">
                            <div id="video-box-1">
                                <video id="video-tag-1" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay width="0%" id="audio-tag-1"></audio>
                            </div>
                            <div className="student-name" id="name-box-1">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-2">
                            <div id="video-box-2">
                                <video id="video-tag-2" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-2" />
                            </div>
                            <div className="student-name" id="name-box-2">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-3">
                            <div id="video-box-3">
                                <video id="video-tag-3" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-3" />
                            </div>
                            <div className="student-name" id="name-box-3">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-4">
                            <div id="video-box-4">
                                <video id="video-tag-4" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-4" />
                            </div>
                            <div className="student-name" id="name-box-4">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-5">
                            <div id="video-box-5">
                                <video id="video-tag-5" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-5" />
                            </div>
                            <div className="student-name" id="name-box-5">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-6">
                            <div id="video-box-6">
                                <video id="video-tag-6" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-6" />
                            </div>
                            <div className="student-name" id="name-box-6">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-7">
                            <div id="video-box-7">
                                <video id="video-tag-7" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-7" />
                            </div>
                            <div className="student-name" id="name-box-7">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-8">
                            <div id="video-box-8">
                                <video id="video-tag-8" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-8" />
                            </div>
                            <div className="student-name" id="name-box-8">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-9">
                            <div id="video-box-9">
                                <video id="video-tag-9" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-9" />
                            </div>
                            <div className="student-name" id="name-box-9">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-10">
                            <div id="video-box-10">
                                <video id="video-tag-10" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-10" />
                            </div>
                            <div className="student-name" id="name-box-10">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-11">
                            <div id="video-box-11">
                                <video id="video-tag-11" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay width="0%" id="audio-tag-11" />
                            </div>
                            <div className="student-name" id="name-box-11">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-12">
                            <div id="video-box-12">
                                <video id="video-tag-12" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-12" />
                            </div>
                            <div className="student-name" id="name-box-12">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-13">
                            <div id="video-box-13">
                                <video id="video-tag-13" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-13" />
                            </div>
                            <div className="student-name" id="name-box-13">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-14">
                            <div id="video-box-14">
                                <video id="video-tag-14" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-14" />
                            </div>
                            <div className="student-name" id="name-box-14">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-15">
                            <div id="video-box-15">
                                <video id="video-tag-15" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-15" />
                            </div>
                            <div className="student-name" id="name-box-15">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-16">
                            <div id="video-box-16">
                                <video id="video-tag-16" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-16" />
                            </div>
                            <div className="student-name" id="name-box-16">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-17">
                            <div id="video-box-17">
                                <video id="video-tag-17" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-17" />
                            </div>
                            <div className="student-name" id="name-box-17">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-18">
                            <div id="video-box-18">
                                <video id="video-tag-18" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-18" />
                            </div>
                            <div className="student-name" id="name-box-18">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-19">
                            <div id="video-box-19">
                                <video id="video-tag-19" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-19" />
                            </div>
                            <div className="student-name" id="name-box-19">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-20">
                            <div id="video-box-20">
                                <video id="video-tag-20" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-20" />
                            </div>
                            <div className="student-name" id="name-box-20">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-21">
                            <div id="video-box-21">
                                <video id="video-tag-21" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay width="0%" id="audio-tag-21" />
                            </div>
                            <div className="student-name" id="name-box-21">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-22">
                            <div id="video-box-22">
                                <video id="video-tag-22" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-22" />
                            </div>
                            <div className="student-name" id="name-box-22">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-23">
                            <div id="video-box-23">
                                <video id="video-tag-23" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-23" />
                            </div>
                            <div className="student-name" id="name-box-23">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-24">
                            <div id="video-box-24">
                                <video id="video-tag-24" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-24" />
                            </div>
                            <div className="student-name" id="name-box-24">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-25">
                            <div id="video-box-25">
                                <video id="video-tag-25" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-25" />
                            </div>
                            <div className="student-name" id="name-box-25">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-26">
                            <div id="video-box-26">
                                <video id="video-tag-26" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-26" />
                            </div>
                            <div className="student-name" id="name-box-26">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-27">
                            <div id="video-box-27">
                                <video id="video-tag-27" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-27" />
                            </div>
                            <div className="student-name" id="name-box-27">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-28">
                            <div id="video-box-28">
                                <video id="video-tag-28" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-28" />
                            </div>
                            <div className="student-name" id="name-box-28">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-29">
                            <div id="video-box-29">
                                <video id="video-tag-29" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-29" />
                            </div>
                            <div className="student-name" id="name-box-29">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                        <div className="student-small-video" id="student-box-30">
                            <div id="video-box-30">
                                <video id="video-tag-30" autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                <audio autoPlay id="audio-tag-30" />
                            </div>
                            <div className="student-name" id="name-box-30">
                                <h6 className="student-name-text" align="center">Student Name</h6>
                            </div>
                        </div>
                    </div>
                    <div id="small-audios-placeholder" />
                </div>

            );
        }
    }
}

export default Conference;



// Hj8G9gVgEV9MRq


//things to note

//only one teacher for specific room
//student roll no should must be unique