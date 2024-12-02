<template>
  <div class="dashboard-container">
    <div class="dashboard-layout">
      <div class="main-content">
        <!-- Stream Preview Section -->
        <div class="preview-section">
          <div class="dashboard-card">
            <div class="card-header">
              <Monitor class="header-icon"/>
              <h2 class="header-title">Stream Preview</h2>
              <div class="stream-status" :class="{ 'status-live': streamStatus.isLive }">
                {{ streamStatus.isLive ? 'LIVE' : 'OFFLINE' }}
              </div>
            </div>
            <div class="card-body">
              <div class="preview-wrapper">
                <iframe
                    v-if="previewIframe"
                    :src="previewIframe"
                    width="100%"
                    height="500px"
                    frameborder="0"
                    allowfullscreen>
                </iframe>
                <div id="player" class="player-container"></div>
                <div v-if="!streamStatus.isLive" class="offline-overlay">
                  <AlertCircle class="offline-icon"/>
                  <span>Stream Offline</span>
                </div>
              </div>

              <div class="stats-grid">
                <div class="stat-card">
                  <Users class="stat-icon"/>
                  <div class="stat-info">
                    <span class="stat-label">Current Viewers</span>
                    <span class="stat-value">{{ streamStatus.viewers }}</span>
                  </div>
                </div>

                <div class="stat-card">
                  <Gauge class="stat-icon"/>
                  <div class="stat-info">
                    <span class="stat-label">Stream Quality</span>
                    <span class="stat-value">{{ streamStatus.quality }}</span>
                  </div>
                </div>

                <div class="stat-card">
                  <Activity class="stat-icon"/>
                  <div class="stat-info">
                    <span class="stat-label">Current Bitrate</span>
                    <span class="stat-value">{{ streamStatus.bitrate }} kbps</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuration Section -->
        <div class="config-section">
          <div class="config-grid">
            <!-- Server Configuration -->
            <div class="dashboard-card">
              <div class="card-header">
                <Server class="header-icon"/>
                <h2 class="header-title">Server Configuration</h2>
                <span class="connection-status" :class="serverConfig.status">
                  {{ serverConfig.status }}
                </span>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">Flussonic Server URL</label>
                  <div class="input-wrapper">
                    <Globe class="input-icon"/>
                    <input
                        v-model="serverConfig.url"
                        type="text"
                        placeholder="https://your-server.com"
                        @input="validateServerUrl"
                        :class="{ 'input-error': serverErrors.url }"
                        class="form-input"
                    />
                  </div>
                  <span v-if="serverErrors.url" class="error-text">
                    {{ serverErrors.url }}
                  </span>
                </div>

                <div class="form-group">
                  <label class="form-label">Auth</label>
                  <div class="input-wrapper">
                    <Contact class="input-icon"/>
                    <input
                        v-model="serverConfig.username"
                        type="text"
                        placeholder="Enter your username"
                        class="form-input mx-2"
                    />
                  </div>
                  <div class="input-wrapper">
                    <Key class="input-icon"/>
                    <input
                        v-model="serverConfig.password"
                        type="password"
                        placeholder="Enter your password"
                        class="form-input mx-2"
                    />
                  </div>
                </div>

              </div>
            </div>

            <!-- Stream Configuration -->
            <div class="dashboard-card">
              <div class="card-header">
                <Video class="header-icon"/>
                <h2 class="header-title">Stream Configuration</h2>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">Stream Name</label>
                  <div class="input-wrapper">
                    <Tag class="input-icon"/>
                    <input
                        v-model="streamConfigName"
                        type="text"
                        placeholder="Enter stream name"
                        @input="validateStreamName"
                        :class="{ 'input-error': streamErrors.name }"
                        class="form-input"
                    />
                  </div>
                  <span v-if="streamErrors.name" class="error-text">
                    {{ streamErrors.name }}
                  </span>
                </div>

                <!--                <div class="form-group">-->
                <!--                  <label class="form-label">Stream Key</label>-->
                <!--                  <div class="copy-input-group">-->
                <!--                    <div class="input-wrapper flex-1">-->
                <!--                      <Key class="input-icon"/>-->
                <!--                      <input-->
                <!--                          v-model="clusterKey"-->
                <!--                          type="password"-->
                <!--                          placeholder="Generate or enter stream key"-->
                <!--                          class="form-input"-->
                <!--                      />-->
                <!--                    </div>-->
                <!--                    <button-->
                <!--                        class="btn btn-secondary"-->
                <!--                        @click="generateStreamKey"-->
                <!--                    >-->
                <!--                      <RefreshCw class="btn-icon"/>-->
                <!--                      Generate-->
                <!--                    </button>-->
                <!--                    <button-->
                <!--                        :disabled="!clusterKey"-->
                <!--                        class="btn btn-secondary"-->
                <!--                        @click="copyToClipboard(clusterKey)"-->
                <!--                    >-->
                <!--                      <Copy class="btn-icon"/>-->
                <!--                      Copy-->
                <!--                    </button>-->
                <!--                  </div>-->
                <!--                </div>-->

                <div v-if="isCreateSuccess" class="form-group">
                  <label class="form-label">RTMP URL</label>
                  <div class="copy-input-group">
                    <div class="input-wrapper flex-1">
                      <Link class="input-icon"/>
                      <input
                          :value="rtmpUrl"
                          :disabled="!isCreateSuccess"
                          type="text"
                          readonly
                          class="form-input"
                      />
                    </div>
                    <button
                        :disabled="!isCreateSuccess || !rtmpUrl"
                        class="btn btn-secondary"
                        @click="copyToClipboard(rtmpUrl)"
                    >
                      <Copy class="btn-icon"/>
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Relay Configuration -->
          <div class="dashboard-card mt-6">
            <div class="card-header">
              <Share class="header-icon"/>
              <h2 class="header-title">Relay Configuration</h2>
              <button class="btn btn-secondary" @click="addRelay">
                <Plus class="btn-icon"/>
                Add Relay
              </button>
            </div>
            <div class="card-body">
              <div class="relay-list">
                <TransitionGroup name="list">
                  <div
                      v-for="(relay, index) in relayConfigs"
                      :key="index"
                      class="relay-item"
                  >
                    <div class="relay-content">
                      <div class="form-group">
                        <div class="input-wrapper">
                          <Link class="input-icon"/>
                          <input
                              v-model="relay.url"
                              type="text"
                              :placeholder="`Enter RTMP URL`"
                              @input="() => validateRelayUrl(index)"
                              :class="{ 'input-error': relayErrors[index]?.url }"
                              class="form-input"
                          />
                          <button
                              style="margin-left: 5px;"
                              class="btn btn-danger"
                              @click="removeRelay(index)"
                          >
                            <Trash2 class="btn-icon"/>
                          </button>
                        </div>
                        <div style="margin-top:4px" class="input-wrapper">
                          <Key class="input-icon"/>
                          <input
                              v-model="relay.streamKey"
                              type="password"
                              placeholder="Enter your stream key"
                              class="form-input mx-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TransitionGroup>
              </div>
            </div>
          </div>
        </div>
        <button
            v-if="serverConfig.status !== 'connected'"
            class="btn btn-primary w-full"
            :disabled="!isServerConfigValid || !streamConfigName"
            @click="saveServerConfig"
        >
          <Play class="btn-icon"/>
          <span>{{ serverConfig.status === 'connecting' ? 'Connecting...' : 'Start stream' }}</span>
        </button>
        <button
            v-if="isCreateSuccess && serverConfig.status === 'connected'"
            class="btn btn-error w-full"
            @click="stopStream"
        >
          <Pause class="btn-icon"/>
          <span>Stop stream</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Toast Notifications -->
  <Transition name="fade">
    <div
        v-if="showToast"
        :class="[
        'toast-notification',
        toastMessage.includes('error') ? 'toast-error' : 'toast-success'
      ]"
    >
      <CheckCircle v-if="!toastMessage.includes('error')" class="toast-icon"/>
      <AlertCircle v-else class="toast-icon"/>
      <span>{{ toastMessage }}</span>
    </div>
  </Transition>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {useStreamStatus} from '../composables/useStreamStatus'
import {useToast} from '../composables/useToast'
import {validateStreamName, validateUrl} from '../utils/validators'
import FlussonicAPI from '../api/flussonic'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Contact,
  Copy,
  Gauge,
  Globe,
  Key,
  Link,
  Monitor,
  Pause,
  Play,
  Plus,
  Server,
  Share,
  Tag,
  Trash2,
  Users,
  Video,
} from 'lucide-vue-next'

// State Management
const flussonicAPI = ref(null)
const serverConfig = reactive({
  rtmpUrl: 'http://103.155.161.204:1935',
  url: 'http://103.155.161.204:10000',
  username: 'hoiquanai',
  password: '77ZjmUcwikm_pz^jKKCm',
  status: 'disconnected'
})
const relayConfigs = ref([])
const relayErrors = ref([])
let streamConfig = reactive({
  name: '',
  pushes: relayConfigs.value,
  inputs: [
    {
      url: 'publish://'
    }
  ]
})
const streamConfigName = ref('')
const serverErrors = reactive({
  url: ''
})

const streamErrors = reactive({
  name: ''
})


// Toast & Status Management
const {showToast, toastMessage, showToastMessage} = useToast()
const {streamStatus, startStatusUpdates, stopStatusUpdates} = useStreamStatus()

// Computed Properties
const rtmpUrl = computed(() => {
  if (!serverConfig.url) return ''
  const serverUrl = new URL(serverConfig.rtmpUrl)
  return `rtmp://${serverUrl.hostname}/static/${streamConfigName.value}`
})

const previewIframe = ref('')
const isServerConfigValid = computed(() => {
  return (
      serverConfig.url &&
      !serverErrors.url &&
      serverConfig.username &&
      serverConfig.password &&
      serverConfig.status !== 'connecting'
  )
})

const isCreateSuccess = ref(false)


// Server Configuration
const saveServerConfig = async () => {
  try {
    serverConfig.status = 'connecting'
    // Initialize API client
    flussonicAPI.value = new FlussonicAPI(
        serverConfig.url,
        serverConfig.username,
        serverConfig.password
    )

    // Test connection
    await flussonicAPI.value.validateConnection()
    // Start status updates if stream exists
    if (streamConfigName.value) {
      await createStream()
    }
    serverConfig.status = 'connected'
    showToastMessage('Server connection successful')
  } catch (error) {
    serverConfig.status = 'disconnected'
    showToastMessage(error.message, 'error')
  }
}

// Stream Management

const createStream = async () => {
  try {
    isCreateSuccess.value = false
    if (!flussonicAPI.value) {
      throw new Error('Server not connected')
    }
    const pushes = []
    streamConfig.pushes.forEach(relay => {
      if (relay.url && relay.streamKey) {
        pushes.push({
          url: `${relay.url}/${relay.streamKey}`
        })
      }
    })
    const payload = {
      inputs: streamConfig.inputs,
      pushes: pushes
    }
    await flussonicAPI.value.createStream(streamConfigName.value, payload)
    startStatusUpdates(flussonicAPI.value, streamConfigName.value)
    isCreateSuccess.value = true
    localStorage.setItem('streamConfig', JSON.stringify(streamConfig))
    const serverUrl = new URL(serverConfig.url)
    previewIframe.value = `${serverUrl}${streamConfigName.value}/embed.html`
  } catch (error) {
    showToastMessage(error.message, 'error')
    isCreateSuccess.value = false
    previewIframe.value = ''
  }
}
const stopStream = async () => {
  try {
    await flussonicAPI.value.deleteStream(streamConfigName.value)
    isCreateSuccess.value = false
    previewIframe.value = ''
    serverConfig.status = 'disconnected'
    stopStatusUpdates()
    localStorage.removeItem('streamConfig')
  } catch (error) {
    showToastMessage(error.message, 'error')
  }
}
// Validation
const validateServerUrl = () => {
  if (!validateUrl(serverConfig.url)) {
    serverErrors.url = 'Please enter a valid URL'
  } else {
    serverErrors.url = ''
  }
}

const validateStreamNameInput = () => {
  if (!validateStreamName(streamConfigName.value)) {
    streamErrors.name = 'Stream name must be at least 3 characters and contain only letters, numbers, hyphens and underscores'
  } else {
    streamErrors.name = ''
  }
}

// Relay Management
const addRelay = () => {
  relayConfigs.value.push({
    url: '',
    streamKey: ''
  })
  relayErrors.value.push({})
}

const removeRelay = async (index) => {
  relayConfigs.value.splice(index, 1)
  relayErrors.value.splice(index, 1)
}

