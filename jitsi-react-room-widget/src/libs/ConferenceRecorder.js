function ConferenceRecorder(stopRecordVideo) {
    let recordClient, stream, voiceStream, desktopStream,
        captureDesktopAudio = true,
        captureMic = true,
        gdmOptions = {
          video: {
            cursor: "always"
          },
          audio: captureDesktopAudio
        },
        blobData = null;
        upladFileProgress= 0,
        notificationKey;
  
    this.startRecording = async () => {
      try{
        desktopStream = await navigator.mediaDevices.getDisplayMedia(gdmOptions);
    
        // somebody clicked on "Stop sharing"
        desktopStream.getVideoTracks()[0].onended = () => {
          console.log('-------------recording stopped from share builtin button-----------');
          stopRecordVideo();
        };
          
        if (captureMic === true) {
          voiceStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: captureMic });
        }
      
        const tracks = [
          ...desktopStream.getVideoTracks(), 
          ...this.mergeAudioStreams(desktopStream, voiceStream)
        ];
        
        stream = new MediaStream(tracks);
      
        const recordingOptions = this.getMimeTypes();
        recordClient = new MediaRecorder(stream, recordingOptions);
        recordClient.ondataavailable = (e) => {
          blobData = e.data;
        };
        recordClient.start();
        return true;
      } catch(err){
        console.error('Failed to start recorder')
        return false;
      }
    };
    
    this.stopRecording = () => {
      recordClient && recordClient.stop();
    };
  
    this.getMimeTypes = () => {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')){
        return {mimeType: 'video/webm; codecs=vp8,opus'};
      }else if (MediaRecorder.isTypeSupported('video/WEBM;codecs=VP8,OPUS')){
        return {mimeType: 'video/WEBM; codecs=VP8,OPUS'};
      }else if (MediaRecorder.isTypeSupported('video/WEBM; codecs=VP8,OPUS')){
        return {mimeType: 'video/WEBM;codecs=VP8,OPUS'};
      }else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')){
        return {mimeType: 'video/webm; codecs=vp9,opus'};
      }else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8,vp9,opus')){
        return {mimeType: 'video/webm; codecs=vp8,vp9,opus'};
      }else if (MediaRecorder.isTypeSupported('video/webm; codecs=h264,opus')){
        return {mimeType: 'video/webm; codecs=h264,opus'};
      }else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,vp9,opus')){
        return {mimeType: 'video/webm; codecs=h264,vp9,opus'};
      } else {
        return {mimeType: 'video/webm; codecs=vp8,opus'};
      }
    }
  
    this.mergeAudioStreams = (desktopStream, voiceStream) => {
      const context = new AudioContext();
      const destination = context.createMediaStreamDestination();
      let hasDesktop = false;
      let hasVoice = false;
      if (desktopStream && desktopStream.getAudioTracks().length > 0) {
        // If you don't want to share Audio from the desktop it should still work with just the voice.
        const source1 = context.createMediaStreamSource(desktopStream);
        const desktopGain = context.createGain();
        desktopGain.gain.value = 0.7;
        source1.connect(desktopGain).connect(destination);
        hasDesktop = true;
      }
      
      if (voiceStream && voiceStream.getAudioTracks().length > 0) {
        const source2 = context.createMediaStreamSource(voiceStream);
        const voiceGain = context.createGain();
        voiceGain.gain.value = 0.7;
        source2.connect(voiceGain).connect(destination);
        hasVoice = true;
      }
        
      return (hasDesktop || hasVoice) ? destination.stream.getAudioTracks() : [];
    };
    
    this.clearRecordingResources = () => {
      stream.getTracks().forEach(s=>s.stop())
      stream = null;
    }
  }

export default ConferenceRecorder;