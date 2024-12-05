<template>
  <div class="facebook-uploader">
    <div v-if="!isAuthenticated" class="auth-section">
      <button @click="handleFacebookLogin" class="auth-button">
        Sign In with Facebook
      </button>
    </div>

    <div v-else class="upload-section">
      <button @click="handleLogout" class="signout-button">
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
          <option value="EVERYONE">Public</option>
          <option value="ALL_FRIENDS">Friends Only</option>
          <option value="SELF">Only Me</option>
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
        Upload to Facebook
      </button>

      <div v-if="uploadedVideoId" class="success-message">
        <p>Video uploaded successfully!</p>
        <a
            :href="'https://facebook.com/' + uploadedVideoId"
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

const FB_APP_ID = '633174302369531'
const FB_API_VERSION = 'v21.0' // Use latest version

export default {
  name: 'FacebookUploader',

  setup() {
    const isAuthenticated = ref(false)
    const selectedFile = ref(null)
    const videoTitle = ref('')
    const videoDescription = ref('')
    const privacyStatus = ref('EVERYONE')
    const uploading = ref(false)
    const uploadProgress = ref(0)
    const uploadedVideoId = ref('')
    const error = ref('')
    const accessToken = ref(null)

    const canUpload = computed(() => {
      return isAuthenticated.value &&
          selectedFile.value &&
          videoTitle.value.trim() !== '' &&
          !uploading.value
    })

    onMounted(() => {
      loadFacebookSDK()
    })

    const loadFacebookSDK = () => {
      return new Promise((resolve) => {
        window.fbAsyncInit = function () {
          FB.init({
            appId: '582597717589392',
            cookie: true,
            xfbml: true,
            version: 'v21.0'
          });

          FB.getLoginStatus(function (response) {
            if (response.status === 'connected') {
              isAuthenticated.value = true
              accessToken.value = response.authResponse.accessToken
            }
            resolve()
          });
        };

        // Load the SDK
        (function (d, s, id) {
          var js, fjs = d.getElementsByTagName(s)[0];
          if (d.getElementById(id)) return;
          js = d.createElement(s);
          js.id = id;
          js.src = "https://connect.facebook.net/en_US/sdk.js";
          fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
      })
    }

    const handleFacebookLogin = () => {
      FB.login(function (response) {
        if (response.authResponse) {
          isAuthenticated.value = true
          accessToken.value = response.authResponse.accessToken
          error.value = ''
        } else {
          error.value = 'Facebook login failed'
        }
      }, {scope: 'pages_manage_posts'});
    }

    const handleLogout = () => {
      FB.logout(function (response) {
        isAuthenticated.value = false
        accessToken.value = null
        error.value = ''
        uploadedVideoId.value = ''
      });
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

        // First, initialize the upload session
        const initResponse = await fetch(
            `https://graph.facebook.com/${FB_API_VERSION}/me/videos?access_token=${accessToken.value}`,
            {
              method: 'POST',
              body: JSON.stringify({
                file_size: selectedFile.value.size,
                title: videoTitle.value,
                description: videoDescription.value,
                privacy: {value: privacyStatus.value}
              })
            }
        )

        const initData = await initResponse.json()

        if (initData.error) {
          throw new Error(initData.error.message)
        }

        const {upload_session_id, video_id} = initData

        // Now upload the video in chunks
        const chunkSize = 1024 * 1024 * 8 // 8MB chunks
        const numberOfChunks = Math.ceil(selectedFile.value.size / chunkSize)

        for (let i = 0; i < numberOfChunks; i++) {
          const start = i * chunkSize
          const end = Math.min(start + chunkSize, selectedFile.value.size)
          const chunk = selectedFile.value.slice(start, end)

          const formData = new FormData()
          formData.append('video_file_chunk', chunk)
          formData.append('upload_phase', 'transfer')
          formData.append('start_offset', start)

          const uploadResponse = await fetch(
              `https://graph-video.facebook.com/${FB_API_VERSION}/me/videos?access_token=${accessToken.value}&upload_session_id=${upload_session_id}`,
              {
                method: 'POST',
                body: formData
              }
          )

          const uploadData = await uploadResponse.json()

          if (uploadData.error) {
            throw new Error(uploadData.error.message)
          }

          // Update progress
          uploadProgress.value = Math.round((i + 1) * 100 / numberOfChunks)
        }

        // Finish the upload
        const finishResponse = await fetch(
            `https://graph-video.facebook.com/${FB_API_VERSION}/me/videos?access_token=${accessToken.value}&upload_session_id=${upload_session_id}`,
            {
              method: 'POST',
              body: JSON.stringify({
                upload_phase: 'finish'
              })
            }
        )

        const finishData = await finishResponse.json()

        if (finishData.error) {
          throw new Error(finishData.error.message)
        }

        uploadedVideoId.value = video_id
        uploading.value = false
        uploadProgress.value = 100

        // Reset form
        videoTitle.value = ''
        videoDescription.value = ''
        selectedFile.value = null
        error.value = ''

      } catch (err) {
        console.error('Upload error:', err)
        error.value = `Upload failed: ${err.message || 'Unknown error'}`
        uploading.value = false
        uploadProgress.value = 0
      }
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
      handleFacebookLogin,
      handleLogout,
      handleFileSelect,
      uploadVideo
    }
  }
}
</script>

<style scoped>
.facebook-uploader {
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
  background-color: #1877F2;
  transition: width 0.3s ease;
}

.auth-button,
.upload-button {
  background-color: #1877F2;
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
  color: #1877F2;
  text-decoration: none;
}

.success-message a:hover {
  text-decoration: underline;
}
</style>
