import { Notify } from 'quasar'

// FIXME
// Potential dupplicate of "text-overflow: ellipsis" property
// https://developer.mozilla.org/en-US/docs/Web/CSS/text-overflow
export function ellipseText (text, maxLength = 9999) {
  if (text.length <= maxLength) {
    return text
  }
  const _maxLength = maxLength - 3
  let ellipse = false
  let currentLength = 0
  const result =
      text
        .split(' ')
        .filter(word => {
          currentLength += word.length
          if (ellipse || currentLength >= _maxLength) {
            ellipse = true
            return false
          } else {
            return true
          }
        })
        .join(' ') + '...'
  return result
}

export function convertTimestamp (timestamp) {
  var a = new Date(timestamp * 1000)
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  var year = a.getFullYear()
  var month = months[a.getMonth()]
  var date = a.getDate()
  var hour = a.getHours()
  var min = a.getMinutes()
  var sec = a.getSeconds()
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec
  return time
}

export function ellipseAddress (address, width = 10) {
  return `${address.slice(0, width)}...${address.slice(-width)}`
}

export async function copyToClipboard (text) {
  const clipboardPermission = await navigator.permissions.query({ name: 'clipboard-write' })
  const notifyOptions = {
    position: 'top',
    timeout: 5000,
    message: 'Copied to clipboard'
  }

  if (clipboardPermission.state === 'granted' || clipboardPermission.state === 'prompt') {
    await navigator.clipboard.writeText(text)
  } else {
    notifyOptions.message = 'Unable to access the clipboard'
    notifyOptions.color = 'negative'
  }

  return Notify.create(notifyOptions)
}
