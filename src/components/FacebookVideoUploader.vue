<template>
  <div class="container">
    <h2>Upload Video to Facebook</h2>

    <!-- Login Section -->
    <div v-if="!isAuthenticated" class="form-group">
      <button @click="handleFBLogin" class="login-button">
        Login with Facebook
      </button>
    </div>

    <!-- Upload Form -->
    <div v-else>
      <div class="form-group">
        <div class="section-title">SELECT VIDEO FILE</div>
        <div class="file-input-container">
          <input
              type="file"
              @change="handleFileSelect"
              accept="video/*"
          >
          <div v-if="selectedFile" class="file-name">
            {{ selectedFile.name }}
          </div>
        </div>
      </div>

      <div class="form-group">
        <div class="field-label">
          <span class="section-title">TITLE</span>
          <span class="required-mark">*</span>
        </div>
        <input
            v-model="videoDetails.title"
            type="text"
            required
            placeholder="Enter video title"
        >
      </div>

      <div class="form-group">
        <div class="section-title">DESCRIPTION</div>
        <textarea
            v-model="videoDetails.description"
            placeholder="Enter video description"
        ></textarea>
      </div>

      <div class="form-group">
        <div class="section-title">VISIBILITY</div>
        <select v-model="videoDetails.privacy">
          <option value="EVERYONE">Public</option>
          <option value="ALL_FRIENDS">Friends</option>
          <option value="SELF">Only Me</option>
        </select>
      </div>

      <!-- Progress Bar -->
      <div v-if="uploadProgress > 0" class="progress-container">
        <div class="progress-bar">
          <div
              class="progress"
              :style="{ width: uploadProgress + '%' }"
          ></div>
        </div>
      </div>

      <button
          class="upload-button"
          @click="handleUpload"
          :disabled="!selectedFile || uploading || !videoDetails.title"
      >
        {{ uploading ? 'UPLOADING...' : 'UPLOAD VIDEO' }}
      </button>
    </div>
  </div>
</template>

<script>
import {computed, reactive, ref, onMounted} from 'vue'

export default {
  name: 'VideoUploader',
  setup() {
    const facebookAuth = ref(false)
    const youtubeAuth = ref(false)
    const selectedFile = ref(null)
    const isUploading = ref(false)
    const gapiLoaded = ref(false)
    const googleAuth = ref(null)

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

    const initGoogleAuth = async () => {
      try {
        // Load the Google API Script
        await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://apis.google.com/js/api.js'
          script.onload = resolve
          document.head.appendChild(script)
        })

        // Load additional Google Identity Services script
        await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://accounts.google.com/gsi/client'
          script.onload = resolve
          document.head.appendChild(script)
        })

        // Initialize the Google API client
        await new Promise((resolve) => {
          window.gapi.load('client:auth2', resolve)
        })

        // Initialize the client with your credentials
        await window.gapi.client.init({
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID', // Use environment variable
          scope: 'https://www.googleapis.com/auth/youtube.upload',
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
        })

        googleAuth.value = window.gapi.auth2.getAuthInstance()
        gapiLoaded.value = true

        // Check if user is already signed in
        if (googleAuth.value.isSignedIn.get()) {
          youtubeAuth.value = true
        }
      } catch (error) {
        console.error('Failed to initialize Google API:', error)
      }
    }

    onMounted(() => {
      initGoogleAuth()
    })

    const handleLogin = async (platform) => {
      if (platform === 'facebook') {
        if (window.location.protocol !== 'https:') {
          alert('Facebook login requires HTTPS. Please access this page via HTTPS.')
          return false
        }

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
          if (!gapiLoaded.value) {
            throw new Error('Google API not initialized')
          }
          await googleAuth.value.signIn()
          youtubeAuth.value = true
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
          if (!gapiLoaded.value) {
            throw new Error('Google API not initialized')
          }
          await googleAuth.value.signOut()
          youtubeAuth.value = false
          uploadTargets.youtube = false
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

    const uploadToYouTube = async () => {
      const accessToken = googleAuth.value.currentUser.get().getAuthResponse().access_token
      const metadata = {
        snippet: {
          title: videoDetails.title,
          description: videoDetails.description,
          tags: videoDetails.tags ? videoDetails.tags.split(',').map(tag => tag.trim()) : [],
        },
        status: {
          privacyStatus: videoDetails.youtubePrivacy,
        }
      }
      const blob = new Blob([JSON.stringify(metadata)], {type: 'application/json'})
      const formData = new FormData()
      formData.append('metadata', blob, 'metadata.json')
      formData.append('file', selectedFile.value)

      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          uploadProgress.YouTube.percentage = Math.round((event.loaded / event.total) * 100)
          uploadProgress.YouTube.status = 'Uploading...'
        }
      }

      return new Promise((resolve, reject) => {
        xhr.open('POST', 'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart')
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)

        xhr.onload = () => {
          if (xhr.status === 200) {
            uploadProgress.YouTube.status = 'Complete'
            resolve(JSON.parse(xhr.response))
          } else {
            uploadProgress.YouTube.status = 'Failed'
            reject(new Error(JSON.parse(xhr.response).error.message || 'Upload failed'))
          }
        }

        xhr.onerror = () => {
          uploadProgress.YouTube.status = 'Failed'
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

    const canUpload = computed(() => {
      return (uploadTargets.facebook || uploadTargets.youtube) &&
          selectedFile.value &&
          videoDetails.title &&
          ((uploadTargets.facebook && facebookAuth.value) ||
              (uploadTargets.youtube && youtubeAuth.value))
    })

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
.container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

h2 {
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 40px;
  position: relative;
  padding-bottom: 8px;
  color: #111;
}

h2::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #1877f2;
  border-radius: 2px;
}

.form-group {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
  text-transform: uppercase;
}

.file-input-container {
  border: 2px dashed #ddd;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.file-input-container:hover {
  border-color: #1877f2;
  background: #fff;
}

input[type="text"],
textarea,
select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s ease;
}

input[type="text"]:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #1877f2;
  box-shadow: 0 0 0 3px rgba(24, 119, 242, 0.1);
}

textarea {
  min-height: 120px;
  resize: vertical;
}

.login-button,
.upload-button {
  width: 100%;
  padding: 14px;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.login-button {
  background: #1877f2;
}

.login-button:hover {
  background: #166fe5;
}

.upload-button {
  background: #1877f2;
}

.upload-button:hover:not(:disabled) {
  background: #166fe5;
  transform: translateY(-1px);
}

.upload-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.progress-container {
  margin: 20px 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: #1877f2;
  transition: width 0.3s ease;
}

.field-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.required-mark {
  color: #1877f2;
  font-weight: 400;
}

.file-name {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
  word-break: break-all;
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}

@media (max-width: 640px) {
  .container {
    padding: 16px;
  }

  h2 {
    font-size: 20px;
    margin-bottom: 32px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  input[type="text"],
  textarea,
  select,
  .upload-button,
  .login-button {
    padding: 12px;
  }
}
</style>
