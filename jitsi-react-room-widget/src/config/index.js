export const webRootUrl = "https://wfh.wnets.net/";
export const socketSeverEndpoint = "https://api.getmycall.com";
export const uploadRecordingEndpoint = "https://rec.getmycall.com/upload_recording.php?";
export const jitsiServerParams = {
    //Our Own custom Jitsi server configs
    hosts: {
        domain: 'dev.getmycall.com',
        muc: 'conference.dev.getmycall.com' // FIXME: use XEP-0030
    },
    bosh: 'https://dev.getmycall.com/http-bind', // FIXME: use xep-0156 for that

    // The name of client node advertised in XEP-0115 'c' stanza
    clientNode: 'http://jitsi.org/jitsimeet'
    
    //jitsi meet beta test server configs
    //     hosts: {
    //         domain: 'beta.meet.jit.si',
    //         muc: 'conference.beta.meet.jit.si' // FIXME: use XEP-0030
    //     },
    //     bosh: 'https://beta.meet.jit.si/http-bind', // FIXME: use xep-0156 for that

    //     // The name of client node advertised in XEP-0115 'c' stanza
    //     clientNode: 'http://jitsi.org/jitsimeet'
};
export const jitsiInitOptions = {
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
