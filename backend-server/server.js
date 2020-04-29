var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');

var ioClassRoom = io.of('/class-rooms');

app.get('/teacher-dashboard', function(req, res) {
    res.sendFile(__dirname + '/public/teacher-dashboard.html');
});
app.use(express.static(path.join(__dirname, 'public')));

var rooms = {};

server.listen(3001, function(){
    console.log('server start at port => 3001')
});

ioClassRoom.on('connection', (socket) => {
    console.log('client connected => ', socket.id)

    try {
        socket.on('event', function(messageObj) {
            console.log('socketio message =>', messageObj)
            
            let type = messageObj.type;
            let data = messageObj.data;
            switch ( type ) {
                case 'joinRoom':
                    joinRoom( data, socket );
                    break;
                case 'videos-swapped':
                    console.log('data => ', data)
                    socket.broadcast.to(data.roomId).emit('event', { type: 'video-swapped-from-server', data: data }); //send swapped videos info to all users
                    break;
                case 'teacher-view-change':
                    socket.broadcast.to(data.roomId).emit('event', messageObj ); //send swapped videos info to all users
                    break;
                default:
                    let messageObj = { type: 'message-undefined', data: { status: false, message: 'message type undefined.'} }
                    socket.emit('event', messageObj);
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

function joinRoom( data, socket ) {
    let roomId = data.roomId;
    if ( data.id && roomId) {
        socket.join(roomId);
        if ( !rooms[roomId] ) {
            rooms[roomId] = {
                users: []
            };
        }
            
        let user = {};
        user.id = data.id;
        user.name = data.name;
        user.type = data.type;
        user.socketId = socket.id;
        
        rooms[roomId]["users"].push(user);

        let messageObj = {
            type: "roomJoinResponse",
            data: {
                status: true,
                roomUsers: rooms[roomId]["users"],
                message: "room joined successfully"
            }
        };
        socket.broadcast.to(roomId).emit('event', { type: 'newUser', data: messageObj.data }); //send to all other room users except self
        socket.emit('event', messageObj); //response
    }
}

function leaveRoom( socket ) {
    Object.keys(rooms).forEach(roomId => {
        if ( rooms[roomId]["users"] ) {
            const index = rooms[roomId]["users"].findIndex(user => user.socketId === socket.id);
            if (index > -1) {
                rooms[roomId]["users"].splice(index, 1);
            }
            socket.leave(roomId);
        }
    })
}