<script setup>
import {ref} from 'vue'
import VideoUploader from './components/VideoUploader.vue'
import FacebookVideoUploader from './components/FacebookVideoUploader.vue'
import StreamingDashboard from './components/StreamingDashboard.vue'
import {Upload, Video} from 'lucide-vue-next'

const currentTab = ref('live')
const appName = import.meta.env.VITE_APP_NAME
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 fixed top-0 w-full z-50">
      <div class="max-w-screen-2xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="text-xl font-semibold text-gray-900">{{ appName }}</h1>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="pt-16 min-h-screen bg-gray-50">
      <div class="max-w-screen-2xl mx-auto px-6 lg:px-8 py-6">
        <!-- Tab Navigation -->
        <div class="bg-white rounded-xl shadow-sm mb-6 p-1.5">
          <div class="flex border-0">
            <button
                class="mr-12"
                @click="currentTab = 'live'"
                :class="[
                'flex-1 px-12 py-3 text-base font-medium flex items-center justify-center rounded-lg transition-all duration-200',
                currentTab === 'live'
                  ? 'bg-blue-50 text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              ]"
            >
              <Video class="w-5 h-5 mr-2.5"/>
              Livestream
            </button>
            <button
                @click="currentTab = 'vod'"
                :class="[
                'flex-1 px-8 py-3 text-base font-medium flex items-center justify-center rounded-lg transition-all duration-200',
                currentTab === 'vod'
                  ? 'bg-blue-50 text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              ]"
            >
              <Upload class="w-5 h-5 mr-2.5"/>
              VOD Upload
            </button>
          </div>
        </div>
        <!-- Tab Content -->
        <div class="tab-content space-y-6">
          <!-- Livestream Tab -->
          <Transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 translate-y-4"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-4"
          >
            <div v-if="currentTab === 'live'" key="live">
              <StreamingDashboard/>
            </div>
          </Transition>

          <!-- VOD Upload Tab -->
          <Transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 translate-y-4"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-4"
          >
            <div v-if="currentTab === 'vod'" key="vod" class="grid lg:grid-cols-2 gap-6">
              <VideoUploader/>
              <FacebookVideoUploader/>
            </div>
          </Transition>
        </div>
      </div>
    </main>
  </div>
</template>
