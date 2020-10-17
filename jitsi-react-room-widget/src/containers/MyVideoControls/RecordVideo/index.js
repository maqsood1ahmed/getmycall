import React, { useState } from 'react';
import { message, Popconfirm } from 'antd';
import { getMimeTypes, mergeAudioStreams } from '../../../utils'

import axios from 'axios';
import UploadVideoModal from '../../../components/UploadVideoModal/index';

import './index.css';

let recordClient, stream,
    captureMic = true,
    captureDesktopAudio = true,
    gdmOptions = {
        video: {
            cursor: "always"
        },
        audio: captureDesktopAudio
    };

const RecordVideo = (props) => {
    const {
        roomId,
        isRecording,
        setVideoRecordingStatus,
        t
    } = props;
    const [blobData, setBlobData] = useState(null);
    const [showUploadVideoModal, setShowUploadVideoModal] = useState(false);
    const [uploadVideoProgress, setUploadVideoProgress] = useState(0);
    const [uploadingStatus, setUploadingStatus] = useState('inactive');
    const [recordingName, setRecordingName] = useState('');

    const setInitialStates = () => {
        setRecordingName('');
        setUploadingStatus('inactive');
        setUploadVideoProgress(0);
    }

    const startRecording = async () => {
        setInitialStates();
        let voiceStream, desktopStream;
        try{
            desktopStream = await navigator.mediaDevices.getDisplayMedia(gdmOptions);
            desktopStream.getVideoTracks()[0].onended = () => {
                console.log('-------------recording stopped from share builtin button-----------');
                stopRecording();
            };
                
            if (captureMic === true) {
                voiceStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: captureMic });
            }
            
            const tracks = [
                ...desktopStream.getVideoTracks(), 
                ...mergeAudioStreams(desktopStream, voiceStream)
            ];
            
            stream = new MediaStream(tracks);
            const recordingOptions = getMimeTypes();
            recordClient = new MediaRecorder(stream, recordingOptions);
            recordClient.ondataavailable = (e) => {
            //   this.uploadFile(e.data)
                setBlobData(e.data);
            };
            recordClient.start();

            setVideoRecordingStatus(true);
            message.success(t('recordingStarted'));
        }catch(err){
            message.error(t('startRecordingFailed'));
            console.log('recording error===>',err)
        };
    };
      
    const stopRecording = () => {
        recordClient && recordClient.stop();
        clearRecordingResources();
        setVideoRecordingStatus(false)

        let recordingName = roomId + '__' + (new Date().toISOString()) + '.webm';
        setRecordingName(recordingName);
        setShowUploadVideoModal(true);
    };

    const handleUploadVideo = () => {
        if (uploadingStatus === 'success') {
            message.warning();
            return;
        }
        let formData = new FormData();
        formData.append("file", new Blob([blobData], { type: 'video/webm' }));
        const config = {
          onUploadProgress: function(progressEvent) {
            let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            console.log('current status', percentCompleted);
            setUploadVideoProgress(percentCompleted);
          },
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
        setUploadingStatus('uploading');
        axios.post('http://localhost:8001/upload', formData, config)
            .then(res=>{
                setUploadingStatus('success');
            }).catch(err=>{
                setUploadingStatus('failed');
                console.error('Failed to upload file ---> ', err);
            })
      }

    const clearRecordingResources = () => {
        stream.getTracks().forEach(s=>s.stop())
        stream = null;
    }

    return(
        <>
        <div className="controls-icon-div">
            <Popconfirm
                title={isRecording?t('stopRecordingMessage'):t('startRecordingMessage')}
                onConfirm={() => {
                    isRecording ? stopRecording(): startRecording();
                }}
                onCancel={()=>console.log('canceled')}
                okText={t('okText')}
                cancelText={t('cancelText')}
            >
                <div className="control-icon">
                        <i 
                            className="fas fa-circle"
                            style={{
                                fontSize: "28px",
                                color: isRecording?"red": "white",
                            }}
                        />
                </div>
            </Popconfirm>
            <UploadVideoModal 
                show={showUploadVideoModal}
                recordingName={recordingName}
                uploadVideoProgress={uploadVideoProgress}
                uploadingStatus={uploadingStatus}
                handleUploadVideo={handleUploadVideo}
                setShowUploadVideoModal={setShowUploadVideoModal}
                t={t}
            />
        </div>
        </>
    )
}

export default RecordVideo;