import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { message, Popconfirm } from 'antd';
import { getMimeTypes, mergeAudioStreams } from '../../../utils'

import UploadVideoModal from '../../../components/UploadVideoModal/index';
import { uploadRecordingEndpoint, webRootUrl } from '../../../config';

import './index.css';

let recordClient, stream,
    captureMic = true,
    captureDesktopAudio = true,
    gdmOptions = {
        video: {
            cursor: "always"
        },
        audio: captureDesktopAudio
    },
    voiceStream, desktopStream;

const RecordVideo = (props) => {
    const {
        lesson_id,
        isRecording,
        setVideoRecordingStatus,
        stopRecordingAndGoBack,
        isLocalAudioMute,
        uploadingStatus,
        setUploadingStatus,
        unload,
        t
    } = props;
    const [blobData, setBlobData] = useState(null);
    const [showUploadVideoModal, setShowUploadVideoModal] = useState(false);
    const [uploadVideoProgress, setUploadVideoProgress] = useState(0);
    const [recordingName, setRecordingName] = useState('');

    const setInitialStates = () => {
        setRecordingName('');
        setUploadingStatus('inactive');
        setUploadVideoProgress(0);
    }

    useEffect(()=>{
        if (stopRecordingAndGoBack){
            stopRecording()
        }
    }, [stopRecordingAndGoBack])

    useEffect(()=>{
        if (voiceStream){
            voiceStream.getAudioTracks()[0].enabled = !isLocalAudioMute;
        }
    }, [isLocalAudioMute])

    const startRecording = async () => {
        setInitialStates();
        try{
            desktopStream = await navigator.mediaDevices.getDisplayMedia(gdmOptions);
            desktopStream.getVideoTracks()[0].onended = () => {
                console.log('-------------recording stopped from share builtin button-----------');
                stopRecording();
            };
                
            if (captureMic === true) {
                voiceStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: captureMic });
                voiceStream.getAudioTracks()[0].enabled = !isLocalAudioMute;
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
        let recordingName = lesson_id + '.webm';
        setRecordingName(recordingName);
        setVideoRecordingStatus(false);
        setUploadingStatus('active');
        setShowUploadVideoModal(true);
    };

    const handleUploadVideo = () => {
        if (uploadingStatus === 'success') {
            message.warning('');
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
        const uploadVideoEndpoint = uploadRecordingEndpoint + 'lesson_id='+lesson_id;
        axios.post(uploadVideoEndpoint, formData, config)
            .then(res=>{
                setUploadingStatus('success');
                setVideoRecordingStatus(false)
                if (stopRecordingAndGoBack){
                    unload();
                }
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
                stopRecordingAndGoBack={stopRecordingAndGoBack}
                uploadingStatus={uploadingStatus}
                handleUploadVideo={handleUploadVideo}
                setShowUploadVideoModal={setShowUploadVideoModal}
                setVideoRecordingStatus={setVideoRecordingStatus}
                unload={unload}
                t={t}
            />
        </div>
        </>
    )
}

export default RecordVideo;