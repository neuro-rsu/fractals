import { defaultData } from './default-data.js';

import { openDB} from 'https://cdn.jsdelivr.net/npm/idb@7/+esm';

export let data;

let db;

async function createDB() {
    db = await openDB('fractals', 1, {
        upgrade(db) {
            let objectStore = db.createObjectStore("data");
            objectStore.add(defaultData, 1);
        }
    });
    data = await db.get("data", 1);
}

await createDB();

export async function saveData() {
    await db.put('data', data, 1);
}

export async function restoreData() {
    await db.put('data', defaultData, 1);
    data = await db.get("data", 1);
}