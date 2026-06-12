export const optimizeCloudinaryUrl = (url, width = 800) => {
  if (!url || typeof url !== 'string') return url;
  // If the image is hosted on Cloudinary, inject transformation parameters
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    return url.replace('/image/upload/', `/image/upload/w_${width},q_auto,f_auto/`);
  }
  return url;
};
