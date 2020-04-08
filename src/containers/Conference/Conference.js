/* eslint-disable */
import React from 'react';

import { message } from 'antd';
// import LoadingSpinner from '../../components/UI/Spinner/Spinner';
import './Conference.scss';

import stopIcon from '../../assets/img/stop.png';

const options = {
    hosts: {
        domain: 'dev.getmycall.com',
        muc: 'conference.dev.getmycall.com' // FIXME: use XEP-0030
    }
    ,
    bosh: 'https://dev.getmycall.com/http-bind', // FIXME: use xep-0156 for that

    // // The name of client node advertised in XEP-0115 'c' stanza
    // clientNode: 'http://jitsi.org/jitsimeet'
};

let connection, isJoined, room;
let localTracks = [];
let remoteTracks = {};
let icConnected = false;

class Conference extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            roomInfo: {
                roomName: "",
                userName: "",
                password: "",
                moderator: false
            },
            loading: false,
            isLoggedIn: false,
            errors: {}
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

        window.addEventListener("beforeunload", this.unload);
    }

    setConnectionListeners () {
        connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, function () {
            icConnected = true;
            message.success('connection established.');
        });
        connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_FAILED, function () {
            icConnected = false;
            message.error('connection failed.');
        });
        connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, this.disconnect);
    }

    disconnect (connection) {
        console.log('disconnect!');
        connection.removeEventListener(window.JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, function () { message.success('connection established.');});
        connection.removeEventListener(window.JitsiMeetJS.events.connection.CONNECTION_FAILED, function () { console.log('connection failed.');});
        connection.removeEventListener(window.JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, this.disconnect);
    }

    onConferenceJoined () {
        console.log('conference joined');
        message.success('conference joined');
        let userName = this.state.roomInfo && this.state.roomInfo.userName;
        room.setDisplayName(userName); //set my user name
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
        this.getLocalTracks();
        let roomName = (this.state.roomInfo && this.state.roomInfo.roomName) || "";
        room = connection.initJitsiConference(roomName, {}); //name of conference

        room.on(window.JitsiMeetJS.events.conference.TRACK_ADDED, (track) => this.onRemoteTrack(track));
        room.on(window.JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => this.onRemoveTrack(track)); //to remove track
        room.on(window.JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
            this.onConferenceJoined();
            this.setState({ isLoggedIn: true });
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
        console.log('user left => ', id,);
        if (!remoteTracks[id]) {
            return;
        }
        const tracks = remoteTracks[id];
        for (let i = 0; i < tracks.length; i++) {
            let trackId = "#" + id.toString() + tracks[i].getType().toString();
            tracks[i].detach($(`#${id}${tracks[i].getType()}`)); //must see it again
            delete tracks[trackId];
            $(trackId).parent().remove();

            $(`${participant}-li-${idx}`).parent().remove();
            $(`#${participant}audio${idx}`).parent().remove();
        }
        remoteTracks = tracks;
    }

    onLocalTracks (tracks) {
        localTracks = tracks;
        for (let i = 0; i < localTracks.length; i++) {
            localTracks[i].addEventListener(
                window.JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                audioLevel => console.log(`Audio Level local: ${audioLevel}`));
            localTracks[i].addEventListener(
                window.JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                () => console.log('local track muted'));
            localTracks[i].addEventListener(
                window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                () => console.log('local track stoped'));
            localTracks[i].addEventListener(
                window.JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
                deviceId =>
                    console.log(`track audio output device was changed to ${deviceId}`));

            console.log(localTracks[i], "current track");
            if (localTracks[i].getType() === 'video') {
                $("#large-video-div").append(
                    `<video width="100%" heigth="100%" autoplay='1' muted='true' id='localVideo${i}' />`);
                localTracks[i].attach($(`#localVideo${i}`)[0]);
            } else {
                $('body').append(
                    `<audio autoplay='1' muted='true' id='localAudio${i}' />`);
                localTracks[i].attach($(`#localAudio${i}`)[0]);
            }
            if (isJoined) {
                room.addTrack(localTracks[i]);
            }
        }
    }

    onRemoteTrack (track) {
        if (track.isLocal()) {
            return;
        }
        const participant = track.getParticipantId();

        if (!remoteTracks[participant]) {
            remoteTracks[participant] = [];
        }
        const idx = remoteTracks[participant].push(track);

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
        const id = participant + track.getType() + idx;
        console.log(remoteTracks, 'remotetracks');
        let userName = room.getParticipantById(participant)._displayName;
        if (track.getType() === 'video') {
            $('#small-videos-box').append(
                `<div class="card" style="width: 10rem; height: 9rem" id="small-video-box">
                    <video className="small-video" id='${participant}video${idx}' />
                    <div class="card-body">
                        <b id="userName">${userName}<b>
                    </div>
                </div>`
            );
        } else {
            $('#small-audios-placeholder').append(
                `<audio autoplay='1' id='${participant}audio${idx}' />`);
        }
        track.attach($(`#${id}`)[0]);

        console.log(remoteTracks, 'remotetracks');
    }

    onRemoveTrack (track) {
        if (track.isLocal()) {
            return;
        }
        const participant = track.getParticipantId();
        delete remoteTracks[participant];

        // const idx = remoteTracks[participant].push(track);
        const id = participant + track.getType() + idx;

        if (track.getType() === 'video') {
            $(`${participant}-li-${idx}`).parent().remove();
        } else {
            $(`#${participant}audio${idx}`).parent().remove();
        }
        remoteTracks[participant].detach($(`#${id}${track.getType()}`));
        delete remoteTracks[participant];
    }

    unload () {
        for (let i = 0; i < localTracks.length; i++) {
            localTracks[i].dispose();
        }
        room.leave();
        connection.disconnect();
    }

    componentWillUnmount () {
        this.unload();
        window.removeEventListener("beforeunload", this.unload);
    }

    handleChange = (event) => {
        let { roomInfo } = this.state;
        const name = event.target.name;
        const value = event.target.value;
        if (name === "moderator") {
            roomInfo[name] = !roomInfo[name];
            this.setState({ roomInfo });
        } else {
            roomInfo[name] = value;
            this.setState({ roomInfo });
        }
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

        if (!fields["userName"]) {
            formIsValid = false;
            errors["userName"] = "Cannot be empty";
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
        const { roomName, userName, password, moderator } = this.state.roomInfo;
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
                    <span className="help-block">{(errors['roomName']) ? "Please type room name" : ""}</span>
                </div>
                <div className="form-group">
                    <label htmlFor="username">User Name</label>
                    <input
                        type="username"
                        value={userName}
                        name="userName"
                        className="form-control"
                        id="user-name"
                        onChange={this.handleChange}/>
                    <span className="help-block">{(errors['userName']) ? "Please type user name" : ""}</span>
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
                    <span className="help-block">{(errors['password']) ? "Please type password" : ""}</span>
                </div>
                {/* <div className="checkbox">
                    <label>
                        <input name="moderator" value={moderator} onChange={this.handleChange} type="checkbox" /> Admin/Moderator/Teacher
                    </label>
                </div> */}
                <button disabled={!icConnected} type="button" onClick={this.handleFormSubmit.bind(this)} className="btn btn-default">{moderator ? "Create Room" : "Login"}</button>
            </form>
        </div>);
    }

    leaveRoomBtn = (e) => {
        this.unload();
        this.setState({ isLoggedIn: false });
        window.location.reload();
    }

    render () {
        const { isLoggedIn, roomInfo } = this.state;
        const { roomName, userName, moderator } = roomInfo;

        if (!roomName || !userName || !isLoggedIn) {
            return this.renderForm();
        } else {
            return (
                <div className="product-block content-container">
                    <div className="container">
                        <div className="row">
                            <div className="col-md-8 large-video-container">
                                <div className="row" id="large-video-div" width="100%" height="100%">
                                    <div className="btnStop" onClick={this.leaveRoomBtn.bind(this)} style={{ backgroundImage: `url(${stopIcon})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }} />
                                </div>
                                <div width="0" height="0" id="large-div-audio" />
                            </div>
                            <div className="col-md-4">
                                <div className="row">
                                    <div className="col-md-12">
                                        <video width="350" height="189" controls>
                                            <source src="" type="video/mp4" />>
                                            <source src="" type="video/ogg" />
                                        </video>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-12">
                                        <video width="350" height="189" controls>
                                            <source src="" type="video/mp4" />>
                                            <source src="" type="video/ogg" />
                                        </video>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="container row" id="small-videos-box" />
                    <div id="small-audios-placeholder" />
                </div>

            );
        }
    }
}

export default Conference;
