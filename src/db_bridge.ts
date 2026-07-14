import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where as firestoreWhere,
  limit as firestoreLimit,
  writeBatch,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load Firebase applet configuration
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let config: any = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
  console.error('CRITICAL: firebase-applet-config.json is missing in db_bridge!');
}

const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: `${config.projectId}.firebaseapp.com`,
  projectId: config.projectId,
});

// Use the working metadata ID to bypass any permission errors
export const clientDb = getFirestore(app, config.firestoreDatabaseId || 'ai-studio-b168ead2-e0d1-43f8-800f-ca5efbc814a8');

export class DocumentSnapshot {
  constructor(private idVal: string, private dataVal: any, private existsVal: boolean) {}

  get id() {
    return this.idVal;
  }

  get exists() {
    return this.existsVal;
  }

  data() {
    return this.dataVal || null;
  }
}

export class QueryDocumentSnapshot extends DocumentSnapshot {}

export class QuerySnapshot {
  constructor(private docsList: QueryDocumentSnapshot[]) {}

  get size() {
    return this.docsList.length;
  }

  get empty() {
    return this.docsList.length === 0;
  }

  get docs() {
    return this.docsList;
  }
}

export class DocumentReference {
  constructor(public collectionPath: string, public idVal: string) {}

  get id() {
    return this.idVal;
  }

  async get() {
    try {
      const docRef = doc(clientDb, this.collectionPath, this.idVal);
      const snap = await getDoc(docRef);
      return new DocumentSnapshot(this.idVal, snap.data(), snap.exists());
    } catch (err: any) {
      console.error(`Error fetching document ${this.collectionPath}/${this.idVal}:`, err.message);
      throw err;
    }
  }

  async set(data: any) {
    try {
      const docRef = doc(clientDb, this.collectionPath, this.idVal);
      await setDoc(docRef, data);
    } catch (err: any) {
      console.error(`Error setting document ${this.collectionPath}/${this.idVal}:`, err.message);
      throw err;
    }
  }

  async update(data: any) {
    try {
      const docRef = doc(clientDb, this.collectionPath, this.idVal);
      await updateDoc(docRef, data);
    } catch (err: any) {
      console.error(`Error updating document ${this.collectionPath}/${this.idVal}:`, err.message);
      throw err;
    }
  }

  async delete() {
    try {
      const docRef = doc(clientDb, this.collectionPath, this.idVal);
      await deleteDoc(docRef);
    } catch (err: any) {
      console.error(`Error deleting document ${this.collectionPath}/${this.idVal}:`, err.message);
      throw err;
    }
  }
}

export class Query {
  constructor(
    protected collectionPath: string,
    protected filters: Array<{ field: string, op: any, value: any }> = [],
    protected limitVal?: number
  ) {}

  where(field: string, op: any, value: any) {
    return new Query(
      this.collectionPath,
      [...this.filters, { field, op, value }],
      this.limitVal
    );
  }

  limit(n: number) {
    return new Query(this.collectionPath, this.filters, n);
  }

  async get() {
    try {
      const collRef = collection(clientDb, this.collectionPath);
      
      const queryConstraints: any[] = [];
      for (const filter of this.filters) {
        queryConstraints.push(firestoreWhere(filter.field, filter.op, filter.value));
      }

      if (this.limitVal !== undefined) {
        queryConstraints.push(firestoreLimit(this.limitVal));
      }

      const finalQuery = query(collRef, ...queryConstraints);
      const snap = await getDocs(finalQuery);

      const docs = snap.docs.map(d => {
        return new QueryDocumentSnapshot(d.id, d.data(), true);
      });

      return new QuerySnapshot(docs);
    } catch (err: any) {
      console.error(`Error querying collection ${this.collectionPath}:`, err.message);
      throw err;
    }
  }
}

export class CollectionReference extends Query {
  constructor(public collectionPath: string) {
    super(collectionPath);
  }

  doc(id?: string) {
    const actualId = id || Math.random().toString(36).substring(2, 15);
    return new DocumentReference(this.collectionPath, actualId);
  }

  async add(data: any) {
    try {
      const collRef = collection(clientDb, this.collectionPath);
      const res = await addDoc(collRef, data);
      return new DocumentReference(this.collectionPath, res.id);
    } catch (err: any) {
      console.error(`Error adding to collection ${this.collectionPath}:`, err.message);
      throw err;
    }
  }
}

export class WriteBatch {
  private batchInstance = writeBatch(clientDb);

  set(docRef: DocumentReference, data: any) {
    const clientRef = doc(clientDb, docRef.collectionPath, docRef.idVal);
    this.batchInstance.set(clientRef, data);
  }

  async commit() {
    try {
      await this.batchInstance.commit();
    } catch (err: any) {
      console.error('Error committing write batch:', err.message);
      throw err;
    }
  }
}

export class RealClientFirestore {
  collection(path: string) {
    return new CollectionReference(path);
  }

  batch() {
    return new WriteBatch();
  }
}

export const db = new RealClientFirestore();
export default db;
