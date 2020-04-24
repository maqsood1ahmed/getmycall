/* eslint-disable */
import React from 'react';
import queryString from 'query-string';

import { message, Select, Button  } from 'antd';
// import LoadingSpinner from '../../components/UI/Spinner/Spinner';
import './Conference.css';

import startIcon from './assets/img/start.png';
import stopIcon from './assets/img/stop.png';
import micOn from './assets/img/mic-on.svg';
import micOff from './assets/img/mic-off.svg';
import iconSwap from './assets/img/swap_video.png'

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

const jitsiInitOptions = {
    disableAudioLevels: true,

    // The ID of the jidesha extension for Chrome.
    desktopSharingChromeExtId: 'mbocklcggfhnbahlnepmldehdhpjfcjp',

    // Whether desktop sharing should be disabled on Chrome.
    desktopSharingChromeDisabled: false,

    // The media sources to use when using screen sharing with the Chrome
    // extension.
    desktopSharingChromeSources: [ 'screen', 'window' ],

    // Required version of Chrome extension
    desktopSharingChromeMinExtVersion: '0.1',

    // Whether desktop sharing should be disabled on Firefox.
    desktopSharingFirefoxDisabled: false
};

var connection, isJoined, room;
var screenConnection, isScreenJoined, screenRoom;

let allParticipants = {};

let isConnected = false;

