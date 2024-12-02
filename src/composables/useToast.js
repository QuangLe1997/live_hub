import { ref } from 'vue'

export function useToast() {
  const showToast = ref(false)
  const toastMessage = ref('')
  let toastTimeout = null

  const showToastMessage = (message, type = 'success') => {
    if (toastTimeout) {
      clearTimeout(toastTimeout)
    }

    toastMessage.value = type === 'error' ? `Error: ${message}` : message
    showToast.value = true

    toastTimeout = setTimeout(() => {
      showToast.value = false
      toastMessage.value = ''
    }, 3000)
  }

  return {
    showToast,
    toastMessage,
    showToastMessage
  }
}
