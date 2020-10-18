import React from 'react';
import { Modal, Progress } from 'antd';

import './index.css';

const UploadVideoModal = (props) => {
    const {
        show,
        recordingName,
        stopRecordingAndGoBack,
        uploadVideoProgress,
        handleUploadVideo,
        setShowUploadVideoModal,
        uploadingStatus,
        downloadRecordedVideo,
        t
    } = props;

    const handleCancelUpload = () => {
        console.log(uploadingStatus, 'uploading status')
        if (uploadingStatus === 'active' || uploadingStatus === 'uploading'){
            if (window.confirm(t('cancelUpload'))){
                setShowUploadVideoModal(false);
                if (stopRecordingAndGoBack){
                    props.unload();
                }
            }
        } else if (uploadingStatus === 'success' || uploadingStatus === 'failed') {
            setShowUploadVideoModal(false);
            if (stopRecordingAndGoBack){
                props.unload();
            }
        }
    }
    return(
        <Modal
          title="Upload Conference Recording"
          visible={show}
          okText={uploadingStatus==='failed'? t('retryUpload') : t('upload')}
          cancelText={t('cancelText')}
          onOk={handleUploadVideo}
          onCancel={handleCancelUpload}
          className="upload-video-modal"
        >
            <div className='modal-body'>
                <div className='video-basic-info'>
                        <p className="video-info-header">{t('videoName')}{':'}</p> 
                        <p className="video-name-text">
                            {recordingName}
                        </p> 
                </div>
                <div className="download-button-container">
                    <button onClick={()=>downloadRecordedVideo()} type="button" width= "11rem" height="2rem" id="download-video-button" className="btn btn-primary main-button">
                        <div className="d-flex flex-row justify-content-center">
                            <div className="btn-chat-inner-text d-flex justify-content-end w-70">{t('saveToMyComputer')}</div>
                        </div>
                    </button>
                    {/* eslint-disable-next-line */}
                    <a href="#" id="download-video-link" style={{display: 'none'}}>download</a>
                </div>
                <Progress percent={parseInt(uploadVideoProgress)} />
                <div className="recording-upload-status">
                    {uploadingStatus==='success' &&
                        <p className='recording-success-message'>{t('recordingUploadSuccess')}</p>
                    }
                    {uploadingStatus==='failed' &&
                        <p className='recording-failed-message'>{t('recordingUploadFailed')}</p>
                    }
                </div>
            </div>
        </Modal>
    )
}

export default UploadVideoModal;