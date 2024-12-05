export function createChunkedUploader(file, chunkSize = 4 * 1024 * 1024) {
    let offset = 0;

    const getNextChunk = () => {
        const chunk = file.slice(offset, offset + chunkSize);
        offset += chunk.size;
        return chunk;
    };

    const hasMoreChunks = () => offset < file.size;

    const getProgress = () => Math.min((offset / file.size) * 100, 100);

    return {
        getNextChunk, hasMoreChunks, getProgress, reset: () => {
            offset = 0;
        }
    };
}
