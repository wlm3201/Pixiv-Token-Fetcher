let $ = document.querySelector
$ = $.bind(document)
import { fn } from './consts'

chrome.runtime.onMessage.addListener((m) => {
  if (m.type === fn.setText) $(m.selector).textContent = m.text
})
$('#fetchtoken').onclick = async () =>
  chrome.runtime.sendMessage({ type: fn.rpc, method: fn.fetchToken })
$('#refreshtoken').onclick = async () =>
  chrome.runtime.sendMessage({ type: fn.rpc, method: fn.refreshToken })
chrome.runtime.sendMessage({ type: fn.rpc, method: fn.loadToken })
