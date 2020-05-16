/* eslint-disable */
import React from 'react';
import { connect } from 'react-redux';
import queryString from 'query-string';
import axios from  'axios';
import Iframe from 'react-iframe';
import { Modal } from 'antd';

import { message, Select, Button, notification, Tooltip  } from 'antd';
import socketIOClient from "socket.io-client";
import './Conference.css';
import { addMessages } from '../actions';


import startIcon from '../assets/img/start.png';
import stopIcon from '../assets/img/stop.png';
import micOn from '../assets/img/mic-on.svg';
import micOff from '../assets/img/mic-off.svg';
import iconSwap from '../assets/img/swap_video.png'
import loadingIcon from '../assets/img/loading-icon.gif';
import swapTeacherSourcesIcon from '../assets/img/swap-teacher-sources.png';
import videoSolidIcon from '../assets/img/video-solid.svg';
import videoSlashIcon from '../assets/img/video-slash-solid.svg';
import raiseHandIcon from '../assets/img/hand-point-up-regular.svg';
import ChatBox from '../containers/ChatBox';
import InputNote from '../containers/InputNote';
import SendChatMessage from './SendChatMessage';
import RoomAnnouncement from './RoomAnnouncement';


import bellRing from '../assets/mesg_ting.mp3';

// import teacherBoardLoader from '../assets/img/teacher-board-loader.gif';

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
// const options = {
//     hosts: {
//         domain: 'beta.meet.jit.si',
//         muc: 'conference.beta.meet.jit.si' // FIXME: use XEP-0030
//     },
//     bosh: 'https://beta.meet.jit.si/http-bind', // FIXME: use xep-0156 for that

