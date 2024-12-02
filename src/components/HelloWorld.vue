const handleFBLogin = async () => {
  try {
    const response = await login();
    console.log('Login successful:', response);
    isAuthenticated.value = true;

    try {
      awai# FacebookVideoUploader.vue
<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useFacebookSDK } from './composables/useFacebookSDK'

const { loadSDK, login, getUserPages, uploadVideo } = useFacebookSDK()

const isAuthenticated = ref(false)
const selectedFile = ref(null)
const uploadProgress = ref(0)
const uploading = ref(false)
const userPages = ref([])
const selectedPageId = ref('')

const videoDetails = reactive({
  title: '',
  description: '',
  privacy: 'EVERYONE'
})

const initializeFacebook = async () => {
  try {
    await loadSDK()
    const loginStatus = await getLoginStatus()
    if (loginStatus.status === 'connected') {
      isAuthenticated.value = true
      await loadUserPages()
    }
  } catch (error) {
    console.error('Failed to initialize Facebook:', error)
  }
}

const loadUserPages = async () => {
  try {
    const response = await getUserPages()
    if (response && response.data) {
      userPages.value = response.data
      if (response.data.length > 0) {
        selectedPageId.value = response.data[0].id
      }
    }
  } catch (error) {
    console.error('Error loading pages:', error)
  }
}

const handleFBLogin = async () => {
  try {
    const response = await login()
    console.log('Login response:', response) // Debug info

    if (response.authResponse) {
      isAuthenticated.value = true
      try {
        await loadUserPages()
      } catch (pagesError) {
        console.error('Error loading pages:', pagesError)
        alert('Logged in successfully but failed to load pages. Please ensure you have admin access to at least one Facebook page.')
      }
    } else {
      throw new Error('Failed to get authorization response')
    }
  } catch (error) {
    console.error('Login error:', error)
    if (error.message.includes('cancelled')) {
      alert('Login was cancelled. Please try again and approve all requested permissions.')
    } else {
      alert('Login failed: ' + error.message + '\nPlease ensure you approve all requested permissions.')
    }
  }
}

const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0]
  if (selectedFile.value && !videoDetails.title) {
    videoDetails.title = selectedFile.value.name.replace(/\.[^/.]+$/, '')
  }
}

const handleUpload = async () => {
  if (!selectedFile.value || !videoDetails.title || !selectedPageId.value) {
    alert('Please select a page and fill in all required fields')
    return
  }

  uploading.value = true
  uploadProgress.value = 0

  try {
    const page = userPages.value.find(p => p.id === selectedPageId.value)
    if (!page) {
      throw new Error('Selected page not found')
    }

    await uploadVideo({
      pageId: selectedPageId.value,
      pageAccessToken: page.access_token,
      file: selectedFile.value,
      title: videoDetails.title,
      description: videoDetails.description,
      privacy: videoDetails.privacy
    })

    alert('Video uploaded successfully!')

    // Reset form
    selectedFile.value = null
    videoDetails.title = ''
    videoDetails.description = ''
    videoDetails.privacy = 'EVERYONE'
    uploadProgress.value = 0
  } catch (error) {
    console.error('Upload error:', error)
    alert(`Upload failed: ${error.message}`)
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  initializeFacebook()
})
</script>

<template>
  <div class="container">
    <h2>Upload Video to Facebook Page</h2>

    <!-- Login Section -->
    <div v-if="!isAuthenticated" class="form-group">
      <button @click="handleFBLogin" class="login-button">
        Login with Facebook
      </button>
    </div>

    <!-- Upload Form -->
    <div v-else>
      <!-- Page Selection -->
      <div class="form-group" v-if="userPages.length > 0">
        <div class="section-title">SELECT PAGE</div>
        <select v-model="selectedPageId">
          <option v-for="page in userPages" :key="page.id" :value="page.id">
            {{ page.name }}
          </option>
        </select>
      </div>
      <div v-else class="alert">
        No Facebook Pages found. Please create a page first.
      </div>

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
        :disabled="!selectedFile || uploading || !videoDetails.title || !selectedPageId"
      >
        {{ uploading ? 'UPLOADING...' : 'UPLOAD VIDEO' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* CSS styles remain the same as in your original component */
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

.alert {
  background-color: #fff3cd;
  color: #856404;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #ffeeba;
}

select {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background-color: white;
  font-size: 14px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}

select:focus {
  outline: none;
  border-color: #1877f2;
  box-shadow: 0 0 0 3px rgba(24, 119, 242, 0.1);
}
</style>
