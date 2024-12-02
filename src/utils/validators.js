export const validateUrl = (url) => {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

export const validateStreamName = (name) => {
    const regex = /^[a-zA-Z0-9-_]+$/
    return regex.test(name) && name.length >= 3
}


export const validateApiKey = (key) => {
    if (!key) return false
    // Kiểm tra độ dài tối thiểu
    if (key.length < 8) return false
    // Kiểm tra format của API key (tùy thuộc vào yêu cầu cụ thể)
    return /^[A-Za-z0-9-_]+$/.test(key)
}

export const validateStreamKey = (key) => {
    if (!key) return false
    // Kiểm tra độ dài tối thiểu
    if (key.length < 8) return false
    // Kiểm tra format của stream key
    return /^[A-Za-z0-9-_]+$/.test(key)
}

export const validateRtmpUrl = (url) => {
    if (!url) return false
    // Kiểm tra xem URL có bắt đầu bằng rtmp:// không
    return url.startsWith('rtmp://')
}
