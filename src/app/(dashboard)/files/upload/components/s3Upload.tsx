'use client';

import axios from 'axios';
import { useState } from 'react';

const S3Upload = () => {
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [jobId, setJobId] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        console.log('Selected file:', file);
        try {
            // Create multipart upload
            setUploadStatus('Creating upload...');
            console.log('Creating multipart upload...');
            const createRes = await axios.post('/api/s3/create', { fileInfo: { name: file.name, type: file.type } });
            console.log('Create response:', createRes.data);
            const { uploadId, key } = createRes.data;
            const chunkSize = 100 * 1024 * 1024; // 100MB chunks
            const numChunks = Math.ceil(file.size / chunkSize);
            const uploadPromises = [];
            console.log(`Uploading file in ${numChunks} chunks of size ${chunkSize} bytes`);
            for (let i = 0; i < numChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const blob = file.slice(start, end);
                console.log(`Uploading chunk ${i + 1}/${numChunks} from byte ${start} to ${end}`);
                try {
                    console.log('Requesting pre-signed URL for part', i + 1);
                    const partRes = await axios.post('/api/s3/part', {
                        sendBackData: { key, uploadId },
                        partNumber: i + 1,
                        contentLength: blob.size,
                    });
                    console.log(`Pre-signed URL for part ${i + 1}:`, partRes.data.url);
                    // Upload the part
                    const uploadPromise = axios.put(partRes.data.url, blob, {
                        headers: { 'Content-Type': file.type },
                        onUploadProgress: (progressEvent) => {
                            const progress = Math.round((progressEvent.loaded / file.size) * 100);
                            setUploadProgress(progress);
                        },
                    });
                    uploadPromises.push(uploadPromise);
                } catch (error) {
                    console.error(`Error getting pre-signed URL for part ${i + 1}:`, error);
                    setUploadStatus(`Error getting pre-signed URL for part ${i + 1}`);
                    return;
                }
            }
            // Wait for all parts to be uploaded
            console.log('Uploading all parts...');
            await Promise.all(uploadPromises);
            // Complete the multipart upload
            console.log('Completing multipart upload...');
            const completeRes = await axios.post('/api/s3/complete', { sendBackData: { key, uploadId } });
            console.log('Upload completed successfully.');
            setUploadStatus('Upload successful. Transcription job created.');
            setJobId(completeRes.data.jobId);
        } catch (error) {
            console.error('Error during upload process:', error);
            setUploadStatus('Error during upload process');
        }
    };

    return (
        <div>
            <h1>S3 Multipart Upload</h1>
            <input type="file" onChange={handleFileChange} />
            <div>
                <p>Upload Progress: {uploadProgress}%</p>
                <p>Status: {uploadStatus}</p>
                {jobId && <p>Transcription Job ID: {jobId}</p>}
            </div>
        </div>
    );
};

export default S3Upload;