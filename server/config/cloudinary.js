import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const hasCloudName = !!process.env.CLOUDINARY_CLOUD_NAME;
const hasApiKey = !!process.env.CLOUDINARY_API_KEY;
const hasApiSecret = !!process.env.CLOUDINARY_API_SECRET;

if (hasCloudName && hasApiKey && hasApiSecret) {
    console.log('[DEBUG - SERVER] ✓ Cloudinary Config Loaded');
} else {
    console.log('[DEBUG - SERVER] ✗ Cloudinary Config Missing');
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudinary;
