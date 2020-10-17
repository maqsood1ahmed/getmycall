/* Open Full screen mode */
export const openFullscreen = (elem) => {
    console.log(elem, 'elem')
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
    }
}
/* Close fullscreen */
export const closeFullscreen = (elem) => {
    if (elem.exitFullscreen) {
    elem.exitFullscreen();
    } else if (elem.mozCancelFullScreen) { /* Firefox */
    elem.mozCancelFullScreen();
    } else if (elem.webkitExitFullscreen) { /* Chrome, Safari and Opera */
    elem.webkitExitFullscreen();
    } else if (elem.msExitFullscreen) { /* IE/Edge */
    elem.msExitFullscreen();
    }
}


// ========================== WebRTC =========================
// get recorder MemeTypes
export const getMimeTypes = () => {
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
// merge two media streams using audio context
export const mergeAudioStreams = (desktopStream, voiceStream) => {
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