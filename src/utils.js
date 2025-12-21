import { fn } from './consts'
export function b64UrlEncode(buffer) {
  let bytes = new Uint8Array(buffer)
  let binary = Array(bytes.length)
    .fill()
    .map((_, i) => String.fromCharCode(bytes[i]))
    .join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function genCodeVerifier() {
  let array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return b64UrlEncode(array)
}
export async function genCodeChallenge(verifier) {
  let data = new TextEncoder().encode(verifier)
  let hash = await crypto.subtle.digest('SHA-256', data)
  return b64UrlEncode(hash)
}

export let net = {
  request(u, o) {
    return fetch(u, o)
  },
  get(u, p, o) {
    return this.request(`${u}?${new URLSearchParams(p)}`, o)
  },
  post(u, o) {
    return this.request(u, {
      ...o,
      method: 'POST',
    })
  },
  postJson(u, d, o) {
    return this.post(u, {
      ...o,
      body: JSON.stringify(d),
      headers: { 'Content-Type': 'application/json' },
    })
  },
  postForm(u, d, o) {
    return this.post(u, {
      ...o,
      body: new URLSearchParams(d).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
}

export let setText = (selector, text) => {
  chrome.runtime.sendMessage({ type: fn.setText, selector, text })
}
export let log = (msg) => {
  setText('#status', msg)
  console.log(msg)
}
