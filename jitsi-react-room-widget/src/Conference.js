/* eslint-disable */
import React from 'react';
import queryString from 'query-string';
import axios from  'axios';

import { message, Select  } from 'antd';
import socketIOClient from "socket.io-client";
// import LoadingSpinner from '../../components/UI/Spinner/Spinner';
import './Conference.css';

import startIcon from './assets/img/start.png';
import stopIcon from './assets/img/stop.png';
import micOn from './assets/img/mic-on.svg';
import micOff from './assets/img/mic-off.svg';
import iconSwap from './assets/img/swap_video.png'
import loadingIcon from './assets/img/loading-icon.gif';
import swapTeacherSourcesIcon from './assets/img/swap-teacher-sources.png';
import videoSolidIcon from './assets/img/video-solid.svg';
import videoSlashIcon from './assets/img/video-slash-solid.svg';

// import teacherBoardLoader from './assets/img/teacher-board-loader.gif';

const { Option } = Select;
const staticServerURL = "https://api.getmycall.com";

const options = {
    hosts: {
        domain: 'dev.getmycall.com', 
        muc: 'conference.dev.getmycall.com' // FIXME: use XEP-0030
    },
    bosh: 'https://dev.getmycall.com/http-bind', // FIXME: use xep-0156 for that

    // The name of client node advertised in XEP-0115 'c' stanza
    clientNode: 'http://jitsi.org/jitsimeet'
};

