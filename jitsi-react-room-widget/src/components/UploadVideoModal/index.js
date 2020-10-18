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