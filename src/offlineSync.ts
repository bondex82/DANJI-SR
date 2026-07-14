import { openDB, PendingRequest, PendingUpload, savePendingUpload, getPendingUpload, deletePendingUpload, savePendingRequest, getPendingRequests, deletePendingRequest } from './lib/offlineDb';

// Re-export DB helpers
export { savePendingRequest, getPendingRequests, deletePendingRequest };

// Custom Event Name for Sync UI updates
export const OFFLINE_SYNC_EVENT = 'offline-sync-update';

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  error: string | null;
}

class OfflineSyncManager {
  private onlineStatus: boolean = navigator.onLine;
  private syncing: boolean = false;
  private lastSync: string | null = null;
  private syncError: string | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
    
    // Automatically trigger sync on start if online
    if (this.onlineStatus) {
      this.triggerSync();
    }
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    // Initial emit
    this.getPendingCount().then((count) => {
      listener({
        isOnline: this.onlineStatus,
        pendingCount: count,
        isSyncing: this.syncing,
        lastSyncTime: this.lastSync,
        error: this.syncError,
      });
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners() {
    const count = await this.getPendingCount();
    const status: SyncStatus = {
      isOnline: this.onlineStatus,
      pendingCount: count,
      isSyncing: this.syncing,
      lastSyncTime: this.lastSync,
      error: this.syncError,
    };
    this.listeners.forEach((listener) => listener(status));
    
    // Dispatch standard DOM event for broader compatibility
    window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_EVENT, { detail: status }));
  }

  private async handleNetworkChange(online: boolean) {
    this.onlineStatus = online;
    await this.notifyListeners();
    if (online) {
      console.log('[OfflineSync] Network restored. Initializing sync...');
      this.triggerSync();
    }
  }

  public get isOnline(): boolean {
    return this.onlineStatus;
  }

  public async getPendingCount(): Promise<number> {
    try {
      const reqs = await getPendingRequests();
      return reqs.length;
    } catch {
      return 0;
    }
  }

  /**
   * Safe fetch interceptor
   */
  public async safeFetch(url: string, options?: RequestInit, label?: string): Promise<Response> {
    const method = options?.method || 'GET';
    const isGet = method.toUpperCase() === 'GET';

    // 1. GET requests caching and fallback
    if (isGet) {
      // Create cache key
      const cacheKey = `cache_get_${url}`;

      if (!this.onlineStatus) {
        console.log(`[OfflineSync] Offline: Serving GET ${url} from cache`);
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          return new Response(cachedData, {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-Offline-Cache': 'true' }
          });
        }
        return new Response(JSON.stringify({ error: 'Offline and no cached data available' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      try {
        const res = await fetch(url, options);
        if (res.ok) {
          const clone = res.clone();
          clone.text().then((text) => {
            try {
              localStorage.setItem(cacheKey, text);
            } catch (e) {
              console.warn('[OfflineSync] LocalStorage cache storage failed (quota full?)', e);
            }
          });
        }
        return res;
      } catch (err) {
        console.warn(`[OfflineSync] GET ${url} failed. Trying offline cache fallback...`, err);
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          return new Response(cachedData, {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-Offline-Cache': 'true' }
          });
        }
        throw err;
      }
    }

    // 2. Intercept Image/File Upload in POST /api/upload
    if (url === '/api/upload' && method.toUpperCase() === 'POST' && options?.body instanceof FormData) {
      if (!this.onlineStatus) {
        const file = options.body.get('file') as File | null;
        if (file) {
          const offlineId = `offline-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          console.log(`[OfflineSync] Offline: Intercepting upload for file: ${file.name}. Saved as ${offlineId}`);
          
          await savePendingUpload({
            id: offlineId,
            file: file,
            name: file.name
          });

          // Return mocked successful upload response with local offline ID
          return new Response(JSON.stringify({ url: offlineId, status: 'offline-buffered' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // 3. POST/PUT/DELETE mutations caching and queueing
    if (!this.onlineStatus) {
      console.log(`[OfflineSync] Offline: Queueing mutation ${method} ${url}`);
      return await this.queueRequest(url, options, label);
    }

    try {
      const res = await fetch(url, options);
      return res;
    } catch (err: any) {
      console.warn(`[OfflineSync] Mutation ${method} ${url} failed due to network error. Queueing request...`, err);
      return await this.queueRequest(url, options, label);
    }
  }

  private async queueRequest(url: string, options?: RequestInit, label?: string): Promise<Response> {
    let bodyObj: any = null;
    if (options?.body) {
      try {
        if (typeof options.body === 'string') {
          bodyObj = JSON.parse(options.body);
        }
      } catch {
        bodyObj = options.body;
      }
    }

    // Build headers representation
    const headersObj: Record<string, string> = {};
    if (options?.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((v, k) => { headersObj[k] = v; });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([k, v]) => { headersObj[k] = v; });
      } else {
        Object.assign(headersObj, options.headers);
      }
    }

    // Autogenerate readable label if not provided
    let requestLabel = label || `${options?.method || 'POST'} request`;
    if (!label && bodyObj) {
      if (url.includes('results')) {
        requestLabel = `Vote count submission`;
      } else if (url.includes('accreditations')) {
        requestLabel = `Accreditation & logistics data`;
      } else if (url.includes('incidents')) {
        requestLabel = `Incident report: ${bodyObj.description?.substring(0, 30)}...`;
      }
    }

    const pending: PendingRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      url: url,
      method: options?.method || 'POST',
      headers: headersObj,
      body: bodyObj,
      timestamp: new Date().toISOString(),
      label: requestLabel,
    };

    await savePendingRequest(pending);
    await this.notifyListeners();

    // Return a custom successful Response mimicking normal sync
    return new Response(JSON.stringify({ 
      status: 'queued', 
      message: 'Offline mode: Your report is saved locally and will auto-sync when online.',
      queuedId: pending.id,
      optimistic: true 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Perform synchronization
   */
  public async triggerSync(): Promise<boolean> {
    if (this.syncing) return false;
    if (!this.onlineStatus) {
      console.log('[OfflineSync] Offline: Cannot trigger sync right now.');
      return false;
    }

    const reqs = await getPendingRequests();
    if (reqs.length === 0) {
      return false;
    }

    console.log(`[OfflineSync] Online: Starting synchronization of ${reqs.length} pending items...`);
    this.syncing = true;
    this.syncError = null;
    await this.notifyListeners();

    try {
      for (const req of reqs) {
        console.log(`[OfflineSync] Syncing item: ${req.label} (${req.id})`);
        
        // 1. Pre-process payload to upload any buffered offline files first
        const updatedBody = await this.resolveAndUploadFiles(req.body);

        // 2. Refresh token header if needed
        const currentToken = localStorage.getItem('token');
        if (currentToken && req.headers['Authorization']) {
          req.headers['Authorization'] = `Bearer ${currentToken}`;
        }

        // 3. Dispatch the real request
        const res = await fetch(req.url, {
          method: req.method,
          headers: {
            ...req.headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedBody)
        });

        if (res.ok || res.status < 500) {
          // If successfully posted (or permanent 4xx error that can't be resolved), delete it
          console.log(`[OfflineSync] Synced successfully (status: ${res.status}): ${req.label}`);
          await deletePendingRequest(req.id);
        } else {
          // Network issues or 5xx server errors, retry later
          throw new Error(`Server returned error status ${res.status}`);
        }
      }
      this.lastSync = new Date().toISOString();
      console.log('[OfflineSync] Sync completed successfully.');
    } catch (err: any) {
      console.error('[OfflineSync] Sync failed:', err.message);
      this.syncError = err.message;
    } finally {
      this.syncing = false;
      await this.notifyListeners();
    }

    return true;
  }

  /**
   * Recursively traverses request body and replaces offline-file-X ids with actual uploaded URLs.
   */
  private async resolveAndUploadFiles(obj: any): Promise<any> {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      if (obj.startsWith('offline-file-')) {
        const upload = await getPendingUpload(obj);
        if (upload) {
          console.log(`[OfflineSync] Uploading offline buffered file: ${upload.name} (${upload.id})...`);
          const formData = new FormData();
          formData.append('file', upload.file);
          
          const token = localStorage.getItem('token');
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
          });

          if (!res.ok) {
            throw new Error(`File upload failed with status ${res.status} during background sync.`);
          }

          const data = await res.json();
          console.log(`[OfflineSync] File uploaded successfully. Remote URL: ${data.url}`);
          // Remove local file cache to free space
          await deletePendingUpload(obj);
          return data.url;
        }
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      const resolved = [];
      for (const item of obj) {
        resolved.push(await this.resolveAndUploadFiles(item));
      }
      return resolved;
    }

    if (typeof obj === 'object') {
      const resolved: any = {};
      for (const key of Object.keys(obj)) {
        resolved[key] = await this.resolveAndUploadFiles(obj[key]);
      }
      return resolved;
    }

    return obj;
  }
}

export const syncManager = new OfflineSyncManager();
export default syncManager;
