import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root (parent of scripts directory)
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
// Also try .env as fallback
dotenv.config({ path: resolve(__dirname, '..', '.env') });

console.log('🔍 Checking Cloudinary Configuration...\n');

// Check both prefixed and non-prefixed variants
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;

if (!cloudName) {
  console.error('❌ CLOUDINARY_CLOUD_NAME is not set');
} else {
  console.log('✅ CLOUDINARY_CLOUD_NAME:', cloudName);
}

if (!apiKey) {
  console.error('❌ CLOUDINARY_API_KEY is not set');
} else {
  console.log('✅ CLOUDINARY_API_KEY:', apiKey.substring(0, 8) + '...');
}

if (!apiSecret) {
  console.error('❌ CLOUDINARY_API_SECRET is not set');
} else {
  console.log('✅ CLOUDINARY_API_SECRET:', apiSecret.substring(0, 8) + '...');
}

if (cloudName && apiKey && apiSecret) {
  console.log('\n✅ All Cloudinary credentials are configured!');
  console.log('   Make sure your .env.local file is in the project root and the server is restarted after adding credentials.');
} else {
  console.log('\n❌ Cloudinary is not fully configured.');
  console.log('\n📝 To fix this:');
  console.log('   1. Create or edit .env.local in the project root');
  console.log('   2. Add the following lines:');
  console.log('      CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('      CLOUDINARY_API_KEY=your_api_key');
  console.log('      CLOUDINARY_API_SECRET=your_api_secret');
  console.log('   3. Get your credentials from: https://cloudinary.com/console');
  console.log('   4. Restart your server after adding credentials');
}

