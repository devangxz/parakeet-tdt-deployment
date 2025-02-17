import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface EditorDB extends DBSchema {
  editorData: {
    key: string;
    value: Record<string, unknown>;
  };
}

let dbPromise: Promise<IDBPDatabase<EditorDB>>;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<EditorDB>('editor-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('editorData')) {
          db.createObjectStore('editorData');
        }
      },
    });
  }
  return dbPromise;
}

export async function getEditorDataIDB(fileId: string): Promise<Record<string, unknown> | undefined> {
  const db = await getDB();
  return db.get('editorData', fileId);
}

export async function persistEditorDataIDB(fileId: string, data: Record<string, unknown>): Promise<void> {
  const db = await getDB();
  const existingData = (await db.get('editorData', fileId)) || {};
  const newData = {
    ...existingData,
    ...data,
    updatedAt: Date.now(),
  };
  await db.put('editorData', newData, fileId);
}

export async function deleteEditorDataIDB(fileId: string): Promise<void> {
  const db = await getDB();
  await db.delete('editorData', fileId);
} 