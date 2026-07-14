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
        const bucketName = firebaseConfig.projectId + '.appspot.com';
        console.log('Trying bucket:', bucketName);
        const bucket = getStorage().bucket(bucketName);
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
