import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '..', '.env.local');

console.log('📝 Cloudinary Environment Variables Setup\n');

// Check if .env.local exists
if (!existsSync(envPath)) {
  console.log('⚠️  .env.local file not found. Creating it...');
  writeFileSync(envPath, '');
}

// Read current content
let content = '';
try {
  content = readFileSync(envPath, 'utf-8');
} catch (error) {
  console.log('Creating new .env.local file...');
  content = '';
}

// Check if Cloudinary vars already exist
const hasCloudinary = content.includes('CLOUDINARY_CLOUD_NAME') || content.includes('VITE_CLOUDINARY_CLOUD_NAME');

if (hasCloudinary) {
  console.log('✅ Cloudinary variables already exist in .env.local');
  console.log('\nCurrent Cloudinary variables:');
  content.split('\n').forEach(line => {
    if (line.includes('CLOUDINARY')) {
      const [key] = line.split('=');
      if (key && key.trim()) {
        console.log(`  - ${key.trim()}`);
      }
    }
  });
  console.log('\n💡 If uploads still fail, make sure the values are set (not empty)');
  console.log('   Example: VITE_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name');
} else {
  console.log('📋 Add these lines to your .env.local file:');
  console.log('\n# Cloudinary Configuration');
  console.log('VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('VITE_CLOUDINARY_API_KEY=your_api_key');
  console.log('VITE_CLOUDINARY_API_SECRET=your_api_secret');
  console.log('\n💡 Get your credentials from: https://cloudinary.com/console');
  console.log('💡 Replace the placeholder values with your actual credentials');
  console.log('💡 After adding, restart the server with: npm run dev');
}


















