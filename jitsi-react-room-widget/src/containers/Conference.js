/* eslint-disable */
import React from 'react';
import { connect } from 'react-redux';
import queryString from 'query-string';
import axios from  'axios';
import Iframe from 'react-iframe';
import { Modal } from 'antd';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
import ItemsLoader from '../assets/img/purple-gif-big.gif';


import bellRing from '../assets/mesg_ting.mp3';

import { webRootUrl, jitsiServerParams, socketSeverEndpoint, jitsiInitOptions } from '../config';

// import teacherBoardLoader from '../assets/img/teacher-board-loader.gif';

const { Option } = Select;

var studentHandRaiseTime = 10*60*1000; //60*1000=>1mint and 10*60*1000=10mint

var connection, isJoined, room;
var screenConnection, isScreenJoined, screenRoom;
var socket;

var allParticipants = {};

var isConnected = false;

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
            socketEndpoint: `${socketSeverEndpoint}/class-rooms`,
            currentTeacherToggledView: 'video',  //three types 1=>video(video at center), 2=>screen and 3=>html
            isChatBoxVisible: false,
            noOfNewMessages: 0,
            noOfNewPrivateMessages: 0,
            isChatPublic: false,
            params: null,
            isGlobalAudioMute: false,
            isVideoMuteByTeacher: false,
            isRecording: false,
            isStudentsVisible: false,
            isWorkingMode: false,
            isStudentHandRaised: false,
            currentScreenMode: 'default',
            isPageEndReached: false,
            noOfStudentsShowing: 10,
            isStudentsTrackUpdate: false,
            appMessage: "Stopped!",
            roomJoinError: ""
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
                    connection = new window.JitsiMeetJS.JitsiConnection(null, null, jitsiServerParams);
                    this.setConnectionListeners();
                    connection.connect();

                    // window.addEventListener(window.JitsiMeetJS.errors.conference.PASSWORD_REQUIRED, function () { message.error('Please provide room password'); });

                    this.setState({ roomData, isChatBoxVisible: (type==="teacher" ? true : false) });
                } else {
                    message.error('Must provide valid user params! See console errors.');
                }
            } else if(response.data && response.data.messge) {
                this.setState({ isLoggedIn: false, roomJoinError: response.data.messge });
            }
        }
        let $ = window.jQuery;
        $(window).bind('beforeunload', this.unload.bind(this));
        $(window).bind('unload', this.unload.bind(this));

        document.addEventListener('scroll', this.trackScrolling);
    }
    isBottomOfDiv(el) {
        if (el.getBoundingClientRect()){
            return el.getBoundingClientRect().bottom <= window.innerHeight;
        }
        return false
    }

    trackScrolling = () => {
        const endPageElement = document.getElementById('end-of-page-div');

        if (endPageElement && this.isBottomOfDiv(endPageElement)) {
            console.log('=== page end reached ===');
            this.setState({ noOfStudentsShowing: this.state.noOfStudentsShowing+10, isStudentsTrackUpdate: true });
        }

        if(window.pageYOffset <= 15) {
            console.log('=== page start reached ===');
            this.setState({ noOfStudentsShowing: 10 }); //show 10 students when at top of page or atleast 10 offset
        }
    };
    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error(error, errorInfo);
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
                case 'videos-swapped':
                    let that=this;
                    let { roomData } = this.state;
                    if ( data.isRoomJoinResponse && data.remoteUserSwappedId && data.selectedSource ) {
                        function waitForParticipant(){
                            console.log('interval running to check value', allParticipants, data)
                            if( allParticipants[data.remoteUserSwappedId] && allParticipants[data.teacherId] &&
                                ( allParticipants[data.remoteUserSwappedId].tracks || allParticipants[data.remoteUserSwappedId].screenTracks ) &&
                                allParticipants[data.teacherId].tracks
                            ){
                                that.flipVideo( data.selectedSource , data.teacherId, data.remoteUserSwappedId );
                                message.info(`Student ${data.remoteUserSwappedId} flipped to middle`);
                            }
                            else{
                                console.log('interval running to check value', allParticipants)
                                setTimeout(waitForParticipant, 250);
                            }
                        }
                        if ( data.selectedSource.id !== data.teacherId ) {
                            waitForParticipant();
                        }
                    } else {
                        this.flipVideo( data.selectedSource , data.teacherId, data.remoteUserSwappedId );
                        message.info(`Student ${data.remoteUserSwappedId} flipped to middle`);
                    }
                    break;
                case 'teacher-view-change':
                    this.toggleTeacherView( data.currentTeacherToggledView );
                    break;
                case 'board-change':
                    this.handleChangeBoard(data.selectedBoard);
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
                    if (this.state.roomData.type === "student"){this.toggleLocalAudioByTeacher(data.mute)}
                    else if (this.state.roomData.type === "teacher") { this.setState({ isGlobalAudioMute: data.mute }) }
                    break;
                case 'mute-student-video':
                    this.toggleLocalVideoByTeacher(data.mute);
                    break;
                // case 'student-screen-share-on':
                //     this.handleStudentScreenShare(data);
                //     break;
                case 'screen-share-stop':
                    this.handleScreenShareStop(false, data.id);
                    break;
                case 'switch-global-working-mode':
                    let isLocal = this.state.roomData.id === data.id;
                    this.switchToGlobalWorkingMode(data.isWorkingMode, isLocal);
                    break;
                case 'message-undefined':
                    console.error('socketio server message type undefined!')
                    break;
                case 'teacher-joined-room':
                    message.info('Teacher is in the class.');
                    $('body').append($(`<embed src=${bellRing} autostart="false" width="0" height="0" id="sound1"
                        enablejavascript="true" />`));
                    break;
                case 'teacherLeaveRoom':
                    message.info('Teacher Leave room.');
                    // window.location.reload()
                    break;
                case 'error':
                    console.log('error when processing socketio request => ', data.error)
                default:
                    console.error('socketio server message type undefined!', data);
            }
        });
    }


    componentDidUpdate ( prevProps, prevState ) {
        let { isTrackUpdate, isScreenTrackUpdate, isStudentsTrackUpdate } = this.state;
        if ( isTrackUpdate || isScreenTrackUpdate || isStudentsTrackUpdate ) {
            let allParticipantsIds = Object.keys( allParticipants );
            allParticipantsIds.forEach( participantId => {
                this.mapTracksOnTags( isTrackUpdate, isScreenTrackUpdate, participantId, isStudentsTrackUpdate );
            });
        }

        if ( prevState.isScreenSharing !== this.state.isScreenSharing ) {
            let ids= Object.keys(allParticipants);
            try {
                ids.forEach(id => {
                    if (allParticipants[id].screenTracks[0]) {
                        screenTracks.forEach( track => {
                            let screenVideo = $(`#teacher-screen-share-video`)[0];
                            track.detach(screenVideo)
                        })
                    }
                })
            } catch(error) {
                console.log('something went wrong when detaching screen share tag.')
            }
        }
    }

    mapTracksOnTags = ( isTrackUpdate=false, isScreenTrackUpdate=false, participantId, isStudentsTrackUpdate=false ) => {
        let participant = allParticipants[participantId];
        console.log('participant =>', participant)
        let { roomData } = this.state;

        if ( isTrackUpdate  ) {
            let participantTracks = participant.tracks;
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

                        if ( participantId === roomData.id && largeAudioTag ) {
                            largeAudioTag.muted = true;
                        } else {
                            largeAudioTag.muted = false;
                        }

                    }
                }
            } else { //if position not zero then map all other as small videos
                for ( let i = 0; i < participantTracks.length ; i++ ) {
                    if (participantTracks[i].getType() === 'video') {
                        if ( this.state.remoteUserSwappedId && participant.type === "teacher" ) { //if remoteUserSwappedId means flip Enabled and also if participant in loop is teacher then map to screen div
                            console.log('mapping onto teacher screen share div => =>', participant, this.state.remoteUserSwappedId, allParticipants)
                            let studentVideoTag = $(`#video-tag-${participant.position}`);
                            let teacherVideoTag = $(`#teacher-screen-share-video`);
                            participantTracks[i].attach(teacherVideoTag[0]);

                            if (studentVideoTag && studentVideoTag[0]){
                              participantTracks[i].detach($(`#video-tag-${participant.position}`)[0]); //also detach from small div
                            }
                        } else {
                            console.log('attaching participant => =>', participant)
                            if ($(`#video-tag-${participant.position}`) && $(`#video-tag-${participant.position}`)[0]){
                                participantTracks[i].attach($(`#video-tag-${participant.position}`)[0]);
                            }
                            !this.state.remoteUserSwappedId && !this.state.isScreenSharing && participantTracks[i].detach($(`#teacher-screen-share-video`)[0]); //also detach from screen share div if it was before
                        }
                    } else {
                        if($(`#audio-tag-${participant.position}`) && $(`#audio-tag-${participant.position}`)[0]) {
                          participantTracks[i].attach($(`#audio-tag-${participant.position}`)[0]);
                        }
                        //for teacher audio mapped on small div no need to map on screen share div
                        let audioTag = document.getElementById(`audio-tag-${participant.position}`);
                        if ( audioTag ) {
                            if ( participantId === roomData.id ) {
                                audioTag.muted = true;
                            } else {
                                audioTag.muted = false;
                            }
                        }
                    }
                }
            }
            this.setState({ isTrackUpdate: false });
        } else if (isStudentsTrackUpdate) {   //update only from 10 to 20 or 30
            let participantTracks = participant.tracks;
            if (participant.position > 0 && participant.type !== 'teacher') { //if !teacher
                for ( let i = 0; i < participantTracks.length ; i++ ) {
                    if ( participantId)
                    if (participantTracks[i].getType() === 'video') {
                        if ($(`#video-tag-${participant.position}`) && $(`#video-tag-${participant.position}`)[0]) {
                            participantTracks[i].attach($(`#video-tag-${participant.position}`)[0]);
                        }
                    }else{
                        if ($(`#audio-tag-${participant.position}`) && $(`#audio-tag-${participant.position}`)[0]) {
                            participantTracks[i].attach($(`#audio-tag-${participant.position}`)[0]);
                        }
                    }
                }
            }
            this.setState({ isStudentsTrackUpdate: false })
        } else if ( isScreenTrackUpdate ) {
            let screenTracks = participant.screenTracks;
            if ( screenTracks[0] ) {
                this.setState({ isScreenTrackUpdate: false, isScreenSharing: true });

                screenTracks.forEach( track => {
                    if ( participant.type === "student" ) {
                        let screenVideo = $(`#teacher-video-tag`)[0];
                        track.attach(screenVideo);
                        // if ( screenRoom && this.state.roomData.type === "teacher" ) {
                        //     screenRoom.addTrack(track);
                        // }
                    } else {
                        let screenVideo = $(`#teacher-screen-share-video`)[0];
                        track.attach(screenVideo)
                        // if ( screenRoom && this.state.roomData.type === "teacher" ) {
                        //     screenRoom.addTrack(track);
                        // }
                    }
                })
            }
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

            window.JitsiMeetJS.mediaDevices.addEventListener(
                JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED,(devices) => {
                    console.log('devices list changed => ', devices);
                    message.info("Devices List Changed.")
                });
            window.JitsiMeetJS.mediaDevices.isDevicePermissionGranted().then( isGranted=>{
                if ( !isGranted ) {
                    message.error("Unable To Access Media Devices. ")
                    console.log('devices permission not granted => =>', isGranted)
                }
            })

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
            console.log('settting resolution ==> ', bitrate)
            room.setSenderVideoConstraint(bitrate);
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
    onUserLeft ( ownerEndpointId ) {
        try {
            let participantId = Object.keys(allParticipants).filter( participant => {
                return allParticipants[participant]['ownerEndpointId'] === ownerEndpointId
            });
            let participant = allParticipants[participantId];
            if ( participant ) {
                let position = participant.position;
                let tracks = participant['tracks'];
                let screenTracks = participant['screenTracks'];
                console.log('user left => =>', tracks, screenTracks)
                let $ = window.jQuery;
                if ( tracks && tracks[0] ) {
                    tracks.forEach(( track ) => {
                        track.dispose();
                    });
                }
                if ( screenTracks && screenTracks.length>0 ) {
                    screenTracks.forEach(( screenTrack ) => {
                        let screenVideoTag = $(`#teacher-screen-share-video`)[0];
                        screenVideoTag && screenTrack.detach(screenVideoTag)
                        screenVideoTag && screenTrack.dispose();
                    });
                }
                console.log('allparticipants before user left => => ', Object.keys(allParticipants))
                delete allParticipants[participantId];
                console.log('allparticipants after user left => => ', Object.keys(allParticipants))
                this.setState({ isTrackUpdate: true })
            }
        } catch (error) {
            console.log('something went wrong when clearing remote user sources --->', error);
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
            // if ( !this.state.isWorkingMode || this.state.roomData.type === "teacher" ) {
                this.mapTracksOnTags( false, true, id );
                console.log('remote track received. => =>',track );
            // }
        } else {
            if ( !allParticipants[id] ) {
                let newParticipant = {};
                newParticipant['name'] = name;
                newParticipant['type'] = type;
                newParticipant['position'] = position.toString();
                newParticipant['ownerEndpointId'] = track.ownerEndpointId? track.ownerEndpointId : "";
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

            // if ( !this.state.isWorkingMode || this.state.roomData.type === "teacher" ) {
                this.mapTracksOnTags( true, false, id );
            // }
        }
    }

    onTrackMute = ( id, track ) => {
        let isLocal = id === this.state.roomData.id;
        if ( allParticipants[id] && allParticipants[id].name ) {
            if ( track.getType() === "audio" ) {
                message.info(`${allParticipants[id].name} ${track.isMuted() ? " Mic Off" : " Mic On"}`);
                if ( !this.state.isGlobalAudioMute ) {
                    isLocal && this.setState({ isLocalAudioMute: track.isMuted()});
                }
            } else if ( track.getType() === "video" ) {
                message.info(`${allParticipants[id].name} ${track.isMuted() ? " Video Off" : " Video On"}`);
                isLocal && this.setState({ isLocalVideoMute: track.isMuted()});

                if ( !this.state.isWorkingMode ) {
                    this.setState({ isTrackUpdate: true, isScreenTrackUpdate: true})
                }

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
        try {
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
        } catch (error) {
            console.log('something went wrong when removing track ---> ', error);
        }

    }

    unload = ( shouldStopScreenOnly= false ) => {
        let id = this.state.roomData.id;
        if (allParticipants[id]) {
            let localTracks = allParticipants[id]['tracks'];
            if ( shouldStopScreenOnly ) {
                this.clearScreenShareResources(id);
            } else {
                for (let i = 0; i < localTracks.length; i++) {
                    localTracks[i].dispose();
                }

                this.clearScreenShareResources(id); //if screen share on then clear that as well

                room.leave();
                connection.disconnect();
                room = null;
                connection = null;

                socket.disconnect();
        
                // if ( redirectToMainPage ) {
                window.location.href = webRootUrl;
                // } else {
                    this.setState({ isLoggedIn: false, isStopped: true });
                // }
            }
        }
    }
    clearScreenShareResources = (id) => {
        let screenTracks = allParticipants[id]['screenTracks'];
        if ( screenTracks[0] ) {
            for (let j = 0; j < screenTracks.length; j++) {
                let screenVideoTag = $(`#teacher-screen-share-video`)[0];
                screenTracks[j].detach(screenVideoTag)
                screenTracks[j].dispose();
            }
            screenRoom && screenRoom.leave();
            screenConnection && screenConnection.disconnect();;
            screenRoom = null;
            screenConnection = null;
        }
    }

    componentWillUnmount () {
        if ( connection && room ) {
            this.unload();
        }
    }

    leaveRoomBtn = (e) => {
        this.unload();
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
        room.setSenderVideoConstraint(value);
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
        const { roomData, isStudentHandRaised } = this.state;
        if ( this.state.isStudentHandRaised ) {
            message.warning('You already raised your hand!');
            return
        }
        let studentHand = document.getElementById(`studenthand-${source.id}`);
        studentHand.style.backgroundColor = "white";

        let messageObject = { type: 'hand-raised', data: { selectedSource: source, studentId: roomData.id, roomId: roomData.roomId } };
        socket.emit( 'event', messageObject);

        setTimeout(() => {
            studentHand.style.backgroundColor = "#d0f543";
            this.setState({ isStudentHandRaised: false });
        }, studentHandRaiseTime);

        this.setState({ isStudentHandRaised: true });
    }
    remoteStudentHandRaised = ( remoteSource ) => {
        this.updateHandRaised(remoteSource, true);

        setTimeout(()=>{
            this.updateHandRaised(remoteSource, false);
        }, studentHandRaiseTime)
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

    toggleLocalAudioByTeacher = async ( mute ) => {
        if (mute) { message.warning("Teacher Mute all");
        } else if (!mute) { message.success("Now all Mic's have previous states."); }

        if ( mute ) {
            this.setState({ isGlobalAudioMute: mute });
            await this.toggleLocalSource( this.state.roomData.id, mute, "audio", true );
        } else {
            this.setState({ isGlobalAudioMute: mute });
            console.log('thi.isLocalAudioMute', this.state.isLocalAudioMute)
            await this.toggleLocalSource( this.state.roomData.id, this.state.isLocalAudioMute, "audio", true );  //retain previous state
        }
    }
    toggleLocalVideoByTeacher = async ( mute ) => {
        if (mute) { message.warning('Teacher Stopped your Video!');
        } else if (!mute) { message.success('Teacher Started your Video'); }
        await this.toggleLocalSource( this.state.roomData.id, mute, "video", true );
        this.setState({ isVideoMuteByTeacher: mute });
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

    switchToGlobalWorkingMode = ( isWorkingMode, isLocal = true ) => {
        console.log('switch working mode', isWorkingMode, isLocal)
        try {
            if ( isLocal ) {
                let messageObject = {
                    type: 'switch-global-working-mode',
                    data: {
                        id: this.state.roomData.id,
                        roomId: this.state.roomData.roomId,
                        isWorkingMode
                    }
                };
                // this.handleScreenShareStop(true); //stop screen share before starting working mode
                socket.emit( 'event', messageObject);
                if ( isWorkingMode ) {
                    this.setState({ isWorkingMode, isGlobalAudioMute: isWorkingMode });  //mute all audios button have no importance when working mode
                }else {
                    this.setState({ isWorkingMode, isGlobalAudioMute: isWorkingMode, isTrackUpdate: true });  //mute all audios button have no importance when working mode
                }
            } else if(this.state.roomData.type === "student") {
                if ( this.state.isScreenSharing ) {
                    if ( isWorkingMode ) {
                        this.setState({ isWorkingMode, isTrackUpdate: true }); //adding this line before toggle so it will not affect toggle local audio
                    } else {
                        this.setState({ isWorkingMode, isTrackUpdate: true, isScreenTrackUpdate: true }); //adding this line before toggle so it will not affect toggle local audio
                    }
                }else{
                    this.setState({ isWorkingMode, isTrackUpdate: true }); //adding this line before toggle so it will not affect toggle local audio
                }
                this.toggleLocalAudioByTeacher(isWorkingMode);
                // this.toggleLocalVideoByTeacher(isWorkingMode);
            }
        } catch(error){
            console.error('error when switching to global mode.', error)
        }

    }


    flipVideo = ( source, teacherId, remoteUserSwappedId ) => {
        if ( this.state.isScreenSharing ) {
            return;
        }
        try {
            console.log('change this source with teacher video div => => ', this.state.roomData.sources, source, teacherId, remoteUserSwappedId);
            // *** source id used to swap with teacher div

            remoteUserSwappedId = remoteUserSwappedId ? remoteUserSwappedId : this.state.remoteUserSwappedId; //in case of student pass through params.
            //send source, teacherId, remoteUserSwappedId
            //remote student have allParticipants, sources

            let roomData = this.state.roomData;
            let tempSource= Object.assign({}, source);
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
                        if ( roomData.type === "student" && remoteUserSwappedId === roomData.id ) {
                            allParticipants[remoteUserSwappedId].tracks.forEach( track => {
                                if ( track.getType() === 'audio' ) {
                                    console.log('current swap track => =>', track)
                                    if ( !track.isMuted() ) {
                                        track.mute();
                                    }
                                }
                            });
                            room.setSenderVideoConstraint('180'); //manually setting small box at 180
                        }
                        return sourceElement;
                    }
                    else
                    if ( sourceElement.id === teacherId.toString() ) {
                        sourceElement.position = "0";  //revert teacher back to 0 in sources
                        if ( this.state.roomData.type === "teacher" ) {
                            // allParticipants[teacherId].tracks.forEach( track => {
                            //     if ( track.getType() === 'audio' ) {
                            //         track.unmute();
                            //     }
                            // });
                            room.setSenderVideoConstraint(roomData.bitrate);
                        }
                        return sourceElement;
                    }
                    return sourceElement;
                });
                if ( this.state.isScreenSharing ) {
                    this.setState({ roomData, isTrackUpdate: true, isScreenTrackUpdate: true, remoteUserSwappedId: null });
                } else {
                    this.setState({ roomData, isTrackUpdate: true, remoteUserSwappedId: null });
                }
            } else { //when click on student
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
                            if ( this.state.roomData.type === "student" && remoteUserSwappedId === roomData.id ) {
                                allParticipants[sourceId].tracks.forEach( track => {
                                    if ( track.getType() === 'audio' ) {
                                        track.unmute();
                                    }
                                });
                                room.setSenderVideoConstraint('720'); //set student bitrate at 720
                            }
                        } else if ( allParticipants[id].type === "teacher" ) {
                            allParticipants[id].position = sourcePosition; //change teacher position to student div
                            if ( this.state.roomData.type === "teacher" ) {
                                // allParticipants[id].tracks.forEach( track => {
                                //     if ( track.getType() === 'audio' ) {
                                //         track.mute();
                                //     }
                                // });
                                room.setSenderVideoConstraint('180'); //set teacher bitrate to 180
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
                this.setState({ isScreenSharing: true });
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

            if ( isScreenJoined ) {
                console.log('screen tracks => =>', tracks)
                screenRoom.addTrack(tracks[i]);
            }
            this.setState({ isScreenTrackUpdate: true });
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

            this.unload( true ); //clear screen resources

            if ( allParticipants[id] ) {
                allParticipants[id].screenTracks = [];
            }
        } else {
            if ( remoteScrenUserId && allParticipants[remoteScrenUserId] ) {
                allParticipants[remoteScrenUserId].screenTracks = [];
            }
        }
        if ( this.state.currentTeacherToggledView !== "board" )  {
            this.toggleTeacherView( 'video' ); //after screen share stop move teacher back to center
        }
        this.setState({ isScreenSharing: false, isTrackUpdate: true, isScreenTrackUpdate: true });
    }

    //jitsi supports only one video track at a time so we creating new connection for screen share separately
    handleScreenShareButton = ( isScreenSharing ) => {
        let { type } = this.state.roomData;
        if(type==="teacher" && this.state.currentTeacherToggledView==="board"){
            return;
        }
        if ( !isScreenSharing && ( (type === "teacher" && !this.state.remoteUserSwappedId) || type==="student") ) {
            this.startScreenshareProgress(); //show progress for screenshare on
            screenConnection = new window.JitsiMeetJS.JitsiConnection(null, null, jitsiServerParams);

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

    handleChangeBoard = ( selectedBoard ) => {
        const { roomData } = this.state;
        // const selectedBoard = roomData.board_sources ? (roomData.board_sources[index] ? roomData.board_sources[index] : null) : null;
        if ( roomData.type === "teacher" && selectedBoard ) {
            let messageObject = { type: 'board-change', data: { teacherId: roomData.id, selectedBoard, roomId: roomData.roomId } };
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
        this.handleChangeBoard( selectedBoard )
    }

    toggleTeacherView = ( view ) => {
        console.log('update view => ', view)
        let { roomData } = this.state;
        if (view==='board' && this.state.remoteUserSwappedId){
            return;
        }
        this.setState({ isTrackUpdate: true, isScreenTrackUpdate: true, currentTeacherToggledView: view })
        // }
        if ( roomData.type === "teacher" ) {
            if ( view === "board" ) {
                this.unload( true ); //stop screen share when work on middle
            }
            let messageObject = { type: 'teacher-view-change', data: { currentTeacherToggledView: view, teacherId: roomData.id, roomId: roomData.roomId } };
            socket.emit( 'event', messageObject);
        }
    }

    teacherViews = ( viewType ) => {
        const { currentTeacherToggledView, roomData,
                isScreenSharing, remoteUserSwappedId, isChatBoxVisible,
                selectedBoard, currentScreenMode } = this.state;
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
                <div className={`${((currentTeacherToggledView!=="video"||remoteUserSwappedId)&&currentScreenMode!=="default")?"video-div-screen-mode":""} ${(this.state.isWorkingMode && type === "student") ? "teacher-video-div-working-mode" : "w-100 teaher-video-div"} ${(currentTeacherToggledView === "video") ? (isChatBoxVisible? (currentScreenMode==="chatMode"?"teacher-div-large-with-chat-mode":"teacher-div-large-with-chat") : (currentScreenMode==="default"?"teacher-div-large":"teacher-div-large-full-screen-mode")) : (isChatBoxVisible? "teacher-div-small-with-chat": "teacher-div-small")}`}
                    style={{
                        marginRight: (currentTeacherToggledView==="board"||currentTeacherToggledView==="screen"||remoteUserSwappedId)?"1.5rem":""
                    }}
                    >
                    <Tooltip title={( ( currentTeacherToggledView === "screen") && ( type === "teacher" ) )? "Flip Back to Center." : ""}>
                        <video
                            style = {{
                                pointerEvents: ( ( currentTeacherToggledView === "screen" ) && ( type === "teacher" ) )?"auto":"none",
                                cursor: ( ( currentTeacherToggledView === "screen" ) && ( type === "teacher" ) )?"pointer":"default",
                                border: currentTeacherToggledView==="video"?( currentScreenMode==="fullPageMode"?"12px double #9670e3":""):""
                            }}
                            onClick={() => this.toggleTeacherView( 'video' )}
                            id="teacher-video-tag" autoPlay />
                    </Tooltip>
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
                    {/* {
                        (currentTeacherToggledView === "board" || currentTeacherToggledView === "screen") && ( type === "teacher" ) &&
                            <div className="btn-swap-screen" onClick={() => this.toggleTeacherView( 'video' )} style={ customStyle.btnSwapScreen } />
                    } */}
                </div>);
        } else if ( viewType === "board" ) {
            return (
                <div className={`${currentScreenMode==="default"?"teacher-board-div-normal-mode":"teacher-board-div-screen-mode"} ${(this.state.isWorkingMode && type === "student")? "teacher-board-div-working-mode" : "teacher-board-div-normal-mode"} ${currentTeacherToggledView === "board" ? (isChatBoxVisible? (currentScreenMode==="chatMode"?"teacher-div-large-full-screen-mode":"teacher-div-large-with-chat") : (currentScreenMode==="default"?"teacher-div-large":"teacher-div-large-full-screen-mode")) : (isChatBoxVisible? "teacher-div-small-with-chat": "teacher-div-small")}`}
                    style={{
                        border: currentTeacherToggledView==="board" ?( currentScreenMode==="fullPageMode"?"12px double #9670e3":""):""
                    }}
                    >
                    <div style={{ width: "100%", height: "100%" }}> { this.iframe() }</div>
                    {/* with loader <div style={ customStyle.iframeLoader} dangerouslySetInnerHTML={ this.iframe() } /> */}
                    {
                        type==="teacher" &&
                            <div  className="change-board-view d-flex flex-row justify-content-center">
                                <div className="change-board-view-button">
                                    <Select
                                        defaultValue="Choose View"
                                        onChange={(index) => this.handleChangeBoard(roomData.board_sources[index])}
                                        className="change-board-button"
                                    >
                                        {roomData.board_sources.map( ( board, index ) => (
                                        <Option key={index}>{board.name}</Option>
                                        ))}
                                    </Select>
                                </div>
                            </div>

                    }
                    { (selectedBoard && selectedBoard.type === "multipart" && type === "teacher") &&
                        <div className="change-board-arrows d-flex flex-row justify-content-between">
                            <div className="change-board-left">
                                <i onClick={()=>this.changeInnerBoard("left")} className="fas fa-arrow-left"></i>
                            </div>
                            <div className="change-board-right">
                                <i onClick={()=>this.changeInnerBoard("right")} className="fas fa-arrow-right"></i>
                            </div>
                        </div>
                    }
                    {/* {
                        (currentTeacherToggledView === "video") && ( type === "teacher" ) && !remoteUserSwappedId &&
                            <div className="btn-swap-screen" style={ customStyle.btnSwapScreen } />
                    } */}
                </div>
            );
        } else if ( viewType === "screen" ) {
            return (
                <div className={`${currentScreenMode==="default"?"teacher-screen-share-div-normal-mode":"teacher-screen-share-div-screen-mode"} ${currentTeacherToggledView === "screen" ? (isChatBoxVisible? (currentScreenMode==="chatMode"?"teacher-div-large-with-chat-mode":"teacher-div-large-with-chat") : (currentScreenMode==="default"?"teacher-div-large":"teacher-div-large-full-screen-mode")) : (isChatBoxVisible? "teacher-div-small-with-chat": "teacher-div-small")}`}
                    style={{
                        border: currentTeacherToggledView==="screen"? (currentScreenMode==="fullPageMode"?"12px double #9670e3":""): "",
                        marginRight: currentTeacherToggledView==="video"?"1.5rem":""
                    }}
                    >
                    <Tooltip title={( (currentTeacherToggledView === "video") && isScreenSharing && ( type === "teacher" ) && !remoteUserSwappedId )? "Flip to Center." : ""}>
                        <video id="teacher-screen-share-video"
                            style = {{
                                pointerEvents: ( (currentTeacherToggledView === "video") && isScreenSharing && ( type === "teacher" ) && !remoteUserSwappedId )?"auto":"none",
                                cursor: ((currentTeacherToggledView === "video") && isScreenSharing && ( type === "teacher" ) && !remoteUserSwappedId )?"pointer":"default",
                            }}
                            onClick={() => this.toggleTeacherView( 'screen' )}
                            autoPlay
                            poster="https://miro.medium.com/max/3200/0*-fWZEh0j_bNfhn2Q" />
                        {/* {(type === "teacher") &&<div className="btn-start-screen" onClick={() => this.handleScreenShareButton(this.state.isScreenSharing)} style={ customStyle.btnStartScreen} />} */}
                        {/* {
                            (currentTeacherToggledView === "video") && isScreenSharing && ( type === "teacher" ) && !remoteUserSwappedId &&
                                <div className="btn-swap-screen" onClick={() => this.toggleTeacherView( 'screen' )} style={ customStyle.btnSwapScreen } />
                        } */}
                    </Tooltip>

                </div>
            );
        }
    }

    toggleChatBox = () => {
        if (this.state.currentScreenMode === "default" ) {
            this.setState({isChatBoxVisible: true });
        } else if ( this.state.currentScreenMode === "fullPageMode") {
            this.setState({ currentScreenMode: "default", isChatBoxVisible: true });
        }
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
            this.clearNoOfNewPrivateMessages( source );
            this.setState({ selectedSource: source, isSendMessageBoxVisible: true, isInputNoteVisible: false });
        }
    }
    hideSendMessageBox = () => {
        this.setState({ selectedSource: null, isSendMessageBoxVisible: false });
    }

    clearNoOfNewMessages = () => {
        this.setState({ noOfNewMessages: 0 });
    }
    clearNoOfNewPrivateMessages = ( source ) => {
        let { roomData } = this.state;
        if ( source ) {
            roomData.sources.forEach(el=> {
                if ( el.id === source.id ) {
                    if ( source['noOfNewPrivateMessages'] ) {
                        source['noOfNewPrivateMessages'] = 0;
                    }
                }
            })
            this.setState({ roomData, noOfNewPrivateMessages: 0 })
        }
    }

    startScreenshareProgress = () => toast.info('Starting Screen Share', {
                                                position: "top-center",
                                                autoClose: 4000,
                                                hideProgressBar: false,
                                                closeOnClick: true,
                                                pauseOnHover: false,
                                                draggable: true,
                                                progress: undefined,
                                            });

    changeScreenMode = ( mode ) => {
        const { currentScreenMode } = this.state;
        if ( mode === currentScreenMode ) {
            this.setState({ currentScreenMode: "default" });
        } else {
            if ( mode === "chatMode" ) {
                this.setState({ isChatBoxVisible: true });
            } else if ( mode === "fullPageMode" ) {
                this.setState({ isChatBoxVisible: false });
            }
            this.setState({ currentScreenMode: mode });
        }
    }
    closeChatBox = () => {
        if (this.state.currentScreenMode === "default" ) {
            this.setState({ isChatBoxVisible: false })
        }
    }

    // selectStudentsButton = () => {
    //     return(
    //         <Select defaultValue="1-10" style={{ width: 80 }} onChange={console.log('handle change')}>
    //             <Option value="1-10">1-10</Option>
    //             <Option value="11-20">11-20</Option>
    //             <Option value="21-30">21-30</Option>
    //         </Select>);
    // }

    render () {
        const { params, isLoggedIn, roomData,
            currentTeacherToggledView, noOfNewMessages,
            isChatBoxVisible, isInputNoteVisible, selectedSource,
            isSendMessageBoxVisible, isGlobalAudioMute,
            isScreenSharing, remoteUserSwappedId, isRecording,
            isStudentsVisible, noOfNewPrivateMessages, isWorkingMode,
            isLocalAudioMute, isLocalVideoMute, currentScreenMode,
            noOfStudentsShowing, appMessage, roomJoinError } = this.state;
        const { roomId, id, name, type } = roomData;

        let isFlipEnabled = false;
        let isTeacherMuteStudentVideo = false;

        if ( !params.id || !params.type || !params.class_id ) {
            return <div className="container" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
                <p style={{ fontSize: "35px", color: "#ff4d4f" }}>Please provide room info</p>
            </div>
        } else if ( !isLoggedIn ) {
            return (<div style={{ paddingLeft: "0px", paddingRight: "0px", width: "100vw", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
                {this.state.isStopped ? <p style={{ fontSize: "35px", color: this.state.isStopped? "red" : "black" }}> {appMessage} </p> :
                // <div style={{ width: "100%" }}>
                //     <img src={loadingIcon} alt="" width="100%" height="100%" />
                // </div>}
                (roomJoinError!==""?
                    <p style={{ fontSize: "35px", color: "red" }}> {roomJoinError} </p>
                    :
                    <div className="justify-content-center" style= {{ width: "100%", height: "100%", top: "50%", backgroundColor: 'white' }}>
                        <img src={`https://api.getmycall.com/static/media/loading-icon.gif`} alt="" width="200" height="200" style={{ marginTop: "120px" }} />
                    </div>)
                }
                {/* {this.state.isStopped && <Button onClick={()=> this.joinRoom()} type="primary"> Join Again </Button>} */}
            </div>)
        }
        else
         {
            return (
                <div className="w-100 h-100">
                    <ToastContainer
                        position="top-right"
                        autoClose={4000}
                        hideProgressBar={false}
                        newestOnTop={false}
                        closeOnClick
                        rtl={false}
                        draggable
                        pauseOnFocusLoss={false}
                        pauseOnHover={false}
                    />
                    <div style={{ width: "100%", display: (this.state.isWorkingMode && type==="student")? "none": "block"}}>
                        <div className="row w-100 d-flex justify-content-between" id="classroom-header">
                            <div className="time-box-container d-flex flex-row justify-content-between">
                                <div className="back-button-container">
                                    <button onClick={()=>this.leaveRoomBtn()} type="button" className="btn btn-primary main-button">
                                        <div className="d-flex flex-row justify-content-center">
                                            <div className="d-flex justify-content-start w-30">
                                                <i className="fa fa-arrow-left btn-back-icon" aria-hidden="true" />
                                            </div>
                                            <div className="btn-chat-inner-text d-flex justify-content-end w-70">Go Back</div>
                                        </div>
                                    </button>
                                </div>
                                <div className="time-box-info">
                                    <span className="time-start">08:30</span>  -  <span className="time-end">09:15</span>
                                </div>
                            </div>
                            <div className="class-room-header-info d-flex flex-column justify-content-center">
                                <RoomAnnouncement
                                    id={roomData}
                                    roomId={roomData.roomId}
                                    announcment={roomData.announcment}
                                    type={roomData.type}
                                    socket={socket}
                                    handleChangeAnnouncement={(e) => this.handleChangeAnnouncement(e)}
                                />
                            </div>
                            <div className="main-button d-flex flex-column justify-content-start">
                                <div className="chat-button-container">
                                    <button onClick={()=>this.toggleChatBox()} type="button" className="btn btn-primary main-button"
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
                            </div>
                        </div>
                        <div className="all-sources-container row" style={{ width: "100%" }}>
                        <div style={{width: isChatBoxVisible? "80%" : "100%"}}>
                        {/* // className={isChatBoxVisible? "col-9" : "col-12" */}
                            {(type==="teacher" || (type==="student"&& !isWorkingMode)) &&
                                <div className="row w-100" id="teacher-container">
                                    <div className={`${currentScreenMode!=="default"?"col-md-12 col-sm-12":"col-md-8 col-sm-8"} col-xs-12 w-100`} id={currentScreenMode==="default"?"large-video-container":"large-video-container-full-screen-mode"}>
                                        {currentTeacherToggledView==="video" ? this.teacherViews('video' ) : (currentTeacherToggledView==="board" ? this.teacherViews('board') : this.teacherViews('screen'))}
                                        {type === "student" &&
                                            <div className={`teacher-student-actions-right d-flex flex-column justify-content-start`}>
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
                                                    noOfNewPrivateMessages={noOfNewPrivateMessages}
                                                    clearNoOfNewPrivateMessages={this.clearNoOfNewPrivateMessages.bind(this)}
                                                />
                                            </div>
                                        }
                                        <div className={`row w-100 d-flex  ${currentScreenMode==="default"?"teacher-actions-button-container-normal-mode":"teacher-actions-button-container-view-mode"}`}>
                                            <div id="main-video-actions-box-left" className="row"/>
                                            <div id="main-video-actions-box-center" className="row">
                                                <div className="main-video-actions-box-center-content d-flex flex-row justify-content-center">
                                                    {
                                                        (type === "teacher" || remoteUserSwappedId === id) &&
                                                        <Tooltip title={((currentTeacherToggledView==="board"||remoteUserSwappedId)  && type==="teacher")?"First move teacher to center.":""}>
                                                            <div
                                                                onClick={() => this.handleScreenShareButton(isScreenSharing)}
                                                                style={{
                                                                    fontSize: "1.8rem",
                                                                    cursor: "pointer",
                                                                    opacity: ( isScreenSharing || (remoteUserSwappedId && type === "teacher") )?0.8:1,
                                                                    marginRight: ".4rem"
                                                                }}>
                                                                <i className="fas fa-desktop" />
                                                            </div>
                                                        </Tooltip>
                                                    }
                                                    {<div
                                                        onClick={() => { this.toggleLocalSource( id, isLocalAudioMute, 'audio' )}}
                                                        style={{
                                                            cursor: "pointer",
                                                            marginLeft: "8px"
                                                        }}>
                                                        <img
                                                            src={((isGlobalAudioMute && type==="student" ) || isLocalAudioMute) ?
                                                                "http://api.getmycall.com/static/media/mic-off.svg" :
                                                                "http://api.getmycall.com/static/media/mic-on.svg"
                                                            }
                                                            style={{
                                                                width: "30px",
                                                                height:"30px",
                                                                opacity: `${(isGlobalAudioMute && type === "student")? 0.5 : 1}`
                                                        }} />
                                                    </div>}
                                                    {<div
                                                        onClick={() => this.toggleLocalSource( id, isLocalVideoMute, 'video' )}
                                                        style={{
                                                            cursor: "pointer",
                                                            marginLeft: "8px"
                                                        }}>
                                                        <img
                                                            src={isLocalVideoMute ?
                                                                "https://api.getmycall.com/static/media/video-slash-solid.svg" :
                                                                "https://api.getmycall.com/static/media/video-solid.svg"
                                                            }
                                                            style={{
                                                                width: "30px",
                                                                height:"30px",
                                                                opacity: `${(this.state.isVideoMuteByTeacher && type === "student")? 0.5 : 1}`
                                                        }} />
                                                    </div>}

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
                                            <div id="main-video-actions-box-right" className="row">
                                                <div className="row main-video-actions-box-right-content d-flex flex-row justify-content-end">
                                                    {
                                                        <Tooltip title={currentScreenMode==="chatMode"?"Exist Comments Mode":"Comments Mode"}>
                                                            <div
                                                                onClick={() => this.changeScreenMode("chatMode")}
                                                                style={{
                                                                    cursor: "pointer",
                                                                    opacity: 1,
                                                                    marginLeft: ".7rem",
                                                                    flex: "1 1 0"
                                                                }}>
                                                                <div id="rectangle-button" />
                                                            </div>
                                                        </Tooltip>
                                                    }
                                                    {
                                                        <Tooltip title={currentScreenMode==="fullPageMode"?"Exist Full Page":"Full Page Mode"}>
                                                            <div
                                                                id="full-screen-icon"
                                                                onClick={() => this.changeScreenMode("fullPageMode")}
                                                                style={{}}>
                                                                <i className="fas fa-expand" />
                                                            </div>
                                                        </Tooltip>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={currentScreenMode==="default"? "col-md-4 col-sm-4 col-xs-12 w-100 teacher-dashboard-normal-mode" : "col-md-12 col-sm-12 col-xs-12 w-100 teacher-dashboard-screen-mode"}>
                                            {(currentTeacherToggledView==="video" && this.teacherViews('screen'))}
                                            {(currentTeacherToggledView==="screen" || currentTeacherToggledView==="board") && this.teacherViews('video')}


                                            {(currentTeacherToggledView==="video" || currentTeacherToggledView==="screen") && this.teacherViews('board')}
                                            {(currentTeacherToggledView==="board") && this.teacherViews('screen')}
                                    </div>
                                </div>}
                            {
                                <div className="row w-100 room-global-actions-div d-flex mb-3">
                                    {/* <div className="d-flex mb-3"> */}
                                        {roomData.type=="teacher" &&
                                            <div className="global-actions-button-container">
                                                <button onClick={() => this.toggleGlobalSources( id, "mute-all-students-audio" )} type="button" class="btn btn-primary teacher-actions-button">
                                                    <div className="d-flex flex-row justify-content-center" style={{ marginTop: ".1rem"}}>
                                                        <div className="btn-chat-inner-text d-flex justify-content-end w-70">{this.state.isGlobalAudioMute?"UnMute All":"Mute All"}</div>
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
                                                <Tooltip title={remoteUserSwappedId? "First Move teacher to center." : ""}>
                                                    <button
                                                        onClick={() => {
                                                            if ( isWorkingMode ) {
                                                                this.switchToGlobalWorkingMode( !isWorkingMode, true )
                                                            }
                                                            this.toggleTeacherView((currentTeacherToggledView=== 'board')?'video':'board' );
                                                        }}
                                                        type="button"
                                                        className="btn btn-primary teacher-actions-button"
                                                        style={{
                                                            backgroundColor: currentTeacherToggledView==="board"?"#6343AE":"",
                                                            // pointerEvents: !remoteUserSwappedId?"auto":"none",
                                                            // cursor: !remoteUserSwappedId?"pointer":"default",
                                                            opacity: !remoteUserSwappedId?"1":"0.8"
                                                        }}
                                                    >
                                                        <div className="d-flex flex-row justify-content-center" style={{ marginTop: ".1rem"}}>
                                                            <div className="btn-chat-inner-text d-flex justify-content-end w-70">Work Time</div>
                                                            <div className="global-action-button-icon d-flex justify-content-start w-30">
                                                                {<div style={{ cursor: "pointer" }} >
                                                                    <i class="fas fa-history"></i>
                                                                </div>}
                                                            </div>
                                                        </div>
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        }
                                        {roomData.type=="teacher" &&
                                            <div className="global-actions-button-container">
                                                <button onClick={() => this.switchToGlobalWorkingMode(!isWorkingMode, true)} type="button"
                                                    className="btn btn-primary teacher-actions-button"
                                                    style={{
                                                        backgroundColor: isWorkingMode?"#6343AE":"",
                                                        pointerEvents: currentTeacherToggledView==="board"?"auto":"none",
                                                        cursor: currentTeacherToggledView==="board"?"pointer":"default",
                                                        opacity: currentTeacherToggledView==="board"?"1":"0.5"
                                                    }}
                                                >
                                                    <div className="d-flex flex-row justify-content-center" style={{ marginTop: ".1rem"}}>
                                                        <div className="btn-chat-inner-text d-flex justify-content-end w-70">Working Mode</div>
                                                        <div className="global-action-button-icon d-flex justify-content-start w-30">
                                                            {/* {<div style={{ cursor: "pointer" }} >
                                                                <i class="fas fa-history"></i>
                                                            </div>} */}
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        }
                                    {/* </div> */}
                                    <div className="student-action-buttons ml-auto">
                                        {/* <div className="studentsSelectDiv">
                                            {this.selectStudentsButton()}
                                        </div> */}
                                        <div className="studentsToggleDiv" onClick={()=>this.setState({ isStudentsVisible: !isStudentsVisible})}>
                                            <i class={`${isStudentsVisible? "fas fa-arrow-up":"fas fa-arrow-down" }`}></i>
                                        </div>
                                    </div>
                                </div>
                            }
                            <div style={{ display: isStudentsVisible? "none" : "flex", paddingTop: type==="student"?"0":"1rem"}} className="row w-100 justify-content-start" id="small-videos-box">
                                {
                                    this.state.roomData && this.state.roomData.sources && (this.state.roomData.sources.length > 1) &&
                                    this.state.roomData.sources.sort(this.sortSources.bind(this)).map((source,index) => {
                                        console.log('sources roomData teacher_id => =>', source, roomData.teacher_id)
                                        if( source.position && source.position.toString() !== "0" ) {
                                            if ( index<=noOfStudentsShowing ) {
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
                                                        <Tooltip title={(isScreenSharing && allParticipants[sourceUserId])? "First Stop Screen Share." : ((type==="teacher" && currentTeacherToggledView !== "video"&&allParticipants[sourceUserId])?"Move Teacher to center": "")}>
                                                            <div id={`video-box-${source.position}`}>
                                                            {
                                                                isFlipEnabled = ( //only for teacher
                                                                    (type==="teacher") &&
                                                                    (currentTeacherToggledView === "video") &&
                                                                    allParticipants[sourceUserId] &&
                                                                    ( !remoteUserSwappedId || ( sourceUserId===id ) )
                                                                )
                                                            }
                                                            {
                                                                allParticipants[sourceUserId] &&
                                                                allParticipants[sourceUserId].tracks &&
                                                                allParticipants[sourceUserId].tracks.forEach(track=>{
                                                                    if (track.getType() === 'video') {
                                                                        isTeacherMuteStudentVideo = track.isMuted()
                                                                    }
                                                                })
                                                            }
                                                                <video className="student-video-tag" onClick={() => this.flipVideo( source )}
                                                                    style={{
                                                                        background: ( isFlipEnabled || isTeacherMuteStudentVideo || sourceUserId === roomData.teacher_id )?"#4b3684":"white",
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
                                                                {isTeacherMuteStudentVideo=false}
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
                                                                            pointerEvents: allParticipants[source.id] ? "auto" : "none",
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
                                                                        noOfNewPrivateMessages={source.noOfNewPrivateMessages}
                                                                        clearNoOfNewPrivateMessages={this.clearNoOfNewPrivateMessages.bind(this)}
                                                                    />
                                                                    <div onClick={() => this.showInputNote(source)} className="student-action-right-icon-div d-flex flex-row justify-content-center"
                                                                        style={{
                                                                            backgroundColor: "#6343AE",
                                                                            pointerEvents: allParticipants[source.id] ? "auto" : "none",
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
                                                                            pointerEvents: allParticipants[source.id] ? "auto" : "none",
                                                                            cursor: allParticipants[source.id] ? "pointer" : "default"
                                                                        }}>
                                                                        <i class="fas fa-times student-action-right-icon"></i>
                                                                    </div>
                                                                </div>
                                                            }
                                                        </div>
                                                        </Tooltip>
                                                        <div className="student-name" id={`name-box-${source.position}`}>
                                                            <h6 className="student-name-text" align="center">{(remoteUserSwappedId && ((source.id===roomData.teacher_id && type==="student") || (source.id===roomData.id && roomData.type==="teacher" ))) ? (allParticipants[remoteUserSwappedId] ? allParticipants[remoteUserSwappedId].name :"") : source.name}</h6>
                                                        </div>
                                                    </div>
                                                )
                                            }else {
                                                return;
                                            }

                                        }
                                    })
                                }
                                {/* <div style={{
                                        display: "flex"
                                    }}
                                    className="students-loading-icon">
                                    <img src={ItemsLoader} alt="Loading Students"></img>
                                </div> */}
                            </div>
                        </div>
                        <div className="chat-box-container" style={{ width: isChatBoxVisible? "20%" : "0%", display: isChatBoxVisible ? "block" : "none"}}>
                            <ChatBox
                                isChatBoxVisible={isChatBoxVisible}
                                currentScreenMode={this.state.currentScreenMode}
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
                                closeChatBox={this.closeChatBox.bind(this)}
                                />
                        </div>
                    </div>
                    </div>


                    <div className="board-source-container" style={{ width: "100%", height: "100vh", display: (this.state.isWorkingMode && type === "student")? "block": "none"}}>
                        {this.teacherViews('board')}
                        {type === "student" &&
                            <div className="teacher-student-actions-right-working-mode d-flex flex-column justify-content-start">
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
                                    noOfNewPrivateMessages={noOfNewPrivateMessages}
                                    clearNoOfNewPrivateMessages={this.clearNoOfNewPrivateMessages.bind(this)}
                                    isWorkingMode={this.state.isWorkingMode}
                                />
                            </div>
                        }
                        <div className="row w-100 d-flex justify-content-center teacher-actions-button-container">
                                <div id="main-video-actions-box-center" className="row w-20 h-10">
                                    {
                                        (type === "teacher" || remoteUserSwappedId === id) &&
                                        <Tooltip title={isScreenSharing? "First Stop Screen Share." : ((currentTeacherToggledView==="board" && type==="teacher")?"First Move teacher to Center.":"")}>
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
                                        onClick={() => { this.toggleLocalSource( id, isLocalAudioMute, 'audio' )}}
                                        style={{
                                            cursor: "pointer",
                                            marginLeft: "8px"
                                        }}>
                                        <img
                                            src={((isGlobalAudioMute && type==="student" ) || isLocalAudioMute) ?
                                                "http://api.getmycall.com/static/media/mic-off.svg" :
                                                "http://api.getmycall.com/static/media/mic-on.svg"
                                            }
                                            style={{
                                                width: "30px",
                                                height:"30px",
                                                opacity: `${(isGlobalAudioMute && type === "student")? 0.5 : 1}`
                                        }} />
                                    </div>}
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
                            <div className="teacher-video-div-working-mode">
                                <video id="teacher-video-tag" autoPlay />
                                <audio autoPlay width="0%" height="0%" id="teacher-audio-tag"></audio>
                            </div>
                    </div>

                    {/* place holder div to detect end of page */}
                    <div id="end-of-page-div" />
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