const jitsiInitOptions = {
    disableAudioLevels: true,

    // The ID of the jidesha extension for Chrome.
    // desktopSharingChromeExtId: 'mbocklcggfhnbahlnepmldehdhpjfcjp',

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
var socket;

let allParticipants = {};

let isConnected = false;

class Conference extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            loading: false,
            isLoggedIn: false,
            errors: {},
            isTrackUpdate: false,
            isScreenTrackUpdate: false,
            resolutions: [ "180", "360", "720", "1080" ],
            roomData: {},
            isLocalAudioMute: false,
            isLocalVideoMute: false,
            remoteUserSwappedId: null,
            isScreenSharing: false,
            isStopped: false,
            selectedBoard: null,
            socketEndpoint: `${staticServerURL}/class-rooms`,
            currentTeacherToggledView: 'video'  //three types 1=>video(video at center), 2=>screen and 3=>html
        };

        socket = socketIOClient(this.state.socketEndpoint);
        this.addSocketEvents();
    }
    async componentDidMount () {
        let roomData = {};

        let params = null;//this.props.params;
        if ( !params ) { //temporary for testing
            params= queryString.parse(window.location.search.substring(1));
        }
        console.log('params => =>', params);

        if ( params.id && params.type && params.class_id ) {
            let response = await this.getUserData(params);
            console.log('=> => respone ', response)
            let roomId = params.class_id;
            let type = params.type;
            if ( response.status && response.data && response.data.data ) {
                roomData = response.data && response.data.data;
                roomData.roomId = roomId;
                roomData.type = type;
                if ( roomId && roomData.id && roomData.name && roomData.type && 
                    roomData.sources && ( roomData.sources.length > 0 ) && 
                    this.handleDataValidation( roomData ) ) {
                        
                    let userSession = {
                        name: roomData.name,
                        roomId: roomData.roomId,
                        position: roomData.position,
                        type: roomData.type,
                        tracks: [],
                        screenTracks: [],
                        bitrate: (roomData.bitrate ? roomData.bitrate : (roomData.type === 'teacher' ? '720' : '180')),
                        isMute: roomData.mute
                    }
        

                    // //***change teacher id later in both if and else block currenlty using manually
                    // //*** its related to sources */
                    let id = roomData.id; //in case of student add without change
                    // if ( roomData.type === "teacher" ) {
                    //     id = '012'; //***allparticipants teacher //teachers id should not match with student id
                    //     roomData.id = '012'
                    //     // assign position 0 to teacher for so we can swap any user with position 0 and asign user position to teacher
                    //     roomData.sources.push({ id: '012', position: "0", name: roomData.name })  //***teacher sources */
                    // } else {
                    //     //id = roomData.id;
                    //     // assign position 0 to teacher for so we can swap any user with position 0 and asign user position to teacher
                    //     roomData.sources.push({ id: '012', position: "0", name: "teacher_name" }) //*** student sources */
                    // }
                    allParticipants[id] = userSession;
        
                    var messageObj = {
                        type: 'joinRoom',
                        data: { //store user data at socket server as well
                            id: id, //userId
                            roomId: roomId,
                            name: roomData.name,
                            type: roomData.type,
                            position: roomData.position,
                            bitrate: roomData.bitrate,
                            isMute: roomData.mute
                        }
                    };
                    socket.emit('event', messageObj);
        
                    window.JitsiMeetJS.init(jitsiInitOptions);
                    connection = new window.JitsiMeetJS.JitsiConnection(null, null, options);
                    this.setConnectionListeners();
                    connection.connect();
            
                    // window.addEventListener(window.JitsiMeetJS.errors.conference.PASSWORD_REQUIRED, function () { message.error('Please provide room password'); });
                    this.setState({ roomData });
                } else {
                    message.error('Must provide valid user params! See console errors.');
                }
            }
        }
        let $ = window.jQuery;
        $(window).bind('beforeunload', this.unload.bind(this));
        $(window).bind('unload', this.unload.bind(this));
    }
    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error(error, errorInfo);
    }

    handleLeavePage(e) {
        window.alert('changing')
        const confirmationMessage = 'Some message';
        e.returnValue = confirmationMessage;     // Gecko, Trident, Chrome 34+
        return confirmationMessage;              // Gecko, WebKit, Chrome <34
    }
    async getUserData( params,  ) {
        console.log(params , 'params => =>')
        try {
          const response = await axios.get('https://wfh.wnets.net/api.php', { params });
          console.log('user api response => =>', response);
          if ( response.status ) {
              return {
                  status: true,
                  data: response.data
              }
          } else {
            return {
                status: false,
                data: response.data
            }
          }
        } catch (error) {
            message.error('something went wrong when fetching user data.');
            console.error('something went wrong when fetching user data. => ', error);
            return {
                status: true,
                error: error
            }
        }
    }

    addSocketEvents = () => {
        socket.on('event', (messageObj) => {
            console.log(messageObj, 'message from server. => =>');
            let type = messageObj.type;
            let data = messageObj.data;
            switch ( type ) {
                case 'newUser':
                    console.log('new user joining room => ', data);
                    break;
                case 'roomJoinResponse':
                    console.log('successfully joined socket room =>', data);
                    break;
                case 'video-swapped-from-server':
                    console.log('video swapped from server', data)
                    this.swapVideo( data.selectedSource , data.teacherId, data.remoteUserSwappedId );
                    break;
                case 'teacher-view-change':
                    this.toggleTeacherView( data.currentTeacherToggledView );
                    break;
                case 'message-undefined':
                    console.error('socketio server message type undefined!') 
                    break;
                case 'error':
                    console.log('error when processing socketio request => ', data.error)
                default:
                    console.error('socketio server message type undefined!', data);
            }
        });
    }

    componentDidUpdate () {
        let { isTrackUpdate, isScreenTrackUpdate } = this.state;
        if ( isTrackUpdate || isScreenTrackUpdate ) {
            let allParticipantsIds = Object.keys( allParticipants );
            allParticipantsIds.forEach( participantId => {
                let participant = allParticipants[participantId];
                let participantTracks = participant.tracks;

                if ( isTrackUpdate ) {
                    if ( (participant.position).toString() === "0" && isTrackUpdate ) {
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
                                // if ( name === this.state.roomData.name ) {
                                //     name = name + "(me)"
                                // }
                                if ( name ) {
                                    $(`#name-box-${participant.position} h6`).text(name);
                                }
                            } else {
                                // console.log('is this remote track mute? => => ', participantTracks[i].isMuted());
                                participantTracks[i].attach($(`#audio-tag-${participant.position}`)[0]);
                            }
                        }
                    }
                    this.setState({ isTrackUpdate: false });
                }

                let screenTracks = participant.screenTracks;
                if ( screenTracks[0] && this.state.isScreenTrackUpdate ) {
                    this.setState({ isScreenTrackUpdate: false });
                    screenTracks.forEach( track => {
                        let screenVideo = $(`#teacher-screen-share-video`)[0];
                        track.attach(screenVideo)
                        if ( screenRoom && this.state.roomData.type === "teacher" ) {
                            screenRoom.addTrack(track);
                        }
                    })
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
                console.info("You are moderator of the Conference.");
            }
            isJoined = true;
            console.log('all participants before setting localtracks => => ', allParticipants)
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
        let roomId = roomData.roomId;
        console.log('room join data name => => ', roomData);

        if ( !isScreen ) {
            room = connection.initJitsiConference( roomId, {} ); //name of conference

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
                message.info(userInfo[1]);
            })
            room.on(window.JitsiMeetJS.events.conference.USER_LEFT, id=>this.onUserLeft(id)); //user left
    
            room.join();
    
            let bitrate = roomData.bitrate ? roomData.bitrate : ( roomData.type==="teacher" ? "720" : "180" );
            room.setReceiverVideoConstraint(bitrate);
        } else {
            screenRoom = screenConnection.initJitsiConference( roomId, {} ); //name of conference
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
                if ( error.name === window.JitsiMeetJS.errors.track.PERMISSION_DENIED ) {
                    message.error('Please enable camera/microphone then refresh the page.', 10)
                }
                console.error("local tracks error => ", error);
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
                    } else if( track.getType() === "video") {
                        console.log('local track new video status => =>', track.isMuted())
                        this.setState({ isLocalVideoMute : track.isMuted() });
                    }
                }) //use it to show whether teacher muted or not
            tracks[i].addEventListener(
                window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                () => console.log('local track stoped'));
            tracks[i].addEventListener(
                window.JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
                deviceId =>
                    console.log(`track audio output device was changed to ${deviceId}`));

            allParticipants[this.state.roomData.id]["tracks"].push(tracks[i])
            if (isJoined) {

                // if ( this.state.roomData.mute !== "teacher" ) {
                tracks.forEach(track=> {
                    if ( track.getType() === "audio" ) {
                        this.state.roomData.mute === "1" && track.mute();
                    }
                })
                // }
                room.addTrack(tracks[i]);
            }

            // let roomData = this.state.roomData;

            // if ( this.state.roomData.type === "teacher" ) {  //updating teacher id when teacher joined on student page
            //     roomData.sources = roomData.sources.map(source => {
            //         if ( source.position === "0" ) {
            //             source.id = "teacher" + this.state.roomData.id;
            //             return source;
            //         }
            //         return source;
            //     })
            // }
            
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
            allParticipants[id] && allParticipants[id]['screenTracks'].push(track);
            this.setState({ isScreenTrackUpdate: true })
        } else {
            if ( !allParticipants[id] ) {
                let newParticipant = {};
                newParticipant['name'] = name;
                newParticipant['type'] = type;
                newParticipant['position'] = position.toString();
                newParticipant['tracks'] = [];
                newParticipant['screenTracks'] = [];
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
            if ( track.getType() === "audio" ) {
                message.info(`${allParticipants[id].name} ${track.isMuted() ? " Mic Off" : " Mic On"}`);
            } else if ( track.getType() === "video" ) {
                message.info(`${allParticipants[id].name} ${track.isMuted() ? " Video Off" : " Video On"}`);
                if ( allParticipants[id].type==="teacher" ) {
                    document.getElementById("teacher-video-tag").load();
                } else {
                    document.getElementById(`video-tag-${allParticipants[id].position}`).load();
                }
            }
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
            console.log('id => => ', id)
            let id = userInfo[0];
            let position = userInfo[3];
            
            let participant = allParticipants[id];
    
            if ( participant['localTracks'] ) {
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
        let id = this.state.roomData.id;
        if (allParticipants[id]) {
            let localTracks = allParticipants[id]['tracks'];
            for (let i = 0; i < localTracks.length; i++) {
                localTracks[i].dispose();
            }
            room.leave();
            connection.disconnect();
        }
    }

    componentWillUnmount () {
        if ( connection && room ) {
            this.unload();
        }
    }

    // handleChange = (event) => {
    //     let { roomInfo, errors } = this.state;
    //     const name = event.target.name;
    //     const value = event.target.value;

    //     if (name === "moderator") {
    //         roomInfo[name] = !roomInfo[name];
    //     } else if (name === "rollNo") {
    //         const regex = /^[0-9\b]+$/;
    //         if (value === "" || regex.test(value)) {
    //             roomInfo[name] = value;
    //         } else {
    //             errors["rollNo"] = "Roll Number must be integer";
    //             this.setState({ errors })
    //         }
    //     } else {
    //         roomInfo[name] = value; 
    //     }
    //     this.setState({ roomInfo });
    // }

    handleDataValidation = ( roomData ) => {
        let fields = roomData;
        let dataIsValid = true;

        if (!fields["roomId"]) {
            dataIsValid = false;
            console.error("please provide room id");
        }

        if (!fields["roomId"].match(/^[a-z0-9]+$/)) {
            dataIsValid = false;
            console.error('room id should must contain small characters or numbers!')
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
    }

    toggleLocalSource = async ( sourceId, isMute, sourceType ) => {
        console.log('local track old status => =>', sourceType, isMute);
        let tracks = [];
        Object.keys(allParticipants).forEach(id => {
            if ( id === sourceId ) {
                tracks = allParticipants[id].tracks;
                tracks.forEach( track=> {
                    if( track.getType() === sourceType ) {
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

    swapVideo = ( source, teacherId, remoteUserSwappedId ) => {
        try {
            console.log('change this source with teacher video div => => ', this.state.roomData.sources, teacherId, remoteUserSwappedId);
            // *** source id used to swap with teacher div
            
            remoteUserSwappedId = remoteUserSwappedId ? remoteUserSwappedId : this.state.remoteUserSwappedId; //in case of student pass through params.
            //send source, teacherId, remoteUserSwappedId
            //remote student have allParticipants, sources 
    
            let roomData = this.state.roomData;
            let tempSource= Object.assign({}, source);;
            let sourceId = source.id;
            teacherId = teacherId ? teacherId : roomData.id;  //in case of student provide teacher id as params
            let sourcePosition = source.position;
            let roomId = roomData.roomId;

            if ( sourceId === teacherId ) {  //means source is teacher so revert teacher position back
                allParticipants[sourceId].position = "0";  //revert teacher position to 0
                allParticipants[remoteUserSwappedId].position = sourcePosition;  //revert student position to curent teacher position
    
                roomData.sources = roomData.sources.map(sourceElement => { // update souces for both student and teacher
                    if ( sourceElement.id === remoteUserSwappedId ) {
                        sourceElement.position = sourcePosition;  //revert student position back       
                        if ( roomData.type === "student" ) {
                            allParticipants[remoteUserSwappedId].tracks.forEach( track => {
                                if ( track.getType() === 'audio' ) {
                                    track.mute();
                                    room.setReceiverVideoConstraint('180'); //manually setting small box at 180
                                }
                            });
                        }
                        return sourceElement;
                    } else if ( sourceElement.id === teacherId.toString() ) {
                        sourceElement.position = "0";  //revert teacher back to 0 in sources
                        if ( this.state.roomData.type === "teacher" ) {
                            allParticipants[teacherId].tracks.forEach( track => {
                                if ( track.getType() === 'audio' ) {
                                    track.unmute();
                                    room.setReceiverVideoConstraint(roomData.bitrate);
                                }
                            });
                        }
                        return sourceElement;
                    }
                    return sourceElement;
                });
                this.setState({ roomData, isTrackUpdate: true, remoteUserSwappedId: null });
            } else { //when click on student
                if ( allParticipants[sourceId] ) {
                    roomData.sources = roomData.sources.map(sourceElement => {
                        console.log('changing teacher  => =>', roomData.sources, sourceElement.id, teacherId, sourceId)
                        if ( sourceElement.id === teacherId ) {  //because swap only available for teacher so teacher id is in state
                            console.log('changing teacher position to  => =>', sourcePosition ,source)
                            sourceElement.position = sourcePosition;
                            return sourceElement;
                        } else if ( sourceElement.id === sourceId ) {
                            console.log('croom data sources before => =>', roomData.sources)
                            sourceElement["position"] = "0";
                            return sourceElement;
                        }
                        return sourceElement;
                    });

                    console.log('room data sources after => =>', roomData.sources)
        
                    Object.keys(allParticipants).forEach( id => {
                        if ( id === sourceId ) {
                            allParticipants[sourceId].position = "0";  //change remoted user position to 0 in place of teacher
                            if ( this.state.roomData.type === "student" && sourceId === this.state.roomData.id ) {
                                allParticipants[sourceId].tracks.forEach( track => {
                                    if ( track.getType() === 'audio' ) {
                                        track.unmute();
                                        room.setReceiverVideoConstraint('720'); //set student bitrate at 720
                                    }
                                });
                            }
                        } else if ( allParticipants[id].type === "teacher" ) {
                            allParticipants[id].position = sourcePosition; //change teacher position to student div
                            if ( this.state.roomData.type === "teacher" ) {
                                allParticipants[id].tracks.forEach( track => {
                                    if ( track.getType() === 'audio' ) {
                                        track.mute();
                                        room.setReceiverVideoConstraint('180'); //set teacher bitrate to 180
                                    }
                                });
                            }
                        }
                    });
    
                    remoteUserSwappedId = sourceId;
                    console.log('all participant and sources => => ', allParticipants, roomData);
                    this.setState({ roomData, isTrackUpdate: true, remoteUserSwappedId });
                }
            }

            console.log('final data => => ', roomData)
            if ( roomData.type === "teacher" ) {
                console.log('sending this => => ', source, tempSource)
                let messageObject = { type: 'videos-swapped', data: { selectedSource: tempSource, teacherId, remoteUserSwappedId, roomId  } };
                socket.emit( 'event', messageObject );
            }
        } catch ( error ) {
            message.error('Something went wrong with video swap!');
            console.error('something went wrong with video swap!', error)
        }
    }

    getScreenTracks () {
        let options = {
            devices: ['desktop'],
            minFps: "15",
            resolution: 720,
            constraints: {
                video: {
                    aspectRatio: 16 / 9,
                    height: {
                        ideal: 720,
                        max: 720,
                        min: 180
                    }
                }
            },
        }
        window.JitsiMeetJS.createLocalTracks( options )
            .then((tracks) => {
                this.onScreenTracks(tracks);
                this.setState({ isScreenSharing: true })
            })
            .catch(error => {
                console.log('user canceled screen share => ', error);
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
            this.setState({ isScreenTrackUpdate: true });
        }
    }

    //jitsi supports only one video track at a time so we creating new connection for screen share separately
    handleScreenShareButton = ( isScreenSharing ) => {
        if ( !isScreenSharing ) { 
            screenConnection = new window.JitsiMeetJS.JitsiConnection(null, null, options);

            this.setConnectionListeners( true );
            screenConnection.connect();
        }
    }

    sortSources = ( a, b ) => {
        if ( parseInt(a.position) < parseInt(b.position) ){
          return -1;
        }
        if ( parseInt(a.position) > parseInt(b.position) ){
          return 1;
        }
        return 0;
    }

    iframe = () => {
        let roomData = this.state.roomData;
        const htmlSource = this.state.selectedBoard ? this.state.selectedBoard.source : (roomData? (roomData.board_sources ? roomData.board_sources[0].source: "") : "");
        console.log('iframe source => => ', htmlSource)
        return {
          __html: `<iframe src="${htmlSource}" width="100%" height="100%"></iframe>`
        }
    }

    handleChangeBoard = ( index ) => {
        const selectedBoard = this.state.roomData.board_sources[index];
        this.setState({ selectedBoard })
    } 

    toggleTeacherView = ( view ) => {
        let { roomData } = this.state;
        if ( view === "board" || this.state.currentTeacherToggledView === "board" ) {  //incase of screen toggle update both screen and video tracks
            this.setState({ isTrackUpdate: true, isScreenTrackUpdate: false, currentTeacherToggledView: view })
        } else {
            this.setState({ isTrackUpdate: true, isScreenTrackUpdate: true, currentTeacherToggledView: view })
        }
        if ( roomData.type === "teacher" ) {
            let messageObject = { type: 'teacher-view-change', data: { currentTeacherToggledView: view, teacherId: roomData.id, roomId: roomData.roomId } };
            socket.emit( 'event', messageObject);
        }
    }

    teacherViews = ( viewType ) => {
        const { currentTeacherToggledView, roomData, isScreenSharing, remoteUserSwappedId } = this.state;
        const { type, bitrate } = roomData;
        const customStyle = {
            largeVideoPoster: {
                backgroundImage: "url(" + "https://www.clipartmax.com/png/middle/148-1488113_teachers-icon-teachers-png.png" + ")",
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                width: "100%",
                height: "100%"
            },
            btnSwapScreen: {
                backgroundImage: `url(${swapTeacherSourcesIcon})`,//`url("${staticServerURL}/static/media/swap_video.png")`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                pointerEvents: "all",
                opacity: "1",
                width: "20px",
                height: "20px",
                position: "absolute",
                zIndex: 1,
                cursor: "pointer",
                top: "80%",
                left: "5%"
            },
            btnStartScreen: {
                backgroundImage: `url(${!this.state.isScreenSharing && startIcon})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                pointerEvents: "all",
                opacity: "1"
            }
            // iframeLoader: {
            //     backgroundImage: `url(${this.state.selectedBoard ? "" : teacherBoardLoader})`,
            //     backgroundPosition: 'center',
            //     backgroundSize: 'cover',
            //     backgroundRepeat: 'no-repeat',
            //     width: "100%", 
            //     height: "100%"
            // }
        }
        if ( viewType === "video" ){
            return (
                <div style={{ width: "100%", height: ( currentTeacherToggledView === "video" ) ? "100%" : "50%", position: "relative" }}>
                    <video id="teacher-video-tag" autoPlay style={ customStyle.largeVideoPoster } /> 
                    <audio autoPlay width="0%" height="0%" id="teacher-audio-tag"></audio>
                    { (type === "teacher") &&
                        <Select
                            defaultValue={bitrate}
                            // style={{ width: 80 }}
                            onChange={(value) => this.handleChangeResolutions(value)}
                        >
                        {this.state.resolutions.map(resolution => (
                            <Option key={resolution}>{resolution}</Option>
                        ))}
                        </Select>
                    }
                    {(currentTeacherToggledView === "board" || currentTeacherToggledView === "screen") && ( type === "teacher" ) && <div className="btn-swap-screen" onClick={() => this.toggleTeacherView( 'video' )} style={ customStyle.btnSwapScreen } />}

                </div>);
        } else if ( viewType === "board" ) {
            return (
                <div style={{ width: "100%", height: ( currentTeacherToggledView === "board" ? "100%" : "50%" ), position: "relative" }}>
                    <div style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={ this.iframe() } />
                    {/* with loader <div style={ customStyle.iframeLoader} dangerouslySetInnerHTML={ this.iframe() } /> */}
                    <Select
                        defaultValue={roomData.board_sources && roomData.board_sources[0].name}
                        style={{ right: "5%" }}
                        onChange={(index) => this.handleChangeBoard(index)}
                    >
                        {roomData.board_sources.map( ( board, index ) => (
                        <Option key={index}>{board.name}</Option>
                        ))}
                    </Select>
                    {(currentTeacherToggledView === "video") && ( type === "teacher" ) && !remoteUserSwappedId && <div className="btn-swap-screen" onClick={() => this.toggleTeacherView( 'board' )} style={ customStyle.btnSwapScreen } />}
                </div>
            );
        } else if ( viewType === "screen" ) {
            return (
                <div style={{ width: "100%", height: ( currentTeacherToggledView === "screen" ? "100%" : "50%" ), position: "relative" }}>
                    <video id="teacher-screen-share-video" autoPlay poster="https://miro.medium.com/max/3200/0*-fWZEh0j_bNfhn2Q" width="100%" height="100%" />
                    {(type === "teacher") &&<div className="btn-start-screen" onClick={() => this.handleScreenShareButton(this.state.isScreenSharing)} style={ customStyle.btnStartScreen} />}
                    {(currentTeacherToggledView === "video") && isScreenSharing && ( type === "teacher" ) && !remoteUserSwappedId && <div className="btn-swap-screen" onClick={() => this.toggleTeacherView( 'screen' )} style={ customStyle.btnSwapScreen } />}
                </div>
            );
        }
    }
    

    render () {
        console.log('all participant => => ', allParticipants, this.state.roomData)
        const { isLoggedIn, roomData, currentTeacherToggledView } = this.state;
        const { roomId, id, name, type } = roomData;
 
        if ( !id || !roomId || !name || !type ) {
            return <div className="container" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
                <p style={{ fontSize: "35px", color: "#ff4d4f" }}>Please provide room info</p>
            </div>
        } else if ( !isLoggedIn ) {
            return <div className="container" style={{ paddingLeft: "0px", paddingRight: "0px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
                {this.state.isStopped ? <p style={{ fontSize: "35px", color: this.state.isStopped? "red" : "black" }}> Stopped! </p> : 
                // <div style={{ width: "100%" }}>
                //     <img src={loadingIcon} alt="" width="100%" height="100%" />
                // </div>}
                <div className="justify-content-center" style= {{ width: "100%", height: "100%", top: "50%", backgroundColor: 'white' }}>
                    <img src={`${loadingIcon}`} alt="" width="200" height="200" style={{ marginTop: "120px" }} />
                </div>}
                {/* {this.state.isStopped && <Button onClick={()=> this.joinRoom()} type="primary"> Join Again </Button>} */}
            </div>
        } else {
            return (
                <div className="container">
                    <div className="row w-100 h-100 p-3" id="teacher-container">
                        <div className="col-md-8 col-sm-12 col-xs-12 w-100 h-100 p-3" id="large-video-container">
                            {currentTeacherToggledView==="video" ? this.teacherViews('video' ) : (currentTeacherToggledView==="board" ? this.teacherViews('board') : this.teacherViews('screen'))}
                            <div id="large-video-actions-box" className="row w-20 h-10" style={{ background: (type==="teacher" ? "rgba(255, 255, 255, 0.301)": "none")}}>
                                {<div onClick={() => this.toggleLocalSource( id, this.state.isLocalAudioMute, 'audio' )} style={{ backgroundImage: `url(${this.state.isLocalAudioMute?micOff:micOn})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', width: "30px", height: "30px", cursor: "pointer" }} />}
                                {<div onClick={() => this.toggleLocalSource( id, this.state.isLocalVideoMute, 'video' )} style={{ cursor: "pointer", marginLeft: "8px"  }}><img src={this.state.isLocalVideoMute ? videoSlashIcon : videoSolidIcon} style={{ width: "30px", height:"30px" }} /></div>}
                                <div onClick={this.leaveRoomBtn.bind(this)} style={{ backgroundImage: `url(${stopIcon})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', marginLeft: "8px", width: "35px", height: "35px", cursor: "pointer" }} />                            
                            </div>
                        </div>
                        <div className="col-md-4 col-sm-4 col-xs-8 container w-100 h-100 p-3" id="teacher-dashboard">
                            {(currentTeacherToggledView==="video" || currentTeacherToggledView==="screen") ? this.teacherViews('board' ) : (currentTeacherToggledView==="board" && this.teacherViews('video'))}
                            {(currentTeacherToggledView==="video" || currentTeacherToggledView==="board") ? this.teacherViews('screen' ) : (currentTeacherToggledView==="screen" && this.teacherViews('video'))}
                        </div>
                    </div>
                    <div className="row w-100 p-3 justify-content-start" id="small-videos-box">
                        {
                            this.state.roomData && this.state.roomData.sources && (this.state.roomData.sources.length > 1) &&
                            this.state.roomData.sources.sort(this.sortSources.bind(this)).map(source => {
                                if( source.position.toString() !== "0" ) {
                                    let sourceUserId = source.id;
                                    return (
                                        <div key={source.position} className="student-small-video" id={`student-box-${source.position}`}>
                                            <div id={`video-box-${source.position}`}>
                                                <video id={`video-tag-${source.position}`} autoPlay poster="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTUq71y6yGEk94T1hyj89lV-khy9OMkgZt0Dl1hecguJxUpLU6a&usqp=CAU" width="105" />
                                                {type==="teacher" && (currentTeacherToggledView === "video") && allParticipants[sourceUserId] && ( !this.state.remoteUserSwappedId || ( sourceUserId===id ) ) && <div className="btn-swap-video" onClick={() => this.swapVideo( source )} style={{ backgroundImage: `url("${iconSwap}")`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', pointerEvents: "all", opacity: "1" }} />}
                                                {/* <div className="btn-mute-unmute" onClick={() => this.toggleAudio( source, isMute )} style={{ backgroundImage: `url(${isMute?micOff:micOn})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', pointerEvents: "none", opacity: "0.5" }} /> */}
                                                <audio autoPlay id={`audio-tag-${source.position}`} />
                                            </div>
                                            <div className="student-name" id={`name-box-${source.position}`}>
                                                <h6 className="student-name-text" align="center">{source.name}</h6>
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