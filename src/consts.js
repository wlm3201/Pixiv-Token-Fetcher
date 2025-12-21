let _fn = {
  loadToken: '',
  fetchToken: '',
  refreshToken: '',
  setText: '',
}
export let fn = new Proxy(_fn, { get: (t, p) => p })
