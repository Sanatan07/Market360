const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async (file) => {
  try {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { 
          folder: 'products',
          resource_type: 'auto', // Changed to auto for better file type handling
          allowed_formats: ['jpg', 'png', 'jpeg', 'gif'], // Specify allowed formats
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          }
          resolve({ 
            url: result.secure_url, 
            public_id: result.public_id,
            width: result.width,
            height: result.height
          });
        }
      );

      file.stream.pipe(upload);
    });
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
};

module.exports = { uploadImage };