export function useFacebookUpload() {
    const uploadVideo = async (file, videoDetails) => {
        try {
            // Step 1: Get upload session
            const sessionResponse = await fetch(
                `https://graph.facebook.com/v18.0/me/video_uploads?access_token=${accessToken}`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        file_size: file.size,
                        video_title: videoDetails.title
                    })
                }
            );
            const {upload_session_id, start_offset, end_offset} = await sessionResponse.json();

            // Step 2: Upload video chunks
            const chunkSize = 4 * 1024 * 1024; // 4MB chunks
            let start = start_offset;

            while (start < file.size) {
                const chunk = file.slice(start, start + chunkSize);
                const formData = new FormData();
                formData.append('upload_session_id', upload_session_id);
                formData.append('start_offset', start);
                formData.append('video_file_chunk', chunk);

                await fetch(
                    `https://graph-video.facebook.com/v18.0/me/video_uploads`,
                    {
                        method: 'POST',
                        body: formData
                    }
                );

                start += chunkSize;
                const progress = Math.min((start / file.size) * 100, 100);
                emit('upload-progress', progress);
            }

            // Step 3: Finish upload and publish
            const publishResponse = await fetch(
                `https://graph.facebook.com/v18.0/me/videos`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        upload_session_id,
                        title: videoDetails.title,
                        description: videoDetails.description,
                        privacy: {value: videoDetails.privacy},
                        // Optional metadata
                        content_category: 'ENTERTAINMENT',
                        formatting: {duration: video.duration}
                    })
                }
            );

            return await publishResponse.json();
        } catch (error) {
            throw new Error(`Facebook upload failed: ${error.message}`);
        }
    };

    return {uploadVideo};
}