class Conference extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            roomInfo: {
                roomName: "",
                userName: "", 
                rollNo: "",
                password: "",
                moderator: false
            },
            loading: false,
            isLoggedIn: false,
            errors: {},
            isTrackUpdate: false,
            resolutions: [ "180", "360", "720", "1080" ],
            roomData: {},
            isLocalAudioMute: false,
            remoteUserSwappedId: null,
            isScreenSharing: false,
            isStopped: false
        };

        if (window.performance) {
            if (performance.navigation.type === 1) {
                this.state.jitsiMeetClient && this.state.jitsiMeetClient.leaveRoom();
            }
        }
    }
    componentDidMount () {
        let roomData = {};
        if( this.props.roomData === '' ) {
            roomData= queryString.parse(window.location.search.substring(1));
            roomData['sources'] = roomData['sources'] && JSON.parse(roomData['sources']);
        } else {
            if( this.props.roomData !== '' ) {
                roomData= queryString.parse( this.props.roomData );
                roomData['sources'] = roomData['sources'] && JSON.parse(roomData['sources']);
            }
        }
        console.log(roomData, "roomData");
        this.setState({ roomData });

        if ( roomData.room && roomData.id && roomData.name && roomData.type && 
                roomData.sources && ( roomData.sources.length > 0 ) && 
                this.handleDataValidation( roomData ) ) {

            let userSession = {
                position: roomData.position,
                name: roomData.name,
                type: roomData.type,
                tracks: [],
                screenTracks: [],
                bitrate: (roomData.bitrate ? roomData.bitrate : (roomData.type === 'teacher' ? '1080' : '180')),
                isMute: (roomData.type === 'teacher' ? false : true)
            }

            allParticipants[roomData.id] = userSession;

            window.JitsiMeetJS.init();
            connection = new window.JitsiMeetJS.JitsiConnection(null, null, options);
            this.setConnectionListeners();
            connection.connect();
    
            window.addEventListener(window.JitsiMeetJS.errors.conference.PASSWORD_REQUIRED, function () { message.error('Please provide room password'); });

            window.addEventListener("beforeunload", this.unload);
        } else {
            message.error('Must provide valid room data! See console errors.');
        }
    }

    componentDidUpdate () {
        if ( this.state.isTrackUpdate ) {
            this.setState({ isTrackUpdate : false }); //setting false for new tracks update

            let allParticipantsIds = Object.keys( allParticipants );
            allParticipantsIds.forEach( participantId => {
                let participant = allParticipants[participantId];
                let participantTracks = participant.tracks;
                if ( (participant.position).toString() === "0" ) {
                    for ( let i = 0; i < participantTracks.length ; i++ ) {
                        let largeVideoTag = document.getElementById(`teacher-video-tag`);
                        let largeAudioTag = document.getElementById(`teacher-audio-tag`);
            
                        if( participantTracks[i].getType() === 'video' ) {
                            if( largeVideoTag ) {
                                participantTracks[i].attach($(`#teacher-video-tag`)[0]);
                            }
                        } else if ( largeAudioTag ) {
                            // console.log('is teacher mute? => => ', participantTracks[i].isMuted());
                            participantTracks[i].attach($(`#teacher-audio-tag`)[0]);
                        }
                    }
                } else { //if position not zero then map all other as small videos 
                    for ( let i = 0; i < participantTracks.length ; i++ ) {
                        if (participantTracks[i].getType() === 'video') {
                            participantTracks[i].attach($(`#video-tag-${participant.position}`)[0]);
                            let name = participant.name;
                            if ( name === this.state.roomData.name ) {
                                name = name + "(me)"
                            }
                            if ( name ) {
                                $(`#name-box-${participant.position} h6`).text(name);
                            }
                        } else {
                            // console.log('is this remote track mute? => => ', participantTracks[i].isMuted());
                            participantTracks[i].attach($(`#audio-tag-${participant.position}`)[0]);
                        }
                    }
                }
            });
        }
    }

    setConnectionListeners ( isScreen = false ) {

        if ( !isScreen ) {
            connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
                isConnected = true;
                message.success('connection established.');
                setTimeout(()=>{
                    this.joinRoom();
                }, 1000)
            });
            connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_FAILED, function () {
                isConnected = false;
                message.error('connection failed.');
            });
            connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,() => this.disconnect());
        } else {
            screenConnection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
                isConnected = true;
                setTimeout(()=>{
                    this.joinRoom( true );
                }, 1000)
            });
        }

    }

    disconnect () {
        console.error('disconnect!');
        this.unload();
        this.setState({ isLoggedIn: false });
        // window.location.reload();
    }

    onConferenceJoined ( isScreen = false) {
        if ( !isScreen ) {
            message.success('conference joined');
            let userId = this.state.roomData.id;
            let userName = this.state.roomData.name;
            let type = this.state.roomData.type;
            let position = this.state.roomData.position;
            let uid = "";
    
            uid = userId + "###" + userName + "###" + type + "###" + position;
    
            room.setDisplayName(uid); //setting display name (consist id, name and type of user its trick to pass userId, and type)
            let myRole = room.getRole(); //get my role
    
            if (myRole === "moderator") {
                message.info("You are moderator of the Conference.", 5);
            }
            isJoined = true;
            let localTracks = allParticipants[this.state.roomData.id].tracks;
            for (let i = 0; i < localTracks.length; i++) {
                room.addTrack(localTracks[i]);
            }
        } else {
            let userId = this.state.roomData.id;
            let userName = this.state.roomData.name;
            let type = this.state.roomData.type;
            let position = "9999";  //just like for teacher we set "0" so for screen we set "9999"
            let uid = "";
    
            uid = userId + "###" + userName + "###" + type + "###" + position;
    
            screenRoom.setDisplayName(uid); //setting display name (consist id, name and type of user its trick to pass userId, and type)

            isScreenJoined = true;
            let screenTracks = allParticipants[this.state.roomData.id]['screenTracks'];
            for (let i = 0; i < screenTracks.length; i++) {
                screenRoom.addTrack(screenTracks[i]);
            }
        }

    }

    joinRoom ( isScreen = false) {
        let roomData = this.state.roomData;
        let roomName = roomData.room;
        console.log('room join data name => => ', roomData);

        if ( !isScreen ) {
            room = connection.initJitsiConference( roomName, {} ); //name of conference

            room.on(window.JitsiMeetJS.events.conference.TRACK_ADDED, (track) => this.onRemoteTrack(track));
            room.on(window.JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => this.onRemoveTrack(track)); //to remove track
            room.on(window.JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
                this.onConferenceJoined();
                this.setState({ isLoggedIn: true });
                this.getLocalTracks();
            });
            room.on(window.JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED, (id) => {
                console.log('==> teacher display name changed', id)
                let roomParticipant = room.getParticipantById(id)
                let userInfo = roomParticipant ? (roomParticipant._displayName ? roomParticipant._displayName.split('###') : null) : null;
                console.log(userInfo,"=> => display changed")
                message.info(displayName)
            })
            room.on(window.JitsiMeetJS.events.conference.USER_LEFT, id=>this.onUserLeft(id)); //user left
    
            room.join();
    
            let bitRate = roomData.bitrate ? roomData.bitrate : ( roomData.type==="teacher" ? "1080" : "180" );
            room.setReceiverVideoConstraint(bitRate);
        } else {
            screenRoom = screenConnection.initJitsiConference( roomName, {} ); //name of conference
            screenRoom.on(window.JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
                this.onConferenceJoined( true );
                this.getScreenTracks();
            });
                
            screenRoom.join();
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
    onUserLeft (participantId) {
        let roomParticipant = room.getParticipantById(participantId)
        let userInfo = roomParticipant ? (roomParticipant._displayName ? roomParticipant._displayName.split('###') : null) : null;
        console.log('user left => =>', participantId, userInfo)
        if ( userInfo ) {
            let id = userInfo[0];
            let position = userInfo[3];
            let tracks = allParticipants[id].tracks;
            if ( tracks[0] ) {
                for( let i; i< tracks.length ; i++){
                    let track = tracks[i];
                    if (track.getType() === 'video') {
                        track.detach($(`#video-tag-${position}`));
                        $(`#video-tag-${position}`).attr('poster', 'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU');
                    } else {
                        track.detach($(`#audio-tag-${position}`));
                    }
                }
            }
            delete allParticipants[id];
            this.setState({ isTrackUpdate: true })
        }
    }

    onLocalTracks (tracks) {
        for (let i = 0; i < tracks.length; i++) {
            tracks[i].addEventListener(
                window.JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                audioLevel => console.log(`Audio Level local: ${audioLevel}`));
            tracks[i].addEventListener(
                window.JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                (track) => { 
                    if( track.getType() === "audio") {
                        console.log('local track new audio status => =>', track.isMuted())
                        this.setState({ isLocalAudioMute : track.isMuted() });
                    }
                }) //use it to show whether user muted or not
            tracks[i].addEventListener(
                window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                () => console.log('local track stoped'));
            tracks[i].addEventListener(
                window.JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
                deviceId =>
                    console.log(`track audio output device was changed to ${deviceId}`));

            allParticipants[this.state.roomData.id]["tracks"].push(tracks[i])
            if (isJoined) {

                if ( this.state.roomData.type !== "teacher" ) {
                    tracks.forEach(track=> {
                        if ( track.getType() === "audio" ) {
                            track.mute();
                        }
                    })
                }
                room.addTrack(tracks[i]);
            }
            this.setState({ isTrackUpdate: true });
        }
    }

    onRemoteTrack (track) {
        if (track.isLocal()) {
            return;
        }
        const participant = track.getParticipantId();

        let userInfo = room.getParticipantById(participant);
        if ( !userInfo._displayName ) {
            return;
        } else {
            userInfo = room.getParticipantById(participant)._displayName.split('###');
        }
        let id = userInfo[0];
        let name = userInfo[1];
        let type = userInfo[2];
        let position = userInfo[3];

        if ( id.toString() === (this.state.roomData.id).toString()) {
            return;
        }

        console.log('got remote user info => =>', userInfo, track);
        if ( position === "9999") {
            let screenVideo = $(`#teacher-screen-share-video`)[0];
            track.attach(screenVideo);
            $(screenVideo).on({
                mouseenter: function () {
                  screenVideo.setAttribute("controls","controls")
                },
                mouseleave: function () {
                  screenVideo.removeAttribute("controls");
                }
            });
        } else {
            if ( !allParticipants[id] ) {
                let newParticipant = {};
                newParticipant['name'] = name;
                newParticipant['type'] = type;
                newParticipant['position'] = position.toString();
                newParticipant['tracks'] = [];
                newParticipant['tracks'].push(track);
                allParticipants[id] = newParticipant;
            } else if ( !allParticipants[id]['tracks'][0] ) {
                allParticipants[id]['tracks'] = [];
                allParticipants[id]['tracks'].push(track);
            } else {
                allParticipants[id]['tracks'].push(track);
            }
    
            track.addEventListener(
                window.JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                audioLevel => console.log(`Audio Level remote: ${audioLevel}`));
            track.addEventListener(
                window.JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                () => this.onRemoteTrackMute(id, track));
            track.addEventListener(
                window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                () => console.log('remote track stoped'));
            track.addEventListener(
                window.JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
                deviceId => console.log(`track audio output device was changed to ${deviceId}`));
    
            this.setState({ isTrackUpdate: true });
        }
    }

    onRemoteTrackMute = ( id, track ) => {
        if ( allParticipants[id] && allParticipants[id].name ) {
            message.info(`${allParticipants[id].name} ${track.isMuted() ? " Mic Off" : " Mic On"}`, 3)
        }
        console.log('=> => remote track muted', id);
    }

    onRemoveTrack (track) {
        if (track.isLocal()) {
            return;
        }
        const participantId = track.getParticipantId();

        let roomParticipant = room.getParticipantById(participantId)
        let userInfo = roomParticipant ? (roomParticipant._displayName ? roomParticipant._displayName.split('###') : null) : null;
        if ( userInfo ) {
            let id = userInfo[0];
            let position = userInfo[3];
            let participant = allParticipants[id];
    
            if ( participant.tracks ) {
                let tracks = participant.tracks;
                tracks.forEach(( track, index ) => {
                    if (track.getType() === 'video') {
                        track.detach($(`#video-tag-${position}`));
                    } else {
                        track.detach($(`#audio-tag-${position}`));
                    }
                    delete allParticipants[id][index];
                })
            }
        }
    }

    unload () {
        let localTracks = allParticipants[this.state.roomData.id]['tracks'];
        for (let i = 0; i < localTracks.length; i++) {
            localTracks[i].dispose();
        }
        room.leave();
        connection.disconnect();
    }

    componentWillUnmount () {
        if ( connection && room ) {
            this.unload();
            window.removeEventListener("beforeunload", () => this.unload());
        }
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

    handleDataValidation = ( roomData ) => {
        let fields = roomData;
        let dataIsValid = true;

        if (!fields["room"]) {
            dataIsValid = false;
            console.error("please provide room name");
        }

        if (!fields["room"].match(/^[a-z0-9]+$/)) {
            dataIsValid = false;
            console.error('room name should must contain small characters or numbers!')
        }

        if (!fields["name"]) {
            dataIsValid = false;
            console.error("user name cannot be empty!")
        }

        if (!fields["id"]) {
            dataIsValid = false;
            console.error("id cannot be empty!")
        }

        if (!fields["type"]) {
            dataIsValid = false;
            console.error("Please provide user type teacher or student!")
        }

        if( !fields["sources"] || fields["sources"].length < 1 ) {
            dataIsValid = false;
            console.error("Please provide sources list!");
        }

        return dataIsValid;
    }

    handleChangeResolutions = (value) => {
        room.setReceiverVideoConstraint(value);
        message.success(`Resolution Changed to ${value}`)
    }

    leaveRoomBtn = (e) => {
        this.unload();
        this.setState({ isLoggedIn: false, isStopped: true });
        // window.location.reload();
    }

    toggleAudio = async ( sourceId, isMute ) => {
        console.log('local track old audio status => =>', isMute)
        let tracks = [];
        Object.keys(allParticipants).forEach(id => {
            if ( id === sourceId ) {
                tracks = allParticipants[id].tracks;
                tracks.forEach( track=> {
                    if( track.getType() === 'audio' ) {
                        if ( isMute ) {
                            track.unmute()
                        } else {
                            track.mute();
                        }                        
                    }
                });
            }
        })
    }
    
//remote user id

    swapVideo = ( source ) => {
        console.log('change this source with teacher video div => => ', source);
        // *** source id used to swap with teacher div
        
        let sourceId = source.id;
        let sourcePosition = source.position;
        let roomData = this.state.roomData;

        if ( sourceId === roomData.id ) {  //or sources[0]/allparticipants[].type==="teacher" for remote user
            allParticipants[sourceId].position = "0";  //revert teacher position to 0
            allParticipants[this.state.remoteUserSwappedId].position = sourcePosition;  //revert student position to curent teacher position
            
            roomData.sources = roomData.sources.map(source => {
                if ( source.id === this.state.remoteUserSwappedId ) {
                    source.position = sourcePosition;  //revert student back positiion 
                    return source;
                } else if ( source.id === roomData.id ) {
                    source.position = "0";  //revert teacher back to 0 in sources
                    return source;
                }
                return source;
            });
            this.setState({ roomData, isTrackUpdate: true, remoteUserSwappedId: null });
        } else {
            if ( allParticipants[sourceId] ) {
                roomData.sources = roomData.sources.map(source => {
                    if ( source.id === sourceId ) {
                        source.position = "0";
                        return source;
                    } else if ( source.id === roomData.id ) {  //because swap only available for teacher so teacher id is in state
                        source.position = sourcePosition;
                        return source;
                    }
                    return source;
                });
    
                Object.keys(allParticipants).forEach( id => {
                    if ( id === sourceId ) {
                        allParticipants[sourceId].position = "0";  //change remoted user position to 0 in place of teacher
                    } else if ( allParticipants[id].type === "teacher" ) {
                        allParticipants[id].position = sourcePosition; //relocate teacher position to student div
                    }
                });

                //send display name change to all other participant
                this.swapVideoDispayChangeForTeacher( sourcePosition, sourceId )
    
                console.log('all participant and sources => => ', allParticipants, roomData);
                this.setState({ roomData, isTrackUpdate: true, remoteUserSwappedId: sourceId });
            }
        }
    }

    swapVideoDispayChangeForTeacher = ( positionSwapped, swappedWith ) => {
        let userId = this.state.roomData.id;
        let userName = this.state.roomData.name;
        let type = this.state.roomData.type;
        let position = positionSwapped;
        let uid = "";

        uid = userId + "###" + userName + "###" + type + "###" + position + "###" + swappedWith;

        room.setDisplayName(uid);
    }

    getScreenTracks () {
        window.JitsiMeetJS.createLocalTracks({ devices: ['screen', 'desktop'] })
            .then((tracks) => {
                this.onScreenTracks(tracks);
                this.setState({ isScreenSharing: true })
            })
            .catch(error => {
                throw error;
            });
    }
    onScreenTracks ( tracks ) {
        for (let i = 0; i < tracks.length; i++) {
            tracks[i].addEventListener(
                window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                () => {
                    console.log('screen share stopped! => =>');
                    this.setState({ isScreenSharing: false })
                });
            allParticipants[this.state.roomData.id]["screenTracks"].push(tracks[i]);
            if ( isScreenJoined ) {
                let screenVideo = $(`#teacher-screen-share-video`)[0];
                tracks[i].attach(screenVideo)
                screenRoom.addTrack(tracks[i]);
                $(screenVideo).on({
                    mouseenter: function () {
                      screenVideo.setAttribute("controls","controls")
                    },
                    mouseleave: function () {
                      screenVideo.removeAttribute("controls");
                    }
                });
            }
        }
    }

    //jitsi supports only one video track at a time so we creating new connection for screen share separately
    handleScreenShareButton = ( isScreenSharing ) => {
        if ( !isScreenSharing ) {
            // window.JitsiMeetJS.init(jitsiInitOptions); 
            screenConnection = new window.JitsiMeetJS.JitsiConnection(null, null, options);

            this.setConnectionListeners( true );
            screenConnection.connect();
        }
    }

    render () {
        console.log('all participant => => ', allParticipants)
        const { isLoggedIn, roomData } = this.state;
        const { room, id, name, type } = roomData;

        const customStyle = {
            largeVideoPoster: {
                backgroundImage: "url(" + "https://www.clipartmax.com/png/middle/148-1488113_teachers-icon-teachers-png.png" + ")",
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat'
            }
        }

        if ( !id || !room || !name || !type ) {
            return <div className="container" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
                <p style={{ fontSize: "35px", color: "#ff4d4f" }}>Please provide room info</p>
            </div>
        } else if ( !isLoggedIn ) {
            return <div className="container" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
                {this.state.isStopped && <p style={{ fontSize: "35px", color: this.state.isStopped? "red" : "black" }}> Stopped! </p>}
                {/* {this.state.isStopped && <Button onClick={()=> this.joinRoom()} type="primary"> Join Again </Button>} */}
            </div>
        } else {
            return (
                <div className="container">
                    <div className="row w-100 h-100 p-3" id="teacher-container">
                        <div className="col-md-8 col-sm-12 col-xs-12 w-100 h-100 p-3" id="large-video-container">
                            <video id="teacher-video-tag" autoPlay width="100%" height="100%" style={ customStyle.largeVideoPoster } /> 
                            <audio autoPlay width="0%" height="0%" id="teacher-audio-tag"></audio>
                            { (type === "teacher") &&
                                <Select
                                    defaultValue={this.state.resolutions[3]}
                                    // style={{ width: 80 }}
                                    onChange={(value) => this.handleChangeResolutions(value)}
                                >
                                {this.state.resolutions.map(resolution => (
                                    <Option key={resolution}>{resolution}</Option>
                                ))}
                                </Select>
                            }
                            <div id="large-video-actions-box" className="row w-20 h-10" style={{ background: (type==="teacher" ? "rgba(255, 255, 255, 0.301)": "none")}}>
                                {(allParticipants[id]['type'] === "teacher") && <div onClick={() => this.toggleAudio( id, this.state.isLocalAudioMute )} style={{ backgroundImage: `url(${this.state.isLocalAudioMute?micOff:micOn})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', width: "35px", height: "35px", cursor: "pointer" }} />}
                                <div onClick={this.leaveRoomBtn.bind(this)} style={{ backgroundImage: `url(${stopIcon})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', marginLeft: "8px", width: "40px", height: "40px", cursor: "pointer" }} />                            
                            </div>
                        </div>
                        <div className="col-md-4 col-sm-4 col-xs-8 container w-100 h-100 p-3" id="teacher-dashboard">
                            <video  autoPlay width="100%" height="49%" controls>
                            {/* // width="350" height="199" controls> */}
                                <source src="" type="video/mp4" />>
                                <source src="" type="video/ogg" />
                            </video>
                            
                            <div style={{ width: "100%", height: "49%", position: "relative" }}>
                                <video id="teacher-screen-share-video" autoPlay poster="https://cdn.pixabay.com/photo/2017/08/08/18/11/mockup-2612145_960_720.png" width="100%" height="100%" >
                                {/* // width="350" height="199" controls> */}
                                    <source src="" type="video/mp4" />>
                                    <source src="" type="video/ogg" />
                                </video>
                                {(type === "teacher") &&<div className="btn-start-screen" onClick={() => this.handleScreenShareButton(this.state.isScreenSharing)} style={{ backgroundImage: `url(${!this.state.isScreenSharing && startIcon})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', pointerEvents: "all", opacity: "1" }} />}
                            </div>
                            
                        </div>
                    </div>
                    <div className="row w-100 p-3 justify-content-center" id="small-videos-box">
                        {
                            this.state.roomData && this.state.roomData.sources && (this.state.roomData.sources.length > 1) &&
                            this.state.roomData.sources.map(source => {
                                // let isMute = source.isMute === "true" ? true : false;
                                // let isMe = ( source.id === this.state.roomData.id ) ? true : false;
                                if( source.position.toString() !== "0" ) {
                                    let sourceUserId = source.id;
                                    return (
                                        <div className="student-small-video" id={`student-box-${source.position}`}>
                                            <div id={`video-box-${source.position}`}>
                                                <video id={`video-tag-${source.position}`} autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                                {type==="teacher" && allParticipants[sourceUserId] && <div className="btn-swap-video" onClick={() => this.swapVideo( source )} style={{ backgroundImage: `url(${iconSwap})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', pointerEvents: "all", opacity: "1" }} />}
                                                {/* <div className="btn-mute-unmute" onClick={() => this.toggleAudio( source, isMute )} style={{ backgroundImage: `url(${isMute?micOff:micOn})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', pointerEvents: "none", opacity: "0.5" }} /> */}
                                                <audio autoPlay id={`audio-tag-${source.position}`} />
                                            </div>
                                            <div className="student-name" id={`name-box-${source.position}`}>
                                                <h6 className="student-name-text" align="center">Student Name</h6>
                                            </div>
                                        </div>
                                    )
                                }
                            })
                        }
                    </div>
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