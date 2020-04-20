export default {
    apiGateway: {
        URL: ''
    },
    sourceCodeLink: '',

    jitsiConfig: {
        options: {
            hosts: {
                domain: 'beta.meet.jit.si',
                muc: 'conference.beta.meet.jit.si' // FIXME: use XEP-0030
            },
            bosh: 'https://beta.meet.jit.si/http-bind', // FIXME: use xep-0156 for that

            // The name of client node advertised in XEP-0115 'c' stanza
            clientNode: 'http://jitsi.org/jitsimeet'
        },
        confOptions: {
            openBridgeChannel: true
        }
    }
};
