<template>
  <div class="container">
    <h2>Upload Video to YouTube</h2>

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
      <div class="section-title">TAGS (COMMA SEPARATED)</div>
      <input
        v-model="videoDetails.tags"
        type="text"
        placeholder="tag1, tag2, tag3"
      >
    </div>

    <div class="form-group">
      <div class="section-title">PRIVACY STATUS</div>
      <select v-model="videoDetails.privacyStatus">
        <option value="private">Private</option>
        <option value="unlisted">Unlisted</option>
        <option value="public">Public</option>
      </select>
    </div>

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
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { gapi } from 'gapi-script'

export default {
  name: 'VideoUploader',
  setup() {
    const isAuthenticated = ref(false)
    const selectedFile = ref(null)
    const uploadProgress = ref(0)
    const uploading = ref(false)

    const videoDetails = reactive({
      title: '',
      description: '',
      tags: '',
      privacyStatus: 'private',
      publishAt: ''
    })

    const initGapi = async () => {
      try {
        await new Promise((resolve) => gapi.load('client:auth2', resolve))
        await gapi.client.init({
          apiKey: import.meta.env.VITE_YOUTUBE_API_KEY,
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/youtube.upload',
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
        })

        const googleAuth = gapi.auth2.getAuthInstance()
        if (googleAuth.isSignedIn.get()) {
          isAuthenticated.value = true
        }
      } catch (error) {
        console.error('Failed to initialize GAPI:', error)
        alert('Failed to load Google API. Please try refreshing the page.')
      }
    }

    onMounted(() => {
      initGapi()
    })

    const handleAuth = async () => {
      try {
        const googleAuth = gapi.auth2.getAuthInstance()
        await googleAuth.signIn()
        isAuthenticated.value = true
      } catch (error) {
        console.error('Auth error:', error)
        alert('Authentication failed. Please try again.')
      }
    }

    const handleFileSelect = (event) => {
      selectedFile.value = event.target.files[0]
      if (selectedFile.value && !videoDetails.title) {
        videoDetails.title = selectedFile.value.name.replace(/\.[^/.]+$/, "")
      }
    }

    const handleUpload = async () => {
      if (!selectedFile.value || !videoDetails.title) return

      uploading.value = true
      uploadProgress.value = 0

      try {
        const formData = new FormData()

        // Prepare metadata
        const metadata = {
          snippet: {
            title: videoDetails.title,
            description: videoDetails.description,
            tags: videoDetails.tags ? videoDetails.tags.split(',').map(tag => tag.trim()) : [],
          },
          status: {
            privacyStatus: videoDetails.privacyStatus,
            publishAt: videoDetails.publishAt || undefined,
          }
        }

        // Add metadata and file to form
        const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
        formData.append('metadata', blob, 'metadata.json')
        formData.append('file', selectedFile.value)

        // Get access token and upload
        const googleAuth = gapi.auth2.getAuthInstance()
        const accessToken = googleAuth.currentUser.get().getAuthResponse().access_token

        const response = await fetch(
          'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error.message || 'Upload failed')
        }

        const result = await response.json()
        console.log('Upload successful:', result)

        alert('Video uploaded successfully!')

        // Reset form
        selectedFile.value = null
        videoDetails.title = ''
        videoDetails.description = ''
        videoDetails.tags = ''
        videoDetails.privacyStatus = 'private'
        videoDetails.publishAt = ''

        uploadProgress.value = 0
      } catch (error) {
        console.error('Upload error:', error)
        alert(`Upload failed: ${error.message}`)
      } finally {
        uploading.value = false
      }
    }

    return {
      isAuthenticated,
      selectedFile,
      videoDetails,
      uploadProgress,
      uploading,
      handleAuth,
      handleFileSelect,
      handleUpload
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

/* Header styles */
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
  background: #ff0000;
  border-radius: 2px;
}

/* Form group styles */
.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
  text-transform: uppercase;
}

/* File input styles */
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
  border-color: #ff0000;
  background: #fff;
}

input[type="file"] {
  width: 100%;
  margin-bottom: 0;
  cursor: pointer;
}

/* Text input and textarea styles */
input[type="text"],
textarea,
select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: #fff;
}

input[type="text"]:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #ff0000;
  box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
}

textarea {
  min-height: 120px;
  resize: vertical;
}

/* Select styles */
select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}

/* Button styles */
.upload-button {
  width: 100%;
  padding: 14px;
  background: #ff0000;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-button:hover:not(:disabled) {
  background: #e60000;
  transform: translateY(-1px);
}

.upload-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Progress bar styles */
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
  background: #ff0000;
  transition: width 0.3s ease;
}

/* Field labels */
.field-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.required-mark {
  color: #ff0000;
  font-weight: 400;
}

/* Placeholder styles */
::placeholder {
  color: #999;
  opacity: 1;
}

/* File name display */
.file-name {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
  word-break: break-all;
}

/* Section titles */
.section-title {
  text-transform: uppercase;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
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
  .upload-button {
    padding: 12px;
  }
}
</style>
