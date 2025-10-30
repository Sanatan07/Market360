// // services/cloudinary.js
// const cloudinary = require('cloudinary').v2;
// const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const uploadImage = async (file) => {
//   return new Promise((resolve, reject) => {
//     const upload = cloudinary.uploader.upload_stream(
//       { folder: 'products', resource_type: 'image' },
//       (error, result) => {
//         if (error) reject(error);
//         resolve({ url: result.secure_url, public_id: result.public_id });
//       }
//     );

//     file.stream.pipe(upload);
//   });
// };

// module.exports = { uploadImage };



// const cloudinary = require('cloudinary').v2;
// const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: CLOUDINARY_CLOUD_NAME,
//   api_key: CLOUDINARY_API_KEY,
//   api_secret: CLOUDINARY_API_SECRET,
// });

// // Function to upload an image to Cloudinary
// const uploadImage = async (file) => {
//   try {
//     const result = await cloudinary.uploader.upload_stream(
//       { resource_type: 'auto' },  // Automatically detect file type (e.g., jpeg, png)
//       (error, result) => {
//         if (error) {
//           throw new Error('Error uploading image to Cloudinary');
//         }
//         return result;
//       }
//     );
    
//     // Convert file buffer to stream
//     const streamifier = require('streamifier');
//     streamifier.createReadStream(file.buffer).pipe(result);
    
//     return {
//       url: result.secure_url,  // Cloudinary URL
//       public_id: result.public_id  // Cloudinary public_id
//     };
//   } catch (error) {
//     console.error('Error uploading image:', error);
//     throw new Error('Failed to upload image to Cloudinary');
//   }
// };

// module.exports = { uploadImage };

const cloudinary = require('cloudinary').v2;
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// Function to upload an image to Cloudinary
const uploadImage = async (file) => {
  return new Promise((resolve, reject) => {
    // Upload the image to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto' },  // Automatically detect file type (e.g., jpeg, png)
      (error, result) => {
        if (error) {
          console.error('Error uploading image to Cloudinary:', error);
          reject(new Error('Error uploading image to Cloudinary'));
        } else {
          resolve({
            url: result.secure_url,         // Cloudinary URL
            public_id: result.public_id,    // Cloudinary public_id
          });
        }
      }
    );

    // Convert the file buffer into a stream and pipe it to Cloudinary
    const streamifier = require('streamifier');
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

module.exports = { uploadImage };
