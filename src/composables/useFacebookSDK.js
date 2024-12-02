// composables/useFacebookSDK.js
import { ref } from 'vue'

const isSDKLoaded = ref(false)
const FB = ref(null)

export function useFacebookSDK() {
  const loadSDK = () => {
    return new Promise((resolve, reject) => {
      // Only load once
      if (isSDKLoaded.value) {
        resolve(FB.value)
        return
      }

      // Define async init function
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: import.meta.env.VITE_FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        })

        FB.value = window.FB
        isSDKLoaded.value = true
        resolve(FB.value)
      }

      // Load the SDK
      try {
        const script = document.createElement('script')
        script.async = true
        script.defer = true
        script.crossOrigin = 'anonymous'
        script.src = 'https://connect.facebook.net/en_US/sdk.js'
        script.onload = () => console.log('FB SDK script loaded')
        script.onerror = (error) => reject(new Error('Failed to load Facebook SDK: ' + error))

        document.head.appendChild(script)
      } catch (error) {
        reject(error)
      }
    })
  }

  const login = async () => {
    if (!FB.value) {
      throw new Error('Facebook SDK not initialized')
    }

    return new Promise((resolve, reject) => {
      FB.value.login(function(response) {
        if (response.authResponse) {
          // User successfully authorized the app
          resolve(response)
        } else {
          // User cancelled login or didn't fully authorize
          reject(new Error('User cancelled login or did not fully authorize.'))
        }
      }, {
        scope: 'pages_manage_posts,pages_read_engagement,pages_show_list,pages_messaging',
        return_scopes: true // This will return the granted scopes
      })
    })
  }

  const getLoginStatus = async () => {
    if (!FB.value) {
      throw new Error('Facebook SDK not initialized')
    }

    return new Promise((resolve) => {
      FB.value.getLoginStatus(resolve)
    })
  }

  const getUserPages = async () => {
    if (!FB.value) {
      throw new Error('Facebook SDK not initialized')
    }

    return new Promise((resolve, reject) => {
      FB.value.api('/me/accounts', (response) => {
        if (!response || response.error) {
          reject(new Error(response?.error?.message || 'Failed to fetch pages'))
          return
        }
        resolve(response)
      })
    })
  }

  const uploadVideo = async ({ pageId, pageAccessToken, file, title, description, privacy }) => {
    if (!FB.value) {
      throw new Error('Facebook SDK not initialized')
    }

    const formData = new FormData()
    formData.append('source', file)
    formData.append('title', title)
    formData.append('description', description)
    formData.append('privacy', JSON.stringify({ value: privacy }))

    return fetch(
      `https://graph-video.facebook.com/v18.0/${pageId}/videos?access_token=${pageAccessToken}`,
      {
        method: 'POST',
        body: formData
      }
    ).then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(error.error?.message || 'Upload failed')
        })
      }
      return response.json()
    })
  }

  return {
    loadSDK,
    login,
    getLoginStatus,
    getUserPages,
    uploadVideo,
    isSDKLoaded
  }
}
