<!-- YoutubeUploader.vue -->
<template>
  <div class="youtube-uploader">
    <div v-if="!isAuthenticated" class="auth-section">
      <button @click="handleAuthClick" class="auth-button">
        Sign In with Google
      </button>
    </div>

    <div v-else class="upload-section">
      <button @click="handleSignoutClick" class="signout-button">
        Sign Out
      </button>

      <div class="file-input">
        <input
            type="file"
            @change="handleFileSelect"
            accept="video/*"
            ref="fileInput"
        >
        <p v-if="selectedFile">Selected: {{ selectedFile.name }}</p>
      </div>

      <div class="video-details">
        <input
            v-model="videoTitle"
            placeholder="Enter video title"
            class="input-field"
        >
        <textarea
            v-model="videoDescription"
            placeholder="Enter video description"
            class="input-field"
        ></textarea>
        <select v-model="privacyStatus" class="input-field">
          <option value="private">Private</option>
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </select>
      </div>

      <div class="upload-progress" v-if="uploading">
        <div class="progress-bar">
          <div
              class="progress-fill"
              :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
        <p>Upload Progress: {{ uploadProgress }}%</p>
      </div>

      <button
          @click="uploadVideo"
          :disabled="!canUpload"
          class="upload-button"
      >
        Upload to YouTube
      </button>

      <div v-if="uploadedVideoId" class="success-message">
        <p>Video uploaded successfully!</p>
        <a
            :href="'https://youtube.com/watch?v=' + uploadedVideoId"
            target="_blank"
        >
          View Video
        </a>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, ref} from 'vue'

// Thay thế các giá trị này bằng thông tin của bạn
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload'

export default {
  name: 'YoutubeUploader',

  setup() {
    const isAuthenticated = ref(false)
    const selectedFile = ref(null)
    const videoTitle = ref('')
    const videoDescription = ref('')
    const privacyStatus = ref('private')
    const uploading = ref(false)
    const uploadProgress = ref(0)
    const uploadedVideoId = ref('')
    const error = ref('')
    const tokenClient = ref(null)

    const canUpload = computed(() => {
      return isAuthenticated.value &&
          selectedFile.value &&
          videoTitle.value.trim() !== '' &&
          !uploading.value
    })

    onMounted(() => {
      // Load both required Google API scripts
      loadGapiScript().then(loadGsiScript)
    })

    const loadGapiScript = () => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://apis.google.com/js/api.js'
        script.onload = () => {
          gapi.load('client', async () => {
            try {
              await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'],
              })
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
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (resp) => {
              if (resp.error !== undefined) {
                error.value = `Authentication failed: ${resp.error}`
                isAuthenticated.value = false
                return
              }
              isAuthenticated.value = true
            },
          })
          resolve()
        }
        script.onerror = (err) => reject(err)
        document.head.appendChild(script)
      })
    }

    const handleAuthClick = () => {
      tokenClient.value.requestAccessToken()
    }

    const handleSignoutClick = () => {
      const token = gapi.client.getToken()
      if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token)
        gapi.client.setToken('')
        isAuthenticated.value = false
        error.value = ''
        uploadedVideoId.value = ''
      }
    }

    const handleFileSelect = (event) => {
      const file = event.target.files[0]
      if (file && file.type.includes('video/')) {
        selectedFile.value = file
        error.value = ''
      } else {
        error.value = 'Please select a valid video file'
        selectedFile.value = null
      }
    }

    const uploadVideo = async () => {
      if (!canUpload.value) return

      try {
        uploading.value = true
        error.value = ''
        uploadProgress.value = 0

        const metadata = {
          snippet: {
            title: videoTitle.value,
            description: videoDescription.value,
          },
          status: {
            privacyStatus: privacyStatus.value
          }
        };

        // Create a blob from the metadata
        const metadataBlob = new Blob(
            [JSON.stringify(metadata)],
            {type: 'application/json'}
        );

        // Create the multipart request body
        const boundary = 'foo_bar_baz'
        const delimiter = "\r\n--" + boundary + "\r\n"
        const closeDelimiter = "\r\n--" + boundary + "--"

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + selectedFile.value.type + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            await readFileAsBase64(selectedFile.value) +
            closeDelimiter;

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
        });

        const response = await request;

        // Handle successful upload
        if (response.result.id) {
          uploadedVideoId.value = response.result.id;
          uploadProgress.value = 100;
          uploading.value = false;

          // Reset form
          videoTitle.value = ''
          videoDescription.value = ''
          selectedFile.value = null
          error.value = ''
        } else {
          throw new Error('Upload failed: No video ID received');
        }

      } catch (err) {
        console.error('Upload error:', err);
        error.value = `Upload failed: ${err.message || 'Unknown error'}`;
        uploading.value = false;
        uploadProgress.value = 0;
      }
    }
    const readFileAsBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          // Remove the "data:video/xxx;base64," prefix
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = error => reject(error);
      });
    }
    return {
      isAuthenticated,
      selectedFile,
      videoTitle,
      videoDescription,
      privacyStatus,
      uploading,
      uploadProgress,
      uploadedVideoId,
      error,
      canUpload,
      handleAuthClick,
      handleSignoutClick,
      handleFileSelect,
      uploadVideo
    }
  }
}
</script>

<style scoped>
.youtube-uploader {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.auth-section,
.upload-section {
  margin: 20px 0;
}

.input-field {
  width: 100%;
  margin: 10px 0;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
}

.auth-button,
.upload-button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.signout-button {
  background-color: #f44336;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 20px;
}

.upload-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  color: #f44336;
  margin: 10px 0;
}

.success-message {
  color: #4CAF50;
  margin: 10px 0;
}

.success-message a {
  color: #2196F3;
  text-decoration: none;
}

.success-message a:hover {
  text-decoration: underline;
}
</style>