//     // The name of client node advertised in XEP-0115 'c' stanza
//     clientNode: 'http://jitsi.org/jitsimeet'
// };

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
            currentTeacherToggledView: 'video',  //three types 1=>video(video at center), 2=>screen and 3=>html
            isChatBoxVisible: false,
            noOfNewMessages: 0,
            noOfNewPrivateMessages: 0,
            isChatPublic: false,
            params: null,
            isGlobalAudioMute: false,
            isVideoMuteByTeacher: false,
            isRecording: false,
            isStudentsVisible: false
        };

        //get page params and initialize socket
        socket = socketIOClient(this.state.socketEndpoint);
        this.addSocketEvents();

        let params = null//this.props.params;
        if ( !params ) { //temporary for testing
            params= queryString.parse(window.location.search.substring(1));
        }
        this.state.params = params;
    }
    async componentDidMount () {
        let roomData = {};

        let params = this.state.params;
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
                roomData.class_id = params.class_id;
                roomData.teacher_id = params.teacher_id;
                
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
                        isMute: roomData.mute,
                        class_id: params.class_id,
                        teacher_id: params.teacher_id
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
        
                    let messageObj = {
                        type: 'joinRoom',
                        data: { //store user data at socket server as well
                            id: id, //userId
                            roomId: roomId,
                            name: roomData.name,
                            type: roomData.type,
                            position: roomData.position,
                            bitrate: roomData.bitrate,
                            isMute: roomData.mute,
                            class_id: params.class_id
                        }
                    };
                    socket.emit('event', messageObj);
        
                    window.JitsiMeetJS.init(jitsiInitOptions);
                    connection = new window.JitsiMeetJS.JitsiConnection(null, null, options);
                    this.setConnectionListeners();
                    connection.connect();
            
                    // window.addEventListener(window.JitsiMeetJS.errors.conference.PASSWORD_REQUIRED, function () { message.error('Please provide room password'); });
                    // roomData.sources.push({id: "210", position: "11", name: "11"})
                    // roomData.sources.push({id: "210", position: "12", name: "12"})
                    // roomData.sources.push({id: "210", position: "13", name: "13"})
                    // roomData.sources.push({id: "210", position: "14", name: "14"})
                    // roomData.sources.push({id: "210", position: "15", name: "בן"})
                    // roomData.sources.push({id: "210", position: "16", name: "בן"})
                    // roomData.sources.push({id: "210", position: "17", name: "בן"})
                    // roomData.sources.push({id: "210", position: "18", name: "18"})
                    // roomData.sources.push({id: "210", position: "19", name: "19"})
                    // roomData.sources.push({id: "210", position: "20", name: "20"})
                    // roomData.sources.push({id: "210", position: "21", name: "21"})
                    // roomData.sources.push({id: "210", position: "22", name: "בן"})
                    // roomData.sources.push({id: "210", position: "23", name: "בן"})
                    // roomData.sources.push({id: "210", position: "24", name: "בן"})
                    // roomData.sources.push({id: "210", position: "25", name: "בן"})
                    // roomData.sources.push({id: "210", position: "26", name: "בן"})
                    // roomData.sources.push({id: "210", position: "27", name: "בן"})
                    // roomData.sources.push({id: "210", position: "28", name: "בן"})
                    // roomData.sources.push({id: "210", position: "29", name: "בן"})
                    // roomData.sources.push({id: "210", position: "30", name: "בן"})
                    this.setState({ roomData, isChatBoxVisible: (type==="teacher" ? true : false) });
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
                    this.flipVideo( data.selectedSource , data.teacherId, data.remoteUserSwappedId );
                    break;
                case 'teacher-view-change':
                    this.toggleTeacherView( data.currentTeacherToggledView );
                    break;
                case 'board-change':
                    this.handleChangeBoard(data.boardIndex);
                    break;
                case 'hand-raised':
                    this.remoteStudentHandRaised(data.selectedSource);
                    break;
                case 'new-announcment':
                    this.handleChangeAnnouncement(null, data.newAnnouncement);
                    break;
                case 'is-chat-public':
                    this.setState({ isChatPublic: data.isChatPublic });
                    break;
                case 'chat-message':
                case 'private-chat-message':
                    console.log('new message => =>', data)
                    this.onNewMessage(data);
                    break;    
                case 'private-chat-response':
                    message.error("Can't Send message seems offline!");
                    break;
                case 'mute-all-students-audio':
                    if (this.state.roomData.type === "student"){this.toggleLocalAudioByTeacher(data)}
                    else if (this.state.roomData.type === "teacher") { this.setState({ isGlobalAudioMute: data.mute }) }
                    break;
                case 'mute-student-video':
                    this.toggleLocalVideoByTeacher(data);
                    break;
                case 'student-screen-share-on':
                    this.handleStudentScreenShare(data);
                    break;
                case 'screen-share-stop':
                    this.handleScreenShareStop(false, data.id);
                    break;
                case 'message-undefined':
                    console.error('socketio server message type undefined!') 
                    break;
                case 'teacher-joined-room':
                    message.info('Teacher is in the class.');
                    $('body').append($(`<embed src=${bellRing} autostart="false" width="0" height="0" id="sound1"
                        enablejavascript="true" />`));
                    break;
                case 'error':
                    console.log('error when processing socketio request => ', data.error)
                default:
                    console.error('socketio server message type undefined!', data);
            }
        });
    }
    

    componentDidUpdate () {
        let { isTrackUpdate, isScreenTrackUpdate, roomData } = this.state;
        if ( isTrackUpdate || isScreenTrackUpdate ) {
            console.log('track update => => ', isTrackUpdate, isScreenTrackUpdate);
            let allParticipantsIds = Object.keys( allParticipants );
            allParticipantsIds.forEach( participantId => {
                let participant = allParticipants[participantId];
                let participantTracks = participant.tracks;

                if ( isTrackUpdate  ) {
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
                                if ( this.state.remoteUserSwappedId && participant.type === "teacher" ) { //if remoteUserSwappedId means flip Enabled and also if participant in loop is teacher then map to screen div
                                    console.log('mapping onto teacher screen share div => =>', participant, this.state.remoteUserSwappedId, allParticipants)
                                    participantTracks[i].attach($(`#teacher-screen-share-video`)[0]);
                                    participantTracks[i].detach($(`#video-tag-${participant.position}`)[0]); //also detach from small div
                                    // if ( roomData.teacher_id ) {
                                    //     $(`#name-box-${allParticipants[participant.teacher_id].position} h6`).text(roomData.sources.filter(source=>source.position==="0")[0].name);
                                    //     //on flip there is student at index 0 in sources so get name from that
                                    //     //and get position to map name from teacher obj
                                    // }
                                } else {
                                    participantTracks[i].attach($(`#video-tag-${participant.position}`)[0]);
                                    !this.state.remoteUserSwappedId && participantTracks[i].detach($(`#teacher-screen-share-video`)[0]); //also detach from screen share div if it was before
                                    // let name = participant.name;
                                    // if ( name ) {
                                    //     $(`#name-box-${participant.position} h6`).text(name);
                                    // }
                                }
                            } else {
                                participantTracks[i].attach($(`#audio-tag-${participant.position}`)[0]);
                                //for teacher audio mapped on small div no need to map on screen share div
                            }
                        }
                    }
                    this.setState({ isTrackUpdate: false });
                } else if ( isScreenTrackUpdate ) {
                    let screenTracks = participant.screenTracks;
                    if ( participant.type === "student" ) {
                        if ( screenTracks[0] && this.state.isScreenTrackUpdate && !isTrackUpdate ) {
                            this.setState({ isScreenTrackUpdate: false });
                            screenTracks.forEach( track => {
                                let screenVideo = $(`#teacher-video-tag`)[0];
                                track.attach(screenVideo);
                                // if ( screenRoom && this.state.roomData.type === "teacher" ) {
                                //     screenRoom.addTrack(track);
                                // }
                            })
                        }
                    } else {
                        if ( screenTracks[0] && this.state.isScreenTrackUpdate && !isTrackUpdate ) {
                            this.setState({ isScreenTrackUpdate: false });
                            screenTracks.forEach( track => {
                                let screenVideo = $(`#teacher-screen-share-video`)[0];
                                track.attach(screenVideo)
                                // if ( screenRoom && this.state.roomData.type === "teacher" ) {
                                //     screenRoom.addTrack(track);
                                // }
                            })
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
                console.info("You are moderator of the Conference.");
            }
            isJoined = true;
            let localTracks = allParticipants[this.state.roomData.id].tracks;
            for (let i = 0; i < localTracks.length; i++) {
                room.addTrack(localTracks[i]);
            }
            
            this.sendRingBellMessage();

        } else {
            let userId = this.state.roomData.id;
            let userName = this.state.roomData.name;
            let type = this.state.roomData.type;
            let position = "9999";  //just like for teacher we set "0" so for screen we set "9999"
            let uid = "";
    
            uid = userId + "###" + userName + "###" + type + "###" + position;
            console.log('setting my display name => =>', uid)
            screenRoom.setDisplayName(uid); //setting display name (consist id, name and type of user its trick to pass userId, and type)

            isScreenJoined = true;
            let screenTracks = allParticipants[this.state.roomData.id]['screenTracks'];

            console.log('setting screen share tracks => =>', allParticipants)


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
        let options = {
            devices: ['audio', 'video'],
            minFps: "15",
            resolution: 720,
            constraints: {
                video: {
                    aspectRatio: 16 / 9,
                    height: {
                        ideal: 720,
                        max: 720,
                        min: 720
                    },
                    width: {
                        ideal: 1280,
                        max: 1280,
                        min: 1280
                    }
        
                }
            }
        }
        window.JitsiMeetJS.createLocalTracks( options )
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
                    // if( track.getType() === "audio") {
                    //     console.log('local track new audio status => =>', track.isMuted())
                    //     this.setState({ isLocalAudioMute : track.isMuted() });
                    // } else if( track.getType() === "video") {
                    //     console.log('local track new video status => =>', track.isMuted())
                    //     this.setState({ isLocalVideoMute : track.isMuted() });
                    // }
                        
                    let id = this.state.roomData.id;
                    this.onTrackMute( id, track );
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
        console.log('got remote track ==> => ', participant, userInfo)

        if ( !userInfo._displayName ) {
            return;
        } else {
            userInfo = room.getParticipantById(participant)._displayName.split('###');
        }
        let id = userInfo[0];
        let name = userInfo[1];
        let type = userInfo[2];
        let position = userInfo[3];
        console.log('got remote user info => =>', userInfo, track);

        if ( id.toString() === (this.state.roomData.id).toString()) {
            return;
        }

        if ( position === "9999") {
            allParticipants[id] && allParticipants[id]['screenTracks'].push(track);
            this.setState({ isScreenTrackUpdate: true, isScreenSharing: true })
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
                () => this.onTrackMute(id, track));
            track.addEventListener(
                window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                () => console.log('remote track stoped'));
            track.addEventListener(
                window.JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
                deviceId => console.log(`track audio output device was changed to ${deviceId}`));    

            this.setState({ isTrackUpdate: true });
        }
    }

    onTrackMute = ( id, track ) => {
        let isLocal = id === this.state.roomData.id;
        if ( allParticipants[id] && allParticipants[id].name ) {
            if ( track.getType() === "audio" ) {
                message.info(`${allParticipants[id].name} ${track.isMuted() ? " Mic Off" : " Mic On"}`);
                isLocal && this.setState({ isLocalAudioMute: track.isMuted()});
            } else if ( track.getType() === "video" ) {
                message.info(`${allParticipants[id].name} ${track.isMuted() ? " Video Off" : " Video On"}`);
                isLocal && this.setState({ isLocalVideoMute: track.isMuted()});
                this.setState({ isTrackUpdate: true, isScreenTrackUpdate: true})

                
                if ( allParticipants[id].type==="teacher" ) {
                    if ( this.state.currentTeacherToggledView === 'screen' ) {
                        document.getElementById("teacher-screen-share-video").load();
                    } else {
                        document.getElementById("teacher-video-tag").load();
                    }
                } else {
                    document.getElementById(`video-tag-${allParticipants[id].position}`).load();
                }
            }
        }
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
                    delete allParticipants[id][tracks][index];
                })
            }
        }
    }

    unload () {
        let id = this.state.roomData.id;
        if (allParticipants[id]) {
            let localTracks = allParticipants[id]['tracks'];
            let screenTracks = allParticipants[id]['screenTracks'];
            for (let i = 0; i < localTracks.length; i++) {
                localTracks[i].dispose();
            }
            if ( screenTracks[0] ) {
                for (let j = 0; j < screenTracks.length; j++) {
                    screenTracks[j].dispose();
                }
                screenConnection.disconnect();
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

    leaveRoomBtn = (e) => {
        this.unload();
        this.setState({ isLoggedIn: false, isStopped: true });
    }

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

    sendRingBellMessage = () => {
        let { roomData } = this.state;
        if ( roomData.type === "teacher" ) {
            let messageObj = {
                type: 'teacher-joined-room',
                data: { //store user data at socket server as well
                    id: roomData.id, //userId
                    roomId: roomData.roomId,
                    name: roomData.name,
                    type: roomData.type,
                }
            };
            socket.emit( 'event', messageObj );
        }
    }
    raiseHand = ( source ) => {
        const { roomData } = this.state;
        let studentHand = document.getElementById(`studenthand-${source.id}`);
        studentHand.style.backgroundColor = "white";

        let messageObject = { type: 'hand-raised', data: { selectedSource: source, studentId: roomData.id, roomId: roomData.roomId } };
        socket.emit( 'event', messageObject);

        setTimeout(() => {
            studentHand.style.backgroundColor = "#d0f543";
        }, 5000);
    }
    remoteStudentHandRaised = ( remoteSource ) => {
        this.updateHandRaised(remoteSource, true);

        setTimeout(()=>{
            this.updateHandRaised(remoteSource, false);
        }, 5000)
    }

    handleRecordVideo = () => {
        let { isRecording, roomData } = this.state;
        if ( !isRecording ) {
            // room.startRecording({ mode: "file" }); 
            this.setState({ isRecording: true })
        } else {
            // room.stopRecording(); 
            this.setState({ isRecording: false })
        }
    }

    updateHandRaised = ( remoteSource, isHandRaised ) => {
        let roomData = this.state.roomData;
        console.log('room data => => =>',roomData.sources)
        roomData.sources.forEach( source => {
            if ( source.id === remoteSource.id ) {
                source['isHandRaised'] = isHandRaised;
            }
            return source;
        })
        this.setState({ roomData });
    }

    handleChangeAnnouncement = (e, announcment) => {
        let { roomData } = this.state;
        if ( e && e.target && e.target.name && e.target.name === "announcment" ) {
            roomData.announcment = e.target.value;
        } else if ( announcment ) {
            roomData.announcment = announcment;
            Modal.info({
                title: 'Announcement',
                content: (
                  <div>
                    <p>{announcment}</p>
                  </div>
                ),
                onOk() {},
            });
        }
        this.setState({ roomData });
    }

    toggleLocalAudioByTeacher = async ( data ) => {
        if (data.mute) { message.warning('Teacher Mute all audios');
        } else if (!data.mute) { message.success('Teacher unMute all audios'); }
        await this.toggleLocalSource( this.state.roomData.id, data.mute, "audio", true ); 
        this.setState({ isLocalAudioMute: data.mute, isGlobalAudioMute: data.mute });  //isGloablMute used for student to diable mute button

    }
    toggleLocalVideoByTeacher = async ( data ) => {
        if (data.mute) { message.warning('Teacher Stopped your Video!');
        } else if (!data.mute) { message.success('Teacher Started your Video'); }
        await this.toggleLocalSource( this.state.roomData.id, data.mute, "video", true ); 
        this.setState({ isLocalVideoMute: data.mute, isVideoMuteByTeacher: data.mute });
    }
    
    toggleLocalSource = ( sourceId, isMute, sourceType, isTeacherControlled = false ) => {
        console.log('before toggling local video source => =>', sourceId, isMute, sourceType)
        if ( sourceType === "audio" && this.state.isGlobalAudioMute && this.state.roomData.type === "student" && !isTeacherControlled ) {
            return;
        } else if ( sourceType === "video" && this.state.isVideoMuteByTeacher && this.state.roomData.type === "student" && !isTeacherControlled ) {
            return;
        }
        let tracks = [];
        Object.keys(allParticipants).forEach(id => { 
            if ( id === sourceId ) {
                tracks = allParticipants[id].tracks;
                tracks.forEach( track=> {
                    if( track.getType() === sourceType ) {
                        console.log('matchedtoggling local video source => =>', sourceId, isMute, sourceType)
                        if ( isTeacherControlled ) {
                            if ( isMute ) {
                                track.mute();
                            } else {
                                track.unmute();
                            }  
                        } else {
                            if ( isMute ) {
                                console.log('unmuting tracks=>=>', isMute)
                                track.unmute();
                            } else {
                                console.log('muting tracks=>=>', isMute)
                                track.mute();
                            }  
                        }                   
                    }
                });
            }
        })
    }

    toggleGlobalSources = ( id, muteType ) => {
        let { roomData, isGlobalAudioMute } = this.state;
        let messageObj;
        if ( roomData.type === "teacher" ) {
            if ( muteType === "mute-all-students-audio" ) {
                messageObj = {
                    type: muteType,
                    data: { //store user data at socket server as well
                        id: roomData.id, //userId
                        roomId: roomData.roomId,
                        name: roomData.name,
                        type: roomData.type,
                        mute: !isGlobalAudioMute
                    }
                };
                this.setState({ isGlobalAudioMute: !isGlobalAudioMute })
            } else if ( muteType === "mute-student-video" ) {
                let { sources } = roomData;
                let isVideoMute;
                sources.forEach(source => {
                    if ( source.id === id ) {
                        if ( source["isVideoMute"] ) {
                            source["isVideoMute"] = !source["isVideoMute"];
                        } else {
                            source["isVideoMute"] = true;
                        }
                        isVideoMute = source["isVideoMute"];
                        return source;
                    } 
                });
                messageObj = {
                    type: muteType,
                    data: { //store user data at socket server as well
                        id: roomData.id, //userId
                        roomId: roomData.roomId,
                        name: roomData.name,
                        type: roomData.type,
                        mute: isVideoMute,
                        studentId: id
                    }
                };
            }
            socket.emit( 'event', messageObj );
        }
    }

    flipVideo = ( source, teacherId, remoteUserSwappedId ) => {
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
            } else 
            { //when click on student
                if ( allParticipants[sourceId] ) {
                    roomData.sources = roomData.sources.map(sourceElement => {
                        try {
                            console.log('changing teacher  => =>', roomData.sources, sourceElement.id, teacherId, sourceId)
                            if ( sourceElement.id === teacherId ) {  //because swap only available for teacher so teacher id is in state
                                console.log('changing teacher position to  => =>', sourcePosition ,source)
                                sourceElement.position = sourcePosition;
                                return sourceElement;
                            } else if ( sourceElement.id === sourceId ) {
                                console.log('room data sources before => =>', roomData.sources)
                                sourceElement["position"] = "0";
                                return sourceElement;
                            }
                            return sourceElement;
                        } catch(error) {
                            console.error("error from changing elements position => => ", error)
                        }
                    });

                    console.log('room data sources after => =>', roomData.sources)
        
                    Object.keys(allParticipants).forEach( id => {
                        if ( id === sourceId ) {
                            allParticipants[sourceId].position = "0";  //change remote user position to 0 in place of teacher
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
                    console.log('all participant => => ', allParticipants);
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
                        min: 720
                    },
                    width: {
                        ideal: 1280,
                        max: 1280,
                        min: 1280
                    }
        
                }
            }
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
                    this.handleScreenShareStop( true );
                });
            console.log('got screen tracks => =>', tracks[i])
            allParticipants[this.state.roomData.id]["screenTracks"].push(tracks[i]);
            this.setState({ isScreenTrackUpdate: true });

            if ( isScreenJoined ) {
                screenRoom.addTrack(tracks[i]);
            }
        }
    }

    handleScreenShareStop = ( isLocal= false, remoteScrenUserId ) => {
        if ( isLocal ) {
            let id = this.state.roomData.id;
            let messageObject = { 
                type: 'screen-share-stop', 
                data: { 
                    id, 
                    roomId: this.state.roomData.roomId 
                } 
            };
            socket.emit( 'event', messageObject);

            if ( allParticipants[id] ) {
                allParticipants[id].screenTracks = [];            
            }
        } else {
            if ( remoteScrenUserId && allParticipants[remoteScrenUserId] ) {
                allParticipants[remoteScrenUserId].screenTracks = [];
            }
        }
        this.setState({ isScreenSharing: false, isTrackUpdate: true, isScreenTrackUpdate: true });
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

    createNotificationMessage = (message) => {
        let text = message.messageText;
        return (
            <div>
                <span className="notification-user-name">{message.name}</span>{` said "${text.length > 21 ? text.substring(0,21) + "..." : text}"`}
            </div>
        );
    }

    onNewMessage = ( message ) => {
        let { roomData } = this.state;
        console.log("new chat message => =>", message)
        this.props.addMessages([message]);

        if ( message.studentId ) {
            if ( roomData.type === "student" ) {
                this.setState({ noOfNewPrivateMessages: this.state.noOfNewPrivateMessages+1 })
            } else {
                roomData.sources = roomData.sources.map(sourceElement => { // update souces for both student and teacher
                    if ( sourceElement.id === message.userId ) {
                        if ( sourceElement['noOfNewPrivateMessages'] ) {
                            sourceElement['noOfNewPrivateMessages'] = sourceElement['noOfNewPrivateMessages'] + 1;
                        } else {
                            sourceElement['noOfNewPrivateMessages'] = 1; //if not areadly exist means very first message
                        }
                    }
                    return sourceElement;
                });
                console.log('sources mapping => =>' , roomData.sources) 

                this.setState({ roomData });
            }
        } else {
            this.setState({ noOfNewMessages: this.state.noOfNewMessages+1 })
        }


        let messagesDiv = document.getElementsByClassName("chat-box-messages")[0]
        if ( messagesDiv ) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        if ( !this.state.isChatBoxVisible ) {
            notification.open({
                description: this.createNotificationMessage(message),
                duration: 3,
                top: 63
            });
        }
    }

    gethtmlSource = ( selectedBoard ) => {
        if ( selectedBoard && selectedBoard.source ) { 
            if (Array.isArray(selectedBoard.source) ) {
                if ( selectedBoard['currentPart'] ) {
                    console.log('returning from here => =>', selectedBoard.source)
                    return selectedBoard.source[selectedBoard['currentPart']];
                }
                console.log('returning from here1 => =>', selectedBoard.source[0])
                return selectedBoard.source[0]
            } else {
                console.log('returning from here2 => =>', selectedBoard)
                return selectedBoard.source
            }
        }
        return null;
        // return (selectedBoard ? selectedBoard.source : (roomData? (roomData.board_sources ? (roomData.board_sources[0].source ? (? roomData.board_sources[0].source[0] : roomData.board_sources[0].source ) : "about:blank"): "about:blank") : "about:blank"));
    }
    iframe = () => {
        let { selectedBoard, roomData } = this.state; 
        let htmlSource = this.gethtmlSource( selectedBoard, roomData );
        console.log('iframe source => => ', htmlSource)
        if ( htmlSource ) {
            return (
                <Iframe url={htmlSource}
                    id="teacher-board-iframe"
                    display="initial"
                    position="relative"
                    frameBorder="0"/>
            )
        }
        
    }

    handleChangeBoard = ( index ) => {
        const { roomData } = this.state;
        const selectedBoard = roomData.board_sources ? (roomData.board_sources[index] ? roomData.board_sources[index] : null) : null;
        if ( roomData.type === "teacher" && selectedBoard ) {
            let messageObject = { type: 'board-change', data: { boardIndex: index, teacherId: roomData.id, roomId: roomData.roomId } };
            socket.emit( 'event', messageObject);
        }
        this.setState({ selectedBoard })
    } 
    changeInnerBoard = ( selectionType ) => {
        let { selectedBoard } = this.state;

        let currentPart = selectedBoard["currentPart"];
        if ( !currentPart ) {
            currentPart = 0;
        }
        if ( selectionType === "right" ) {
            if ( currentPart < (selectedBoard.source.length-1) ) {
                selectedBoard["currentPart"] = currentPart + 1 
            } else {
                selectedBoard["currentPart"] = 0;
            }
        } else if ( selectionType === "left" ) {
            if ( currentPart === 0 ) {
                selectedBoard["currentPart"] = selectedBoard.source.length-1;
            } else {
                selectedBoard["currentPart"] = currentPart - 1;
            }
        }
        console.log('board part changed => => ', selectedBoard)
        this.setState({ selectedBoard });
    }

    toggleTeacherView = ( view ) => {
        console.log('update view => ', view)
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
        const { currentTeacherToggledView, roomData, isScreenSharing, remoteUserSwappedId, isChatBoxVisible, selectedBoard } = this.state;
        const { type, bitrate } = roomData;
        const customStyle = {
            btnSwapScreen: {
                backgroundImage: `url(${swapTeacherSourcesIcon})`,//`url("${staticServerURL}/static/media/mesg_ting.mp3)`,
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
                top: "5%",
                left: "5%"
            },
            // btnStartScreen: {
            //     backgroundImage: `url(${!this.state.isScreenSharing && startIcon})`,
            //     backgroundPosition: 'center',
            //     backgroundSize: 'cover',
            //     backgroundRepeat: 'no-repeat',
            //     pointerEvents: "all",
            //     opacity: "1"
            // }
        }
        if ( viewType === "video" ){
            return (
                <div className={`w-100 teaher-video-div ${currentTeacherToggledView === "video" ? (isChatBoxVisible? "teacher-div-large-with-chat" : "teacher-div-large") : (isChatBoxVisible? "teacher-div-small-with-chat": "teacher-div-small")}`}>
                    <video id="teacher-video-tag" autoPlay /> 
                    <audio autoPlay width="0%" height="0%" id="teacher-audio-tag"></audio>
                    { (type === "teacher") &&
                        <Select
                            defaultValue={bitrate}
                            className="change-bitrate-button"
                            onChange={(value) => this.handleChangeResolutions(value)}
                        >
                        {this.state.resolutions.map(resolution => (
                            <Option key={resolution}>{resolution}</Option>
                        ))}
                        </Select>
                    }
                    {
                        (currentTeacherToggledView === "board" || currentTeacherToggledView === "screen") && ( type === "teacher" ) && 
                            <div className="btn-swap-screen" onClick={() => this.toggleTeacherView( 'video' )} style={ customStyle.btnSwapScreen } />
                    }
                </div>);
        } else if ( viewType === "board" ) {
            return (
                <div className={`teacher-board-div ${currentTeacherToggledView === "board" ? (isChatBoxVisible? "teacher-div-large-with-chat" : "teacher-div-large") : (isChatBoxVisible? "teacher-div-small-with-chat": "teacher-div-small")}`}>
                    <div style={{ width: "100%", height: "100%" }}> { this.iframe() }</div>
                    {/* with loader <div style={ customStyle.iframeLoader} dangerouslySetInnerHTML={ this.iframe() } /> */}
                    {
                        type==="teacher" &&
                            <div  className="change-board-view d-flex flex-row justify-content-center">
                                <div className="change-board-view-button">
                                    <Select
                                        defaultValue="Choose View"
                                        onChange={(index) => this.handleChangeBoard(index)}
                                        className="change-board-button"
                                    >
                                        {roomData.board_sources.map( ( board, index ) => (
                                        <Option key={index}>{board.name}</Option>
                                        ))}
                                    </Select>
                                </div>
                            </div>

                    }
                    { (selectedBoard && selectedBoard.type === "multipart") &&
                        <div className="change-board-arrows d-flex flex-row justify-content-between">
                            <div className="change-board-left">
                                <i onClick={()=>this.changeInnerBoard("left")} className="fas fa-arrow-left"></i>
                            </div>
                            <div className="change-board-right">
                                <i onClick={()=>this.changeInnerBoard("right")} className="fas fa-arrow-right"></i>
                            </div>
                        </div>
                    }
                    {
                        (currentTeacherToggledView === "video") && ( type === "teacher" ) && !remoteUserSwappedId && 
                            <div className="btn-swap-screen" onClick={() => this.toggleTeacherView( 'board' )} style={ customStyle.btnSwapScreen } />
                    }
                </div>
            );
        } else if ( viewType === "screen" ) {
            return (
                <div className={`teacher-screen-share-div ${currentTeacherToggledView === "screen" ? (isChatBoxVisible? "teacher-div-large-with-chat" : "teacher-div-large") : (isChatBoxVisible? "teacher-div-small-with-chat": "teacher-div-small")}`}>
                    <video id="teacher-screen-share-video" autoPlay poster="https://miro.medium.com/max/3200/0*-fWZEh0j_bNfhn2Q" />
                    {(type === "teacher") &&<div className="btn-start-screen" onClick={() => this.handleScreenShareButton(this.state.isScreenSharing)} style={ customStyle.btnStartScreen} />}
                    {
                        (currentTeacherToggledView === "video") && isScreenSharing && ( type === "teacher" ) && !remoteUserSwappedId && 
                            <div className="btn-swap-screen" onClick={() => this.toggleTeacherView( 'screen' )} style={ customStyle.btnSwapScreen } />
                    }
                </div>
            );
        }
    }
    
    toggleChatBox = () => {
        this.setState({isChatBoxVisible: true });
    }

    showInputNote = (source) => {
        console.log('showing this sourc note', source)
        this.setState({ selectedSource: source, isInputNoteVisible: true, isSendMessageBoxVisible: false });
    }
    hideInputNote = () => {
        this.setState({ selectedSource: null, isInputNoteVisible: false});
    }
    showSendMessageBox = (source) => {
        let { roomData } = this.state;
        console.log('prev no of new meessages => =>', source)
        if ( this.state.roomData.type === "student" ) {
            this.setState({ noOfNewPrivateMessages: 0, selectedSource: source, isSendMessageBoxVisible: true, isInputNoteVisible: false });
        } else {
            roomData.sources.forEach(el=> {
                if ( el.id === source.id ) {
                    if ( source['noOfNewPrivateMessages'] ) {
                        source['noOfNewPrivateMessages'] = 0;
                    }
                }
            })
            this.setState({ selectedSource: source, isSendMessageBoxVisible: true, isInputNoteVisible: false });
        }
    }
    hideSendMessageBox = () => {
        this.setState({ selectedSource: null, isSendMessageBoxVisible: false });
    }

    clearNoOfNewMessages = () => {
        this.setState({ noOfNewMessages: 0 });
    }

    render () {
        const { params, isLoggedIn, roomData, 
            currentTeacherToggledView, noOfNewMessages, 
            isChatBoxVisible, isInputNoteVisible, selectedSource, 
            isSendMessageBoxVisible, isGlobalAudioMute,
            isScreenSharing, remoteUserSwappedId, isRecording,
            isStudentsVisible, noOfNewPrivateMessages } = this.state;
        const { roomId, id, name, type } = roomData;
        console.log('all participant => => ', roomData.sources);
 
        let isFlipEnabled = false;

        console.log('isglobalaudio mute => =>', isGlobalAudioMute)

        // if ( !params.id || !params.type || !params.class_id ) {
        //     return <div className="container" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        //         <p style={{ fontSize: "35px", color: "#ff4d4f" }}>Please provide room info</p>
        //     </div>
        // } else if ( !isLoggedIn ) {
        //     return (<div style={{ paddingLeft: "0px", paddingRight: "0px", width: "100vw", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        //         {this.state.isStopped ? <p style={{ fontSize: "35px", color: this.state.isStopped? "red" : "black" }}> Stopped! </p> : 
        //         // <div style={{ width: "100%" }}>
        //         //     <img src={loadingIcon} alt="" width="100%" height="100%" />
        //         // </div>}
        //         <div className="justify-content-center" style= {{ width: "100%", height: "100%", top: "50%", backgroundColor: 'white' }}>
        //             <img src={`https://api.getmycall.com/static/media/loading-icon.gif`} alt="" width="200" height="200" style={{ marginTop: "120px" }} />
        //         </div>}
        //         {/* {this.state.isStopped && <Button onClick={()=> this.joinRoom()} type="primary"> Join Again </Button>} */}
        //     </div>)
        // } 
        // else
         {
            return (
                <div className="w-100 h-100">
                    <div className="row classroom-header w-100 d-flex justify-content-between">
                        <div className="time-box-container w-10 d-flex flex-column justify-content-start">
                            <div className="time-box-info">
                                <span className="time-start">08:30</span>  -  <span className="time-end">09:15</span>
                            </div>
                        </div>
                        <div className="class-room-header-info w-30 d-flex flex-column justify-content-center">
                            <RoomAnnouncement 
                                id={roomData}
                                roomId={roomData.roomId}
                                announcment={roomData.announcment}
                                type={roomData.type}
                                socket={socket}
                                handleChangeAnnouncement={(e) => this.handleChangeAnnouncement(e)}
                            />
                        </div>
                        <div className="chat-button w-20 d-flex flex-column justify-content-start">
                            <div className="chat-button-container">
                                <button onClick={()=>this.toggleChatBox()} type="button" className="btn btn-primary chat-button"
                                    style={{
                                        background: `${isChatBoxVisible? "rgb(121, 119, 128)" : "#9772E8"}`
                                    }}>
                                    <div className="d-flex flex-row justify-content-center">
                                        <div className="btn-chat-inner-text d-flex justify-content-end w-70">Class Chat</div>
                                        <div className="chat-button-icon d-flex justify-content-start w-30">
                                            <i className="fas fa-comment btn-chat-icon" />
                                        </div>
                                    </div>
                                </button>
                                {
                                    (noOfNewMessages !== 0) && 
                                        <div className="chat-messages-count">
                                            <span className="chat-messages-count-text">{noOfNewMessages}</span>
                                        </div>
                                }
                            </div>
                            {/* <ChatBox 
                                isChatBoxVisible={isChatBoxVisible}
                                profile={{
                                    userId:roomData.id,
                                    name: roomData.name,
                                    roomId: roomData.roomId,
                                    type: roomData.type
                                }}
                                socket={socket}
                                noOfNewMessages={noOfNewMessages}
                                clearNoOfNewMessages={this.clearNoOfNewMessages.bind(this)}
                                isChatAllowed={this.state.isChatPublic || type==="teacher"}
                            /> */}
                        </div>
                    </div>
                    <div className="all-sources-container row" style={{ width: "100%"}}>
                        <div style={{width: isChatBoxVisible? "80%" : "100%"}}> 
                        {/* // className={isChatBoxVisible? "col-9" : "col-12" */}
                            <div className="row w-100" id="teacher-container">
                                <div className="col-md-8 col-sm-8 col-xs-12 w-100" id="large-video-container">
                                    {currentTeacherToggledView==="video" ? this.teacherViews('video' ) : (currentTeacherToggledView==="board" ? this.teacherViews('board') : this.teacherViews('screen'))}
                                    {type === "student" &&
                                        <div className="teacher-student-actions-right d-flex flex-column justify-content-start">
                                            <div onClick={() => this.showSendMessageBox(roomData.sources[0])} 
                                                className="teacher-student-action-right-icon-div d-flex flex-row justify-content-center" 
                                                style={{ backgroundColor: "#fabe11",  }}>
                                                <i className="fas fa-comment student-action-right-icon"></i>
                                            </div>
                                            {
                                                (noOfNewPrivateMessages !== 0) && 
                                                    <div className="chat-messages-count">
                                                        <span className="private-chat-messages-count-text">{noOfNewPrivateMessages}</span>
                                                    </div>
                                            }
                                            <SendChatMessage
                                                isSendMessageBoxVisible={isSendMessageBoxVisible ? true : false} 
                                                selectedSource={selectedSource}
                                                hideMessageBox={this.hideSendMessageBox.bind(this)}
                                                roomData={roomData}
                                                socket= {socket}
                                                studentId={roomData.teacher_id} //now its teacher
                                                studentName={roomData.sources[0].name}
                                            />
                                        </div>
                                    }
                                    <div className="row w-100 d-flex justify-content-center teacher-actions-button-container">
                                        <div id="local-video-actions-box" className="row w-20 h-10">
                                            {
                                                (type === "teacher" || remoteUserSwappedId === id) &&
                                                <Tooltip title={isScreenSharing? "First Stop Screen Share." : ""}>
                                                    <div 
                                                        onClick={() => this.handleScreenShareButton(isScreenSharing)}
                                                        style={{
                                                            fontSize: "1.8rem",
                                                            cursor: "pointer",
                                                            opacity: isScreenSharing?0.8:1,
                                                            marginRight: ".4rem"
                                                        }}>
                                                        <i className="fas fa-desktop" />
                                                    </div>
                                                </Tooltip>
                                            }
                                            {<div 
                                                onClick={() => { this.toggleLocalSource( id, this.state.isLocalAudioMute, 'audio' )}} 
                                                style={{ 
                                                    backgroundImage: `url(${this.state.isLocalAudioMute?"http://api.getmycall.com/static/media/mic-off.svg":"http://api.getmycall.com/static/media/mic-on.svg"})`, 
                                                    backgroundPosition: 'center', 
                                                    backgroundSize: 'cover', 
                                                    backgroundRepeat: 'no-repeat', 
                                                    width: "30px", 
                                                    height: "30px", 
                                                    cursor: "pointer",
                                                    opacity: `${(this.state.isGlobalAudioMute && type === "student")? 0.5 : 1}` }} />}
                                            {<div 
                                                onClick={() => this.toggleLocalSource( id, this.state.isLocalVideoMute, 'video' )} 
                                                style={{ 
                                                    cursor: "pointer", 
                                                    marginLeft: "8px"  
                                                }}><img src={this.state.isLocalVideoMute ? "https://api.getmycall.com/static/media/video-slash-solid.svg" : "https://api.getmycall.com/static/media/video-solid.svg"} 
                                                style={{
                                                    width: "30px", 
                                                    height:"30px",
                                                    opacity: `${(this.state.isVideoMuteByTeacher && type === "student")? 0.5 : 1}` 
                                                }} /></div>}

                                                    {
                                                      type==="teacher" &&
                                                        <div 
                                                            onClick={() => this.handleRecordVideo()}
                                                            style={{
                                                                fontSize: "1.8rem",
                                                                cursor: "pointer",
                                                                color: isRecording?"red": "black",
                                                                marginLeft: ".5rem"
                                                            }}>
                                                                <i className="fas fa-circle" />
                                                            </div>
                                                    }
                                            <div onClick={this.leaveRoomBtn.bind(this)} style={{ backgroundImage: `url(${stopIcon})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', marginLeft: "8px", width: "35px", height: "35px", cursor: "pointer" }} />                            
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 col-sm-4 col-xs-12 w-100" id="teacher-dashboard">
                                    {(currentTeacherToggledView==="video" || currentTeacherToggledView==="board") ? this.teacherViews('screen' ) : (currentTeacherToggledView==="screen" && this.teacherViews('video'))}
                                    {(currentTeacherToggledView==="video" || currentTeacherToggledView==="screen") ? this.teacherViews('board' ) : (currentTeacherToggledView==="board" && this.teacherViews('video'))}
                                </div>
                            </div>
                            {
                                <div className="row w-100 room-global-actions-div d-flex mb-3">
                                    {/* <div className="d-flex mb-3"> */}
                                        {roomData.type=="teacher" && 
                                            <div className="global-actions-button-container">
                                                <button onClick={() => this.toggleGlobalSources( id, "mute-all-students-audio" )} type="button" class="btn btn-primary teacher-actions-button">
                                                    <div className="d-flex flex-row justify-content-center" style={{ marginTop: ".1rem"}}>
                                                        <div className="btn-chat-inner-text d-flex justify-content-end w-70">Mute All</div>
                                                        <div className="global-action-button-icon d-flex justify-content-start w-30">
                                                            {<div style={{cursor: "pointer" }}>
                                                                <i class={`fas ${this.state.isGlobalAudioMute ? "fa-microphone-slash" : "fa-microphone"}`}></i>
                                                            </div>}
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>}
                                        {roomData.type=="teacher" && 
                                            <div className="global-actions-button-container">
                                                <button type="button" className="btn btn-primary teacher-actions-button">
                                                    <div className="d-flex flex-row justify-content-center" style={{ marginTop: ".1rem"}}>
                                                        <div className="btn-chat-inner-text d-flex justify-content-end w-70">Work Time</div>
                                                        <div className="global-action-button-icon d-flex justify-content-start w-30">
                                                            {<div style={{ cursor: "pointer" }} >
                                                                <i class="fas fa-history"></i>    
                                                            </div>}
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        }
                                    {/* </div> */}
                                    <div className="studentsToggleDiv ml-auto" onClick={()=>this.setState({ isStudentsVisible: !isStudentsVisible})}>
                                        <i class={`${isStudentsVisible? "fas fa-arrow-up":"fas fa-arrow-down" }`}></i>
                                    </div>
                                </div>
                            }
                            <div style={{ display: isStudentsVisible? "none" : "flex", paddingTop: type==="student"?"0":"1rem"}} className="row w-100 justify-content-start" id="small-videos-box">
                                {
                                    this.state.roomData && this.state.roomData.sources && (this.state.roomData.sources.length > 1) &&
                                    this.state.roomData.sources.sort(this.sortSources.bind(this)).map(source => {
                                        console.log('sources roomData teacher_id => =>', source, roomData.teacher_id)
                                        if( source.position.toString() !== "0" ) {
                                            let sourceUserId = source.id,
                                                isHandRaised = source.isHandRaised ? source.isHandRaised : false;
                                            return (
                                                <div 
                                                    key={source.position} 
                                                    style={{ 
                                                        padding: isChatBoxVisible? "0rem 0rem 1rem 1rem" : "0rem 0rem 1rem 2.3rem"}} 
                                                        className="student-small-video" 
                                                        id={`student-box-${source.position}`}
                                                        >
                                                    <div id={`video-box-${source.position}`}>
                                                        {
                                                            isFlipEnabled = (
                                                                (type==="teacher") && 
                                                                (currentTeacherToggledView === "video") && 
                                                                allParticipants[sourceUserId] && 
                                                                ( !this.state.remoteUserSwappedId || ( sourceUserId===id ) )
                                                            )
                                                        }
                                                        <video className="student-video-tag" onClick={() => this.flipVideo( source )} 
                                                            style={{ 
                                                                background: "white", 
                                                                cursor: isFlipEnabled ? 'pointer' : 'none', 
                                                                pointerEvents: isFlipEnabled? 'auto': 'none',
                                                                // width: isChatBoxVisible? "85" : "100",
                                                                // height: "5rem"
                                                            }} 
                                                            id={`video-tag-${source.position}`} 
                                                            autoPlay 
                                                            poster="" 
                                                            // width="105" 
                                                            />
                                                        {/* {&& <div className="btn-swap-video" onClick={() => this.flipVideo( source )} style={{ backgroundImage: `url("${iconSwap}")`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', pointerEvents: "all", opacity: "1" }} />} */}
                                                        {/* <div className="btn-mute-unmute" onClick={() => this.toggleAudio( source, isMute )} style={{ backgroundImage: `url(${isMute?micOff:micOn})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', pointerEvents: "none", opacity: "0.5" }} /> */}
                                                        <audio autoPlay id={`audio-tag-${source.position}`} />
                                                        <div className="row w-20 h-10 student-video-actions-top">
                                                            { ( (sourceUserId===id || isHandRaised) && !remoteUserSwappedId ) && <div className="student-video-actions-top-icon" onClick={() => !isHandRaised && this.raiseHand(source)} style={{ cursor: 'pointer' }}><i id={`studenthand-${sourceUserId}`} className="fa fa-hand-point-up"></i></div>} 
                                                            {(source.noOfNewPrivateMessages>0)&&(<div className="student-video-actions-top-icon"><span className="no-of-messages">{source.noOfNewPrivateMessages}</span></div>)}
                                                            {/* <div className="student-video-actions-top-icon" onClick={this.leaveRoomBtn.bind(this)}><i className="fa fa-hand-point-up"></i></div>                        
                                                            <div className="student-video-actions-top-icon" onClick={this.leaveRoomBtn.bind(this)}><i className="fa fa-hand-point-up"></i></div>                                                */}
                                                        </div>
                                                        {( type === "teacher" ) &&
                                                            <div className="student-video-actions-right d-flex flex-column justify-content-start" 
                                                                style={{ 
                                                                    coursor: allParticipants[source.id] ? "pointer" : "default",
                                                                    opacity: allParticipants[source.id] ? "1" : "0.5"
                                                                }}
                                                                >
                                                                <div onClick={() => this.showSendMessageBox(source)} className="student-action-right-icon-div d-flex flex-row justify-content-center" 
                                                                    style={{ 
                                                                        backgroundColor: "#fabe11",
                                                                        cursor: allParticipants[source.id] ? "pointer" : "default"
                                                                     }}>
                                                                    <i className="fas fa-comment student-action-right-icon"></i>
                                                                </div>
                                                                <SendChatMessage
                                                                    isSendMessageBoxVisible={isSendMessageBoxVisible ? (selectedSource.id === source.id ? true: false) : false} 
                                                                    selectedSource={selectedSource}
                                                                    hideMessageBox={this.hideSendMessageBox.bind(this)}
                                                                    roomData={roomData}
                                                                    socket= {socket}
                                                                    studentId={source.id}
                                                                    studentName={source.name}
                                                                />
                                                                <div onClick={() => this.showInputNote(source)} className="student-action-right-icon-div d-flex flex-row justify-content-center" 
                                                                    style={{ 
                                                                        backgroundColor: "#6343AE",
                                                                        cursor: allParticipants[source.id] ? "pointer" : "default"
                                                                    }}>
                                                                    <i class="fas fa-pencil-alt student-action-right-icon"></i>
                                                                </div>
                                                                <InputNote
                                                                    isInputNoteVisible={isInputNoteVisible ? (selectedSource.id === source.id ? true: false) : false} 
                                                                    selectedNoteSource={selectedSource}
                                                                    hideInputNote={this.hideInputNote.bind(this)}
                                                                    student_id={source.id}
                                                                    class_id={roomData.class_id}
                                                                    teacher_id={roomData.id}
                                                                    roomData={roomData}
                                                                />
                                                                <div onClick={() => (source.id !== id) && this.toggleGlobalSources( source.id, "mute-student-video" )} className="student-action-right-icon-div d-flex flex-row justify-content-center" 
                                                                    style={{ 
                                                                        backgroundColor: "#eb4d20",
                                                                        cursor: allParticipants[source.id] ? "pointer" : "default"
                                                                    }}>
                                                                    <i class="fas fa-times student-action-right-icon"></i>
                                                                </div>
                                                            </div>
                                                        }
                                                    </div>
                                                    <div className="student-name" id={`name-box-${source.position}`}>
                                                        <h6 className="student-name-text" align="center">{(remoteUserSwappedId && ((source.id===roomData.teacher_id && type==="student") || (source.id===roomData.id && roomData.type==="teacher" ))) ? allParticipants[remoteUserSwappedId].name : source.name}</h6>
                                                    </div>
                                                </div>
                                            )
                                        }
                                    })
                                }
                            </div>
                        </div>
                        <div className="chat-box-container" style={{ width: isChatBoxVisible? "20%" : "0%", display: isChatBoxVisible ? "block" : "none"}}>
                            <ChatBox
                                isChatBoxVisible={isChatBoxVisible}
                                profile={{
                                    userId:roomData.id,
                                    name: roomData.name,
                                    roomId: roomData.roomId,
                                    type: roomData.type
                                }}
                                socket={socket}
                                noOfNewMessages={noOfNewMessages}
                                clearNoOfNewMessages={this.clearNoOfNewMessages.bind(this)}
                                isChatAllowed={this.state.isChatPublic || type==="teacher"}
                                closeChatBox={() => this.setState({ isChatBoxVisible: false })}
                                />
                        </div>
                    </div>                        
                </div>
            );
        }
    }
}

const mapDispatchToProps = dispatch => {
    return {
      addMessages: (message) => dispatch(addMessages(message))
    }
}

export default connect( null , mapDispatchToProps )(Conference);

// Hj8G9gVgEV9MRq


//things to note
//only one teacher for specific room
//student position should must be unique