import {
  EventRecord,
  EventTemplate,
  PlaybookGuide,
  OfflineQueueItem,
  CacheMetadata,
} from '../types/index.ts';

const DB_NAME = 'revloop_events_cache_v1';
const DB_VERSION = 1;

class IndexedDbCacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isSupported: boolean = typeof window !== 'undefined' && 'indexedDB' in window;

  constructor() {
    if (this.isSupported) {
      // Warm up connection
      this.getDB().catch(err => {
        console.warn('IndexedDB initial connection warning:', err);
      });
    }
  }

  /**
   * Returns a promise to open or access the IndexedDB database.
   */
  private getDB(): Promise<IDBDatabase> {
    if (!this.isSupported) {
      return Promise.reject(new Error('IndexedDB não é suportado neste ambiente'));
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Object Store for Events
          if (!db.objectStoreNames.contains('events')) {
            const eventStore = db.createObjectStore('events', { keyPath: 'id' });
            eventStore.createIndex('status', 'status', { unique: false });
            eventStore.createIndex('department', 'department', { unique: false });
            eventStore.createIndex('stage', 'stage', { unique: false });
            eventStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }

          // Object Store for Templates
          if (!db.objectStoreNames.contains('templates')) {
            db.createObjectStore('templates', { keyPath: 'id' });
          }

          // Object Store for Playbooks
          if (!db.objectStoreNames.contains('playbooks')) {
            db.createObjectStore('playbooks', { keyPath: 'id' });
          }

          // Object Store for Metadata (lastSync, stats, etc.)
          if (!db.objectStoreNames.contains('meta')) {
            db.createObjectStore('meta', { keyPath: 'key' });
          }

          // Object Store for Offline Mutation Queue
          if (!db.objectStoreNames.contains('offline_queue')) {
            const queueStore = db.createObjectStore('offline_queue', {
              keyPath: 'id',
              autoIncrement: true,
            });
            queueStore.createIndex('status', 'status', { unique: false });
            queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error || new Error('Falha ao abrir IndexedDB'));
        };

        request.onblocked = () => {
          console.warn('Conexão ao IndexedDB bloqueada por outra aba.');
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.dbPromise;
  }

  /**
   * Helper to perform a transaction operation.
   */
  private async executeTx<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    callback: (tx: IDBTransaction) => Promise<T> | T
  ): Promise<T> {
    const db = await this.getDB();
    return new Promise<T>((resolve, reject) => {
      try {
        const tx = db.transaction(storeNames, mode);
        let result: T;

        tx.oncomplete = () => {
          resolve(result);
        };

        tx.onerror = () => {
          reject(tx.error || new Error('Erro na transação IndexedDB'));
        };

        tx.onabort = () => {
          reject(tx.error || new Error('Transação abortada'));
        };

        Promise.resolve(callback(tx))
          .then(res => {
            result = res;
          })
          .catch(err => {
            try {
              tx.abort();
            } catch (_) {}
            reject(err);
          });
      } catch (err) {
        reject(err);
      }
    });
  }

  // ==========================================
  // EVENTS CACHE
  // ==========================================

  public async saveEvents(events: EventRecord[]): Promise<void> {
    if (!this.isSupported || !events || events.length === 0) return;

    await this.executeTx(['events', 'meta'], 'readwrite', tx => {
      const eventStore = tx.objectStore('events');
      const metaStore = tx.objectStore('meta');

      for (const event of events) {
        eventStore.put(event);
      }

      metaStore.put({
        key: 'last_sync_time',
        value: new Date().toISOString(),
      });
      metaStore.put({
        key: 'events_count',
        value: events.length,
      });
    });
  }

  public async saveEvent(event: EventRecord): Promise<void> {
    if (!this.isSupported || !event) return;

    await this.executeTx(['events'], 'readwrite', tx => {
      const store = tx.objectStore('events');
      store.put(event);
    });
  }

  public async getEvents(): Promise<EventRecord[]> {
    if (!this.isSupported) return [];

    try {
      const db = await this.getDB();
      return new Promise<EventRecord[]>((resolve, reject) => {
        const tx = db.transaction('events', 'readonly');
        const store = tx.objectStore('events');
        const req = store.getAll();

        req.onsuccess = () => {
          resolve(req.result || []);
        };

        req.onerror = () => {
          reject(req.error);
        };
      });
    } catch (err) {
      console.warn('Erro ao ler eventos do IndexedDB:', err);
      return [];
    }
  }

  public async getEventById(id: string): Promise<EventRecord | null> {
    if (!this.isSupported || !id) return null;

    try {
      const db = await this.getDB();
      return new Promise<EventRecord | null>((resolve, reject) => {
        const tx = db.transaction('events', 'readonly');
        const store = tx.objectStore('events');
        const req = store.get(id);

        req.onsuccess = () => {
          resolve(req.result || null);
        };

        req.onerror = () => {
          reject(req.error);
        };
      });
    } catch (err) {
      console.warn(`Erro ao buscar evento ${id} no IndexedDB:`, err);
      return null;
    }
  }

  public async deleteEvent(id: string): Promise<void> {
    if (!this.isSupported || !id) return;

    await this.executeTx(['events'], 'readwrite', tx => {
      const store = tx.objectStore('events');
      store.delete(id);
    });
  }

  // ==========================================
  // TEMPLATES & PLAYBOOKS CACHE
  // ==========================================

  public async saveTemplates(templates: EventTemplate[]): Promise<void> {
    if (!this.isSupported || !templates) return;

    await this.executeTx(['templates'], 'readwrite', tx => {
      const store = tx.objectStore('templates');
      for (const t of templates) {
        store.put(t);
      }
    });
  }

  public async getTemplates(): Promise<EventTemplate[]> {
    if (!this.isSupported) return [];

    try {
      const db = await this.getDB();
      return new Promise<EventTemplate[]>((resolve, reject) => {
        const tx = db.transaction('templates', 'readonly');
        const store = tx.objectStore('templates');
        const req = store.getAll();

        req.onsuccess = () => {
          resolve(req.result || []);
        };

        req.onerror = () => {
          reject(req.error);
        };
      });
    } catch (err) {
      return [];
    }
  }

  public async savePlaybooks(playbooks: PlaybookGuide[]): Promise<void> {
    if (!this.isSupported || !playbooks) return;

    await this.executeTx(['playbooks'], 'readwrite', tx => {
      const store = tx.objectStore('playbooks');
      for (const p of playbooks) {
        store.put(p);
      }
    });
  }

  public async getPlaybooks(): Promise<PlaybookGuide[]> {
    if (!this.isSupported) return [];

    try {
      const db = await this.getDB();
      return new Promise<PlaybookGuide[]>((resolve, reject) => {
        const tx = db.transaction('playbooks', 'readonly');
        const store = tx.objectStore('playbooks');
        const req = store.getAll();

        req.onsuccess = () => {
          resolve(req.result || []);
        };

        req.onerror = () => {
          reject(req.error);
        };
      });
    } catch (err) {
      return [];
    }
  }

  // ==========================================
  // METADATA & SETTINGS
  // ==========================================

  public async setMeta(key: string, value: any): Promise<void> {
    if (!this.isSupported) return;

    await this.executeTx(['meta'], 'readwrite', tx => {
      const store = tx.objectStore('meta');
      store.put({ key, value });
    });
  }

  public async getMeta<T>(key: string): Promise<T | null> {
    if (!this.isSupported) return null;

    try {
      const db = await this.getDB();
      return new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction('meta', 'readonly');
        const store = tx.objectStore('meta');
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result ? req.result.value : null);
        };

        req.onerror = () => {
          reject(req.error);
        };
      });
    } catch (err) {
      return null;
    }
  }

  // ==========================================
  // OFFLINE QUEUE (Mutations made while disconnected)
  // ==========================================

  public async enqueueOfflineMutation(mutation: {
    type: OfflineQueueItem['type'];
    eventId?: string;
    payload: any;
  }): Promise<number> {
    if (!this.isSupported) return 0;

    const item: Omit<OfflineQueueItem, 'id'> = {
      timestamp: new Date().toISOString(),
      type: mutation.type,
      eventId: mutation.eventId,
      payload: mutation.payload,
      status: 'pending',
    };

    return new Promise<number>(async (resolve, reject) => {
      try {
        const db = await this.getDB();
        const tx = db.transaction('offline_queue', 'readwrite');
        const store = tx.objectStore('offline_queue');
        const req = store.add(item);

        req.onsuccess = () => {
          resolve(req.result as number);
        };

        req.onerror = () => {
          reject(req.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  public async getOfflineQueue(): Promise<OfflineQueueItem[]> {
    if (!this.isSupported) return [];

    try {
      const db = await this.getDB();
      return new Promise<OfflineQueueItem[]>((resolve, reject) => {
        const tx = db.transaction('offline_queue', 'readonly');
        const store = tx.objectStore('offline_queue');
        const req = store.getAll();

        req.onsuccess = () => {
          resolve(req.result || []);
        };

        req.onerror = () => {
          reject(req.error);
        };
      });
    } catch (err) {
      return [];
    }
  }

  public async removeOfflineQueueItem(id: number): Promise<void> {
    if (!this.isSupported) return;

    await this.executeTx(['offline_queue'], 'readwrite', tx => {
      const store = tx.objectStore('offline_queue');
      store.delete(id);
    });
  }

  public async clearOfflineQueue(): Promise<void> {
    if (!this.isSupported) return;

    await this.executeTx(['offline_queue'], 'readwrite', tx => {
      const store = tx.objectStore('offline_queue');
      store.clear();
    });
  }

  // ==========================================
  // SUMMARY & CLEAR
  // ==========================================

  public async getCacheSummary(): Promise<{
    count: number;
    lastSync: string | null;
    isSupported: boolean;
    queueCount: number;
    templatesCount: number;
    playbooksCount: number;
  }> {
    if (!this.isSupported) {
      return {
        count: 0,
        lastSync: null,
        isSupported: false,
        queueCount: 0,
        templatesCount: 0,
        playbooksCount: 0,
      };
    }

    try {
      const [events, templates, playbooks, queue, lastSync] = await Promise.all([
        this.getEvents(),
        this.getTemplates(),
        this.getPlaybooks(),
        this.getOfflineQueue(),
        this.getMeta<string>('last_sync_time'),
      ]);

      return {
        count: events.length,
        lastSync,
        isSupported: true,
        queueCount: queue.length,
        templatesCount: templates.length,
        playbooksCount: playbooks.length,
      };
    } catch (err) {
      return {
        count: 0,
        lastSync: null,
        isSupported: true,
        queueCount: 0,
        templatesCount: 0,
        playbooksCount: 0,
      };
    }
  }

  public async clearAllCache(): Promise<void> {
    if (!this.isSupported) return;

    await this.executeTx(
      ['events', 'templates', 'playbooks', 'meta', 'offline_queue'],
      'readwrite',
      tx => {
        tx.objectStore('events').clear();
        tx.objectStore('templates').clear();
        tx.objectStore('playbooks').clear();
        tx.objectStore('meta').clear();
        tx.objectStore('offline_queue').clear();
      }
    );
  }
}

export const indexedDbCache = new IndexedDbCacheService();
