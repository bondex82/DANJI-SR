import { getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';

const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

if (!getApps().length) {
    initializeApp({
        projectId: firebaseConfig.projectId,
    });
}

async function run() {
    try {
        const bucket = getStorage().bucket(firebaseConfig.storageBucket);
        const blob = bucket.file(`test-upload.txt`);
        await blob.save('hello world', {
            metadata: { contentType: 'text/plain' }
        });
        console.log('Upload successful');
    } catch(err: any) {
        console.error('Failed:', err.message || err);
    }
}
run();
