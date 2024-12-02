import {ref} from 'vue'

export function useStreamStatus() {
    const streamStatus = ref({
        isLive: false,
        viewers: 0,
        quality: 'N/A',
        bitrate: 0
    })

    const statusInterval = ref(null)

    const calculateQuality = (metrics) => {
        const bitrate = metrics.bitrate || 0
        const dropFrames = metrics.dropped_frames || 0

        if (bitrate < 1000) return 'Poor'
        if (dropFrames > 100) return 'Fair'
        return 'Good'
    }

    const startStatusUpdates = (api, streamName) => {
        if (statusInterval.value) return

        const updateStatus = async () => {
            try {
                const data = await api.getStreamInfo(streamName)
                streamStatus.value = {
                    isLive: data.alive || false,
                    viewers: data.clients?.length || 0,
                    quality: calculateQuality(data),
                    bitrate: Math.round(data.bitrate / 1000) || 0
                }
            } catch (error) {
                console.error('Failed to update stream status:', error)
                 streamStatus.value = {
                    isLive:  false,
                    viewers: 0,
                    quality: 'Poor',
                    bitrate: 0
                }
            }
        }
        updateStatus()
        statusInterval.value = setInterval(updateStatus, 5000)
    }

    const stopStatusUpdates = () => {
        if (statusInterval.value) {
            clearInterval(statusInterval.value)
            statusInterval.value = null
        }
    }

    return {
        streamStatus,
        startStatusUpdates,
        stopStatusUpdates
    }
}
