<template>
  <div class="uploader-container">
    <!-- Left Panel - Authentication -->
    <div class="auth-panel">
      <h2>Platform Connection</h2>

      <!-- Facebook Auth -->
      <div class="auth-card" :class="{ 'authenticated': facebookAuth }">
        <div class="auth-header facebook">
          <h3>Facebook</h3>
          <div class="auth-status">
            {{ facebookAuth ? 'Connected' : 'Not Connected' }}
          </div>
        </div>
        <button
            @click="facebookAuth ? handleLogout('facebook') : handleLogin('facebook')"
            :class="['auth-button', facebookAuth ? 'logout' : 'facebook']"
        >
          {{ facebookAuth ? 'Disconnect' : 'Connect Facebook' }}
        </button>
      </div>

      <!-- YouTube Auth -->
      <div class="auth-card" :class="{ 'authenticated': youtubeAuth }">
        <div class="auth-header youtube">
          <h3>YouTube</h3>
          <div class="auth-status">
            {{ youtubeAuth ? 'Connected' : 'Not Connected' }}
          </div>
        </div>
        <button
            @click="youtubeAuth ? handleLogout('youtube') : handleLogin('youtube')"
            :class="['auth-button', youtubeAuth ? 'logout' : 'youtube']"
        >
          {{ youtubeAuth ? 'Disconnect' : 'Connect YouTube' }}
        </button>
      </div>
    </div>

    <!-- Right Panel - Upload Form -->
    <div class="upload-panel">
      <h2>Video Upload</h2>

      <div class="upload-targets">
        <div class="target-platforms">
          <label class="platform-checkbox">
            <input
                type="checkbox"
                v-model="uploadTargets.facebook"
                :disabled="!facebookAuth"
            >
            <span>Facebook</span>
          </label>
          <label class="platform-checkbox">
            <input
                type="checkbox"
                v-model="uploadTargets.youtube"
                :disabled="!youtubeAuth"
            >
            <span>YouTube</span>
          </label>
        </div>
        <div v-if="!facebookAuth && !youtubeAuth" class="auth-warning">
          Please connect at least one platform to upload
        </div>
      </div>

      <div class="upload-form" :class="{ disabled: !canUpload }">
        <!-- File Upload -->
        <div class="form-section">
          <div class="section-header">
            <h3>Video File</h3>
            <span class="required">Required</span>
          </div>
          <div class="file-drop-zone" @drop.prevent="handleFileDrop" @dragover.prevent>
            <input
                type="file"
                @change="handleFileSelect"
                accept="video/*"
                id="video-file"
            >
            <label for="video-file">
              <div class="drop-zone-content">
                <i class="upload-icon">↑</i>
                <span>Drag & drop or click to select video</span>
                <span class="file-info" v-if="selectedFile">
                  {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
                </span>
              </div>
            </label>
          </div>
        </div>

        <!-- Video Details -->
        <div class="form-section">
          <div class="section-header">
            <h3>Video Details</h3>
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label>Title <span class="required">*</span></label>
              <input
                  v-model="videoDetails.title"
                  type="text"
                  required
                  placeholder="Enter video title"
              >
            </div>

            <div class="form-field">
              <label>Description</label>
              <textarea
                  v-model="videoDetails.description"
                  placeholder="Enter video description"
                  rows="4"
              ></textarea>
            </div>

            <div class="form-field" v-if="uploadTargets.youtube">
              <label>Tags (YouTube)</label>
              <input
                  v-model="videoDetails.tags"
                  type="text"
                  placeholder="Enter tags separated by commas"
              >
            </div>
          </div>
        </div>

        <!-- Platform-specific Settings -->
        <div class="form-section" v-if="uploadTargets.facebook || uploadTargets.youtube">
          <div class="section-header">
            <h3>Privacy Settings</h3>
          </div>

          <div class="platform-settings">
            <div class="settings-card" v-if="uploadTargets.facebook">
              <h4>Facebook Privacy</h4>
              <select v-model="videoDetails.facebookPrivacy">
                <option value="EVERYONE">Public</option>
                <option value="ALL_FRIENDS">Friends</option>
                <option value="SELF">Only Me</option>
              </select>
            </div>

            <div class="settings-card" v-if="uploadTargets.youtube">
              <h4>YouTube Privacy</h4>
              <select v-model="videoDetails.youtubePrivacy">
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Upload Progress -->
        <div v-if="isUploading" class="upload-progress">
          <div v-for="(progress, platform) in uploadProgress"
               :key="platform"
               class="progress-item"
          >
            <div class="progress-header">
              <span>{{ platform }}</span>
              <span>{{ progress.percentage }}%</span>
            </div>
            <div class="progress-bar">
              <div
                  class="progress-fill"
                  :class="platform.toLowerCase()"
                  :style="{ width: progress.percentage + '%' }"
              ></div>
            </div>
            <div class="progress-status">{{ progress.status }}</div>
          </div>
        </div>

        <button
            @click="handleUpload"
            :disabled="!canUpload || isUploading"
            class="upload-button"
        >
          {{ isUploading ? 'Uploading...' : 'Upload Video' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import {onMounted, reactive, ref} from 'vue'

export default {
  name: 'NewUploader',
  setup() {
    const facebookAuth = ref(false)
    const youtubeAuth = ref(false)
    const selectedFile = ref(null)
    const isUploading = ref(false)
    const tokenClient = ref(null)

    const uploadTargets = reactive({
      facebook: false,
      youtube: false
    })

    const uploadProgress = reactive({
      Facebook: {percentage: 0, status: ''},
      YouTube: {percentage: 0, status: ''}
    })

    const videoDetails = reactive({
      title: '',
      description: '',
      tags: '',
      facebookPrivacy: 'EVERYONE',
      youtubePrivacy: 'private'
    })

    // New YouTube specific setup
    const initYouTubeAuth = () => {
      // Load GAPI Script
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://apis.google.com/js/api.js'
        script.onload = () => {
          gapi.load('client', async () => {
            try {
              await gapi.client.init({
                apiKey: import.meta.env.VITE_YOUTUBE_API_KEY,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'],
              })
              loadGsiScript()
              resolve()
            } catch (err) {
              reject(err)
            }
          })
        }
        script.onerror = (err) => reject(err)
        document.head.appendChild(script)
      })
    }

    const loadGsiScript = () => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.onload = () => {
          tokenClient.value = google.accounts.oauth2.initTokenClient({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/youtube.upload',
            callback: (resp) => {
              if (resp.error !== undefined) {
                console.error('YouTube auth error:', resp.error)
                youtubeAuth.value = false
                return
              }
              youtubeAuth.value = true
            },
          })
          resolve()
        }
        script.onerror = (err) => reject(err)
        document.head.appendChild(script)
      })
    }

    onMounted(() => {
      initYouTubeAuth()
    })

    const handleLogin = async (platform) => {
      if (platform === 'facebook') {
        return new Promise((resolve) => {
          FB.login(function (response) {
            if (response.status === 'connected') {
              facebookAuth.value = true
              resolve(true)
            } else {
              console.error('Facebook login failed')
              alert('Facebook login failed. Please try again.')
              resolve(false)
            }
          }, {scope: 'publish_video'})
        })
      } else if (platform === 'youtube') {
        try {
          tokenClient.value.requestAccessToken()
          return true
        } catch (error) {
          console.error('YouTube auth error:', error)
          alert('YouTube authentication failed. Please try again.')
          return false
        }
      }
    }

    const handleLogout = async (platform) => {
      if (platform === 'facebook') {
        FB.logout(() => {
          facebookAuth.value = false
          uploadTargets.facebook = false
        })
      } else if (platform === 'youtube') {
        try {
          const token = gapi.client.getToken()
          if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token)
            gapi.client.setToken('')
            youtubeAuth.value = false
            uploadTargets.youtube = false
          }
        } catch (error) {
          console.error('YouTube logout error:', error)
        }
      }
    }

    const handleFileSelect = (event) => {
      selectedFile.value = event.target.files[0]
      if (selectedFile.value && !videoDetails.title) {
        videoDetails.title = selectedFile.value.name.replace(/\.[^/.]+$/, '')
      }
    }

    const handleFileDrop = (event) => {
      const file = event.dataTransfer.files[0]
      if (file && file.type.startsWith('video/')) {
        selectedFile.value = file
        if (!videoDetails.title) {
          videoDetails.title = file.name.replace(/\.[^/.]+$/, '')
        }
      }
    }

    const readFileAsBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
          const base64 = reader.result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = error => reject(error)
      })
    }

    // Updated YouTube upload function
    const uploadToYouTube = async () => {
      try {
        uploadProgress.YouTube = {percentage: 0, status: 'Starting...'}

        const metadata = {
          snippet: {
            title: videoDetails.title,
            description: videoDetails.description,
            tags: videoDetails.tags ? videoDetails.tags.split(',').map(tag => tag.trim()) : []
          },
          status: {
            privacyStatus: videoDetails.youtubePrivacy
          }
        }

        const boundary = 'foo_bar_baz'
        const delimiter = "\r\n--" + boundary + "\r\n"
        const closeDelimiter = "\r\n--" + boundary + "--"

        const base64Data = await readFileAsBase64(selectedFile.value)

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + selectedFile.value.type + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            base64Data +
            closeDelimiter

        const request = gapi.client.request({
          'path': '/upload/youtube/v3/videos',
          'method': 'POST',
          'params': {
            'uploadType': 'multipart',
            'part': 'snippet,status'
          },
          'headers': {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
          },
          'body': multipartRequestBody
        })

        const response = await request

        if (response.result.id) {
          uploadProgress.YouTube = {percentage: 100, status: 'Complete'}
          return response.result
        } else {
          throw new Error('Upload failed: No video ID received')
        }
      } catch (error) {
        uploadProgress.YouTube = {percentage: 0, status: 'Failed'}
        throw error
      }
    }

    const uploadToFacebook = async () => {
      const response = await new Promise((resolve) => {
        FB.getLoginStatus(function (response) {
          resolve(response)
        })
      })

      const accessToken = response.authResponse.accessToken
      const formData = new FormData()
      formData.append('source', selectedFile.value)
      formData.append('title', videoDetails.title)
      formData.append('description', videoDetails.description)
      formData.append('privacy', JSON.stringify({value: videoDetails.facebookPrivacy}))

      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          uploadProgress.Facebook.percentage = Math.round((event.loaded / event.total) * 100)
          uploadProgress.Facebook.status = 'Uploading...'
        }
      }

      return new Promise((resolve, reject) => {
        xhr.open('POST', `https://graph-video.facebook.com/v18.0/me/videos?access_token=${accessToken}`)

        xhr.onload = () => {
          if (xhr.status === 200) {
            uploadProgress.Facebook.status = 'Complete'
            resolve(JSON.parse(xhr.response))
          } else {
            uploadProgress.Facebook.status = 'Failed'
            reject(new Error('Upload failed'))
          }
        }

        xhr.onerror = () => {
          uploadProgress.Facebook.status = 'Failed'
          reject(new Error('Network error'))
        }

        xhr.send(formData)
      })
    }

    const handleUpload = async () => {
      if (!selectedFile.value || !videoDetails.title) return
      if (!uploadTargets.facebook && !uploadTargets.youtube) {
        alert('Please select at least one platform to upload to')
        return
      }

      isUploading.value = true
      const uploads = []

      try {
        if (uploadTargets.facebook) {
          uploadProgress.Facebook = {percentage: 0, status: 'Starting...'}
          uploads.push(uploadToFacebook())
        }

        if (uploadTargets.youtube) {
          uploadProgress.YouTube = {percentage: 0, status: 'Starting...'}
          uploads.push(uploadToYouTube())
        }

        await Promise.all(uploads)
        alert('Upload completed successfully!')

        // Reset form
        selectedFile.value = null
        videoDetails.title = ''
        videoDetails.description = ''
        videoDetails.tags = ''
        videoDetails.facebookPrivacy = 'EVERYONE'
        videoDetails.youtubePrivacy = 'private'
      } catch (error) {
        console.error('Upload error:', error)
        alert(`Upload failed: ${error.message}`)
      } finally {
        isUploading.value = false
      }
    }

    const canUpload = true

    return {
      facebookAuth,
      youtubeAuth,
      selectedFile,
      uploadTargets,
      videoDetails,
      uploadProgress,
      isUploading,
      canUpload,
      handleLogin,
      handleLogout,
      handleFileSelect,
      handleFileDrop,
      handleUpload,
      formatFileSize: (bytes) => {
        const units = ['B', 'KB', 'MB', 'GB']
        let size = bytes
        let unitIndex = 0
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024
          unitIndex++
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`
      }
    }
  }
}
</script>

<style scoped>
/* Light Theme Variables */
:root {
  --primary-color: #1877f2;
  --primary-dark: #1666d9;
  --secondary-color: #ff0000;
  --secondary-dark: #e60000;
  --background: #f8f9fa;
  --surface: #ffffff;
  --surface-hover: #f0f2f5;
  --border: #dee2e6;
  --text-primary: #1a1a1a;
  --text-secondary: #6c757d;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  --error: #dc3545;
  --success: #28a745;
}

/* Dark Theme Variables */
[data-theme="dark"] {
  --primary-color: #2b8eff;
  --primary-dark: #1877f2;
  --secondary-color: #ff4444;
  --secondary-dark: #ff0000;
  --background: #18191a;
  --surface: #242526;
  --surface-hover: #3a3b3c;
  --border: #3e4042;
  --text-primary: #e4e6eb;
  --text-secondary: #b0b3b8;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  --error: #ff4444;
  --success: #42b883;
}

.uploader-container {
  background: var(--background);
  color: var(--text-primary);
}

.auth-panel,
.upload-panel {
  background: var(--surface);
  box-shadow: var(--shadow);
}

.auth-card {
  background: var(--surface-hover);
  border: 1px solid var(--border);
}

.auth-card.authenticated {
  background: var(--success);
  color: var(--surface);
}

.file-drop-zone {
  border-color: var(--border);
  background: var(--surface);
}

.file-drop-zone:hover {
  border-color: var(--primary-color);
  background: var(--surface-hover);
}

.upload-icon {
  background: var(--surface-hover);
  color: var(--text-secondary);
}

.auth-button.facebook {
  background: var(--primary-color);
}

.auth-button.facebook:hover {
  background: var(--primary-dark);
}

.auth-button.youtube {
  background: var(--secondary-color);
}

.auth-button.youtube:hover {
  background: var(--secondary-dark);
}

.auth-button.logout {
  background: var(--error);
}

input[type="text"],
textarea,
select {
  background: var(--surface);
  border-color: var(--border);
  color: var(--text-primary);
}

input[type="text"]:focus,
textarea:focus,
select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color), 0.1);
}

.settings-card {
  background: var(--surface-hover);
}

.progress-bar {
  background: var(--surface-hover);
}

.progress-fill.facebook {
  background: var(--primary-color);
}

.progress-fill.youtube {
  background: var(--secondary-color);
}

.progress-status {
  color: var(--text-secondary);
}

.upload-button {
  background: var(--primary-color);
}

.upload-button:hover:not(:disabled) {
  background: var(--primary-dark);
}

.upload-button:disabled {
  background: var(--surface-hover);
  color: var(--text-secondary);
}

/* Dark mode specific overrides */
[data-theme="dark"] .file-drop-zone {
  background: var(--surface-hover);
}

[data-theme="dark"] .auth-card.authenticated {
  background: color-mix(in srgb, var(--success) 20%, var(--surface));
  color: var(--text-primary);
}

/* Theme Toggle Button */
.theme-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  cursor: pointer;
  box-shadow: var(--shadow);
}

.theme-toggle:hover {
  background: var(--surface-hover);
}

.uploader-container {
  display: grid;
  grid-template-columns: 300px 700px;
  gap: 12px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  background: #f8f9fa;
}

/* Auth Panel Styles */
.auth-panel {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.auth-card {
  padding: 16px;
  border-radius: 12px;
  background: #f8f9fa;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.auth-card.authenticated {
  background: #e8f5e9;
}

.auth-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.auth-header h3 {
  margin: 0;
  font-size: 18px;
}

/* Upload Panel Styles */
.upload-panel {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.upload-targets {
  margin-bottom: 24px;
}

.target-platforms {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.platform-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.auth-warning {
  color: #dc3545;
  font-size: 14px;
}

.form-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.file-drop-zone {
  border: 2px dashed #dee2e6;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  transition: all 0.3s ease;
}

.file-drop-zone:hover {
  border-color: #1877f2;
  background: #f8f9fa;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-grid {
  display: grid;
  gap: 24px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field label {
  font-weight: 500;
}

.platform-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.settings-card {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 12px;
}

.upload-progress {
  margin-bottom: 24px;
}

.progress-item {
  margin-bottom: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-bar {
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-fill.facebook {
  background: #1877f2;
}

.progress-fill.youtube {
  background: #ff0000;
}

.progress-status {
  font-size: 14px;
  color: #6c757d;
  margin-top: 4px;
}

.upload-button {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: #1877f2;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.upload-button:disabled {
  background: #dee2e6;
  cursor: not-allowed;
}

/* Utility Classes */
.required {
  color: #dc3545;
  font-size: 12px;
}

h2 {
  margin: 0 0 24px;
  font-size: 24px;
}

h3 {
  margin: 0;
  font-size: 18px;
}

h4 {
  margin: 0 0 12px;
  font-size: 16px;
}

input[type="text"],
textarea,
select {
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 14px;
}

input[type="text"]:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #1877f2;
  box-shadow: 0 0 0 3px rgba(24, 119, 242, 0.1);
}

.auth-button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.auth-button.facebook {
  background: #1877f2;
  color: white;
}

.auth-button.youtube {
  background: #ff0000;
  color: white;
}

.auth-button.logout {
  background: #dc3545;
  color: white;
}

.disabled {
  opacity: 0.7;
  pointer-events: none;
}
</style>