const validateRelayUrl = (index) => {
  const relay = relayConfigs.value[index]
  if (!validateUrl(relay.url)) {
    if (!relayErrors.value[index]) {
      relayErrors.value[index] = {}
    }
    relayErrors.value[index].url = 'Please enter a valid URL'
  }
}

// Clipboard Functions
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToastMessage('Copied to clipboard!')
  } catch (err) {
    showToastMessage('Failed to copy to clipboard', 'error')
  }
}

// Lifecycle Hooks
onMounted(() => {
  const savedStreamConfig = localStorage.getItem('streamConfig')
  if (savedStreamConfig) {
    streamConfig = JSON.parse(savedStreamConfig)
    if (streamConfig.pushes) {
      relayConfigs.value = streamConfig.pushes
      relayErrors.value = streamConfig.pushes.map(() => ({}))
    }
    if (streamConfig.name) {
      streamConfigName.value = streamConfig.name
    }
  }
  if (streamConfigName.value) {
    saveServerConfig()
    startStatusUpdates(flussonicAPI.value, streamConfigName.value)
  }
  console.log('streamConfig', streamConfig)
})

onBeforeUnmount(() => {
  stopStatusUpdates()
})
</script>


<style>
:root {
  --primary-color: #2563eb;
  --success-color: #16a34a;
  --danger-color: #dc2626;
  --border-color: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --bg-hover: #f3f4f6;
}

.dashboard-container {
  width: 100%;
  min-height: 100vh;
  background-color: #f9fafb;
  padding: 1.5rem;
}

.dashboard-layout {
  max-width: 1920px;
  margin: 0 auto;
}

.main-content {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 2fr);
  gap: 1.5rem;
  align-items: start;
}

.preview-section {
  position: sticky;
  top: 1.5rem;
}

.stream-status {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: var(--danger-color);
  color: white;
}

.stream-status.status-live {
  background-color: var(--success-color);
}

.dashboard-card {
  background: #ffffff;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.header-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--primary-color);
  margin-right: 0.75rem;
}

.header-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.connection-status {
  margin-left: auto;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.connection-status.disconnected {
  background-color: #fee2e2;
  color: #dc2626;
}

.connection-status.connecting {
  background-color: #fef3c7;
  color: #d97706;
}

.connection-status.connected {
  background-color: #dcfce7;
  color: #16a34a;
}

.card-body {
  padding: 1.25rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.75rem;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--text-secondary);
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.625rem 0.75rem 0.625rem 2.5rem;
  font-size: 0.875rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.input-error {
  border-color: var(--danger-color);
}

.error-text {
  display: block;
  font-size: 0.75rem;
  color: var(--danger-color);
  margin-top: 0.25rem;
}

.preview-wrapper {
  position: relative;
  background-color: #f3f4f6;
  border-radius: 0.5rem;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.player-container {
  position: absolute;
  inset: 0;
}

.offline-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  gap: 0.5rem;
}

.offline-icon {
  width: 2rem;
  height: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
}

.stat-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.stat-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--primary-color);
  margin-top: 0.125rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.relay-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.relay-item {
  background-color: #f9fafb;
  border-radius: 0.5rem;
  padding: 1.25rem;
}

.relay-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.relay-header .form-select {
  flex: 1;
}

.relay-content {
  display: grid;
  gap: 1rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  transition: all 0.2s;
  gap: 0.5rem;
  border: none;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: var(--text-primary);
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.btn-danger {
  background-color: var(--danger-color);
  color: white;
  padding: 0.5rem;
}

.btn-danger:hover:not(:disabled) {
  background-color: #b91c1c;
}

.copy-input-group {
  display: flex;
  gap: 0.5rem;
}

.copy-input-group .input-wrapper {
  flex: 1;
}

.w-full {
  width: 100%;
}

.mt-6 {
  margin-top: 1.5rem;
}

.flex-1 {
  flex: 1;
}

.toast-notification {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: white;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  z-index: 50;
}

.toast-success {
  background-color: var(--success-color);
}

.toast-error {
  background-color: var(--danger-color);
}

.toast-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-1rem);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

@media (max-width: 1280px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .preview-section {
    position: static;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 1rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .card-header,
  .card-body {
    padding: 1rem;
  }

  .copy-input-group {
    flex-direction: column;
  }

  .copy-input-group .btn {
    width: 100%;
  }
}
</style>
