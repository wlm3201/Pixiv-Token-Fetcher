import { net, log, setText, genCodeVerifier, genCodeChallenge } from './utils'
import { fn } from './consts'
let host = 'https://app-api.pixiv.net'
let client_id = 'MOBrBDS8blbauoSck0ZfDbtuzpyT'
let client_secret = 'lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj'

function saveToken(tokens) {
  chrome.storage.local.set({ tokens })
  showToken(tokens)
}
function showToken(tokens) {
  setText('#rtoken', tokens.refresh_token)
  setText('#atoken', tokens.access_token)
  setText('#uid', tokens.user.id)
}
let rpc = {
  async [fn.loadToken]() {
    let tokens = await chrome.storage.local.get(['tokens']).then((r) => r.tokens)
    if (!tokens) return
    log(`使用缓存token`)
    showToken(tokens)
  },
  async [fn.fetchToken]() {
    let PHPSESSID = await chrome.cookies
      .get({
        url: 'https://www.pixiv.net',
        name: 'PHPSESSID',
      })
      .then((c) => c?.value)
    if (!PHPSESSID || !PHPSESSID.includes('_'))
      return chrome.tabs.create({ url: 'https://www.pixiv.net' })

    let code_verifier = genCodeVerifier()
    let code_challenge = await genCodeChallenge(code_verifier)

    log(`开始获取tt`)
    let params = {
      code_challenge,
      code_challenge_method: 'S256',
      client: 'pixiv-android',
    }
    let loginHtml = await net.get(host + `/web/v1/login`, params).then((r) => r.text())
    let tt = loginHtml.match(/pixivAccount\.tt":"(\w+)"/)?.[1]
    if (!tt) return log(`获取tt失败`)
    log(`获取tt成功: ${tt}`)

    log(`发送code请求`)
    params.via = 'login'
    await net.postForm(
      'https://accounts.pixiv.net/account-selected',
      {
        return_to: host + `/web/v1/users/auth/pixiv/start?${new URLSearchParams(params)}`,
        tt,
      },
      { redirect: 'manual' }
    )
    log(`等待code返回`)
    let codePromise = getCode()
    net.post(host + `/web/v1/users/auth/pixiv/start?${new URLSearchParams(params)}`)
    let code = await codePromise
    if (!code) return log(`获取code超时`)
    log(`获取code成功: ${code}`)

    log(`开始获取token`)
    let tokens = await net
      .postForm('https://oauth.secure.pixiv.net/auth/token', {
        code,
        code_verifier,
        client_id,
        client_secret,
        grant_type: 'authorization_code',
        include_policy: 'true',
        redirect_uri: host + '/web/v1/users/auth/pixiv/callback',
      })
      .then((r) => r.json())
      .catch(() => null)
    if (!tokens?.refresh_token) return log(`获取token失败`)
    log(`获取token成功`)
    saveToken(tokens)
  },
  async [fn.refreshToken]() {
    let refresh_token = await chrome.storage.local
      .get(['tokens'])
      .then((r) => r.tokens?.refresh_token)
    if (!refresh_token) return this[fn.fetchToken]()
    log(`开始刷新token`)
    let tokens = await net
      .postForm('https://oauth.secure.pixiv.net/auth/token', {
        client_id,
        client_secret,
        refresh_token,
        grant_type: 'refresh_token',
        include_policy: 'true',
      })
      .then((r) => r.json())
      .catch(() => null)
    if (!tokens?.access_token) return log(`刷新token失败`)
    log(`刷新token成功`)
    saveToken(tokens)
  },
}

function getCode() {
  return new Promise((r) => {
    let listener = (details) => {
      let code = new URL(details.redirectUrl).searchParams.get('code')
      if (code) unListen(), r(code)
    }
    chrome.webRequest.onBeforeRedirect.addListener(listener, {
      urls: ['*://*.pixiv.net/*'],
    })
    let unListen = () => chrome.webRequest.onBeforeRedirect.removeListener(listener)
    setTimeout(() => (unListen(), r()), 10000)
  })
}

chrome.runtime.onMessage.addListener((m) => {
  if (m.type === fn.rpc) rpc[m.method]()
})
