var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');

var ioClassRoom = io.of('/class-rooms');

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
app.get('/teacher-dashboard', function(req, res) {
    res.sendFile(__dirname + '/public/teacher-dashboard.html');
});
app.use(express.static(path.join(__dirname, 'public')));

var rooms = {};

server.listen(55555, function(){
    console.log('server start at port => 55555')
});

ioClassRoom.on('connection', (socket) => {
    console.log('client connected => ', socket.id)

    try {
        socket.on('event', function(messageObj) {
            console.log('socketio message =>', messageObj.type)
            
            let type = messageObj.type;
            let data = messageObj.data;
            switch ( type ) {
                case 'joinRoom':
                    joinRoom( data, socket );
                    break;
                case 'videos-swapped':
                    rooms[data.roomId]['videoSwapped'] = messageObj;
                    socket.broadcast.to(data.roomId).emit('event', { type: 'video-swapped-from-server', data: data }); //send swapped videos info to all users
                    break;
                case 'hand-raised':
                case 'chat-message':
                case 'teacher-joined-room':
                case 'new-announcment':
                    socket.broadcast.to(data.roomId).emit('event', messageObj ); //send swapped videos info to all users
                    break;
                case 'mute-student-video':
                    sendStudentToggleVideoEvent(messageObj);
                    break;
                case 'mute-all-students-audio':
                    rooms[data.roomId]['isGlobalAudioMute'] = messageObj;
                    socket.broadcast.to(data.roomId).emit('event', messageObj );
                    break;
                case 'is-chat-public':
                    rooms[data.roomId]['isChatPublic'] = messageObj;
                    socket.broadcast.to(data.roomId).emit('event', messageObj );
                    break;
                case 'teacher-view-change':
                    rooms[data.roomId]['currentTeacherToggledView'] = messageObj;
                    socket.broadcast.to(data.roomId).emit('event', messageObj );
                    break;
                case 'board-change': 
                    rooms[data.roomId]['selectedBoard'] = messageObj;
                    socket.broadcast.to(data.roomId).emit('event', messageObj );
                    break;
                case 'new-announcment':
                    rooms[data.roomId]['currentAnnouncement'] = messageObj;
                    socket.broadcast.to(data.roomId).emit('event', messageObj );
                    break;
                case 'switch-global-working-mode':
                    rooms[data.roomId]['switchGlobalWorkingMode'] = messageObj;
                    socket.broadcast.to(data.roomId).emit('event', messageObj );
                    break;
                case 'screen-share-stop':
                    socket.broadcast.to(data.roomId).emit('event', messageObj );
                    break;
                case "private-chat-message": 
                    sendPrivateMessage( data, socket );
                    break;
                default:
                    let newMessageObj = { type: 'message-undefined', data: { status: false, message: 'message type undefined.'} }
                    socket.emit('event', newMessageObj);
            }
        });
    } catch (error) {
        let messageObj = { type: 'error', data: { status: false, error: error } }
        socket.emit('event', messageObj);
    }
    
    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} disconnected.`);
        leaveRoom ( socket );
      });
});

function sendStudentToggleVideoEvent ( messageObj ) {
    let room = rooms[messageObj.data.roomId];
    let student = room["users"].filter( user => user.id === messageObj.data.studentId );
    
    if ( student[0] && student[0]['id'] && student[0]['socket'] ) {
        student[0]['socket'].emit('event', messageObj);
    }
}

function joinRoom( data, socket ) {
    let roomId = data.roomId;
    if ( data.id && roomId) {
        socket.join(roomId);
        if ( !rooms[roomId] ) {
            rooms[roomId] = {
                users: []
            };
        }

        let user = rooms[roomId] && rooms[roomId]["users"].filter( el => el.id === data.id )[0];
        
        if ( !user || !user['id'] ) {
            user = {};
            user.id = data.id;
        }

        user.name = data.name ? data.name : null;
        user.type = data.type ? data.type : null;
        user.socketId = socket.id;
        user.socket = socket;
        
        rooms[roomId]["users"].push(user);

        let messageObj = {
            type: "roomJoinResponse",
            data: {
                status: true,
                // roomUsers: rooms[roomId]["users"],
                message: "room joined successfully"
            }
        };
        socket.broadcast.to(roomId).emit('event', { type: 'newUser', data: messageObj.data }); //send to all other room users except self
        socket.emit('event', messageObj); //response

        //send all previous actions taken by teacher if student recent join the room
        if ( rooms[roomId]['isGlobalAudioMute'] ) {
            socket.emit('event', rooms[roomId]['isGlobalAudioMute'] );
        }
        if ( rooms[roomId]['isChatPublic'] ) {
            socket.emit('event', rooms[roomId]['isChatPublic'] );
        }
        if ( rooms[roomId]['currentTeacherToggledView'] ) {
            socket.emit('event', rooms[roomId]['currentTeacherToggledView'] );
        }
        if ( rooms[roomId]['selectedBoard'] ) {
            socket.emit('event', rooms[roomId]['selectedBoard'] );
        }
        if ( rooms[roomId]['currentAnnouncement'] ) {
            socket.emit('event', rooms[roomId]['currentAnnouncement'] );
        }
        if ( rooms[data.roomId]['videoSwapped'] ) {
            socket.emit('event', rooms[roomId]['videoSwapped'] );
        }
        if ( rooms[data.roomId]['switchGlobalWorkingMode'] ) {
            socket.emit('event', rooms[roomId]['switchGlobalWorkingMode'] );
        }
    }
}
function leaveRoom( socket ) {
    Object.keys(rooms).forEach(roomId => {
        if ( rooms[roomId]["users"] ) {
            const index = rooms[roomId]["users"].findIndex(user => user.socketId === socket.id);

            if (index > -1) {
                rooms[roomId]["users"].splice(index, 1);
                clearTeacherActions( roomId )
                socket.broadcast.to(roomId).emit('event', { type: "teacherLeaveRoom", data: { message: "Cleared all room actions taken by teacher." } });
                socket.leave(roomId);
            }            
        }
    })
}

function clearTeacherActions ( roomId ) {
    if ( rooms[roomId]['isGlobalAudioMute'] ) {
        delete rooms[roomId]['isGlobalAudioMute']    
    }
    if ( rooms[roomId]['isChatPublic'] ) {
        delete rooms[roomId]['isChatPublic']
    }
    if ( rooms[roomId]['currentTeacherToggledView'] ) {
        delete rooms[roomId]['currentTeacherToggledView'];
    }
    if ( rooms[roomId]['selectedBoard'] ) {
        delete rooms[roomId]['selectedBoard']
    }
    if ( rooms[roomId]['currentAnnouncement'] ) {
        delete rooms[roomId]['currentAnnouncement'];
    }
    if ( rooms[roomId]['videoSwapped'] ) {
        delete rooms[roomId]['videoSwapped']
    }
    if ( rooms[roomId]['switchGlobalWorkingMode'] ) {
        delete rooms[roomId]['switchGlobalWorkingMode']
    }
}

function sendPrivateMessage ( data, socket ) {
    try {
        let room = rooms[data.roomId];
        let student = room["users"].filter( user => user.id === data.studentId );
        if ( student[0] && student[0]['id'] && student[0]['socket'] ) {
            student[0]['socket'].emit('event', { type: 'private-chat-message', data });
        } else {
            let messageObj = {
                type: "private-chat-response",
                data: {
                    status: false,
                    message: "student seems offline!"
                }
            };
            socket.emit( 'event', messageObj )
        }
    }catch (err) {
        console.log('something went wrong when sending private message => ', err)
    }
    
}