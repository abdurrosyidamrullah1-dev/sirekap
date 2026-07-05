const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '190518949394-i86r2c8814ehnsc3aiu06fp6op0d569g.apps.googleusercontent.com'
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ')

let tokenClient = null
let gapiInited = false
let gisInited = false
let initPromise = null

// ─── Init ─────────────────────────────────────────────────────────────────────
export const initGoogleAPI = () => {
  if (initPromise) return initPromise

  initPromise = new Promise((resolve, reject) => {
    let gapiReady = false
    let gisReady = false

    const tryResolve = () => {
      if (gapiReady && gisReady) resolve()
    }

    // Load GAPI
    if (window.gapi) {
      loadGapiClient().then(() => { gapiReady = true; tryResolve() }).catch(reject)
    } else {
      const s = document.createElement('script')
      s.src = 'https://apis.google.com/js/api.js'
      s.async = true
      s.defer = true
      s.onload = () => {
        loadGapiClient().then(() => { gapiReady = true; tryResolve() }).catch(reject)
      }
      s.onerror = () => reject(new Error('Failed to load GAPI'))
      document.head.appendChild(s)
    }

    // Load GIS
    if (window.google?.accounts) {
      initTokenClient()
      gisReady = true
      tryResolve()
    } else {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.defer = true
      s.onload = () => {
        initTokenClient()
        gisReady = true
        tryResolve()
      }
      s.onerror = () => reject(new Error('Failed to load GIS'))
      document.head.appendChild(s)
    }
  })

  return initPromise
}

const loadGapiClient = () => {
  return new Promise((resolve, reject) => {
    window.gapi.load('client', {
      callback: async () => {
        try {
          await window.gapi.client.init({})
          await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest')
          gapiInited = true
          resolve()
        } catch (e) {
          reject(e)
        }
      },
      onerror: reject,
    })
  })
}

const initTokenClient = () => {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // set per-request
    error_callback: (e) => console.error('GIS error:', e),
  })
  gisInited = true
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const signInToGoogle = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await initGoogleAPI()
    } catch (e) {
      reject(e)
      return
    }

    if (!tokenClient) {
      reject(new Error('Token client not initialized'))
      return
    }

    tokenClient.callback = (resp) => {
      if (resp.error) {
        reject(new Error(resp.error + ': ' + (resp.error_description || '')))
        return
      }
      const expiry = Date.now() + (resp.expires_in * 1000)
      localStorage.setItem('gtoken_exp', String(expiry))
      localStorage.setItem('gtoken_access', resp.access_token)
      resolve(resp)
    }

    const existing = getStoredToken()
    tokenClient.requestAccessToken({ prompt: existing ? '' : 'consent' })
  })
}

const getStoredToken = () => {
  const exp = localStorage.getItem('gtoken_exp')
  const tok = localStorage.getItem('gtoken_access')
  if (tok && exp && Date.now() < parseInt(exp)) return tok
  return null
}

export const isGoogleSignedIn = () => {
  // Check via gapi or stored token
  const gapiToken = window.gapi?.client?.getToken()
  if (gapiToken?.access_token) return true
  return !!getStoredToken()
}

export const getAccessToken = () => {
  const gapiToken = window.gapi?.client?.getToken()
  if (gapiToken?.access_token) return gapiToken.access_token
  return getStoredToken()
}

export const signOutGoogle = () => {
  const token = window.gapi?.client?.getToken()
  if (token?.access_token) {
    window.google?.accounts?.oauth2?.revoke(token.access_token, () => {})
    window.gapi.client.setToken('')
  }
  localStorage.removeItem('gtoken_exp')
  localStorage.removeItem('gtoken_access')
}

// ─── Drive: Folder Operations ─────────────────────────────────────────────────
export const getOrCreateRootFolder = async () => {
  const token = getAccessToken()
  const res = await driveApi('files', 'GET', null, {
    q: "name='Orderan Desain' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id,name)',
    spaces: 'drive',
  }, token)

  if (res.files?.length > 0) return res.files[0].id

  const folder = await driveApi('files', 'POST', {
    name: 'Orderan Desain',
    mimeType: 'application/vnd.google-apps.folder',
  }, { fields: 'id' }, token)

  return folder.id
}

export const createOrderFolder = async (customerName, orderId) => {
  const token = getAccessToken()
  const rootId = await getOrCreateRootFolder()
  
  const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  const name = `${customerName} - ${dateStr}`

  const folder = await driveApi('files', 'POST', {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [rootId],
  }, { fields: 'id,webViewLink,name' }, token)

  return { id: folder.id, url: folder.webViewLink, name: folder.name }
}

export const getAllOrderFolders = async () => {
  const token = getAccessToken()
  if (!token) return []

  const rootId = await getOrCreateRootFolder()
  
  const res = await driveApi('files', 'GET', null, {
    q: `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name,webViewLink,createdTime)',
    orderBy: 'createdTime desc',
    spaces: 'drive',
  }, token)

  return res.files || []
}

// ─── Drive: File Operations ────────────────────────────────────────────────────
export const uploadFileToDrive = async (file, folderId) => {
  const token = getAccessToken()
  if (!token) throw new Error('Not signed in to Google Drive')

  const metadata = { name: file.name, parents: [folderId] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,mimeType,size,thumbnailLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Upload failed')
  }

  return res.json()
}

export const getDriveFilesByFolder = async (folderId) => {
  const token = getAccessToken()
  if (!token) return []

  const res = await driveApi('files', 'GET', null, {
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,createdTime,modifiedTime)',
    orderBy: 'createdTime desc',
    spaces: 'drive',
  }, token)

  return res.files || []
}

export const deleteDriveFile = async (fileId) => {
  const token = getAccessToken()
  if (!token) throw new Error('Not signed in')

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok && res.status !== 204) throw new Error('Delete failed')
}

// ─── Helper: Drive REST API wrapper ───────────────────────────────────────────
const driveApi = async (resource, method, body, params = {}, token) => {
  const url = new URL(`https://www.googleapis.com/drive/v3/${resource}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }

  const res = await fetch(url.toString(), opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Drive API error ${res.status}`)
  }

  if (res.status === 204) return {}
  return res.json()
}
