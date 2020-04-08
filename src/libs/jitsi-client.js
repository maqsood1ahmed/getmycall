const options = {
    hosts: {
        domain: 'beta.meet.jit.si',
        muc: 'conference.beta.meet.jit.si' // FIXME: use XEP-0030
    },
    bosh: 'https://beta.meet.jit.si/http-bind', // FIXME: use xep-0156 for that

    // The name of client node advertised in XEP-0115 'c' stanza
    clientNode: 'http://jitsi.org/jitsimeet'
};

const confOptions = {
    openBridgeChannel: true
};

let connection = null;
JitsiMeetJS.init();

connection = new JitsiMeetJS.JitsiConnection(null, null, options);

function onConnectionSuccess () {
    console.log('connection success');
}

function onConnectionFailed () {
    console.error('Connection Failed!');
}
function disconnect () {
    console.log('disconnect!');
    connection.removeEventListener(
        JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
        onConnectionSuccess);
    connection.removeEventListener(
        JitsiMeetJS.events.connection.CONNECTION_FAILED,
        onConnectionFailed);
    connection.removeEventListener(
        JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
        disconnect);
}

connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
    onConnectionSuccess);
connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_FAILED,
    onConnectionFailed);
connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
    disconnect);

connection.connect();

export class jitsiClient {
  room = null;

  makeConnection () {
      JitsiMeetJS.init();
      this.connection = this.createConnection(this.options);
      console.log('connection created');
      this.setConnectionListeners(this.connection);
  }

  startConference () {
      console.log("creatingroom", connection, confOptions);
      this.room = this.createRoom(connection, confOptions);
      this.setRoomListeners(this.room);
      this.room.join();
  }

  createConnection (options) {
      console.log('creating conneciton');
      return new JitsiMeetJS.JitsiConnection(null, null, options);
  }

  setConnectionListeners (connection) {
      connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, function () { console.log('connection success');});
      connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, function () { console.log('connection success');});
      connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, this.disconnect);
  }

  createRoom (connection, options) {
      const roomName = 'helloworldhelloworld';
      const roomOption = {};

      const room = connection.initJitsiConference('lksadjflksajdlkfjdsalfjlkdsajfl', roomOption);
      // const room = connection.initJitsiConference('conference', options);
      return room;
  }

  setRoomListeners (room) {
      room.on(this.jitsi.events.conference.TRACK_ADDED, this.onRemoteTrack);
      room.on(this.jitsi.events.conference.CONFERENCE_JOINED, this.onConferenceJoined);
  }

  onConnectionSuccess (data) {
      console.log('connection succedded');
      console.log(data);
  }

  onConnectionFailed (data) {
      console.log("connection failed");
      console.log(data);
  }

  disconnect () {
      console.log('disconnecting?');
  }

  onRemoteTrack (data) {
      console.log(data);
  }

  onConferenceJoined (data) {
      message.success('room joined.');
      console.log(data);
  }
}


/* global $, JitsiMeetJS */


