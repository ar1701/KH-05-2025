const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});

const storage1 = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "WMS",
    allowedFormats: ["png", "jpeg", "jpg", "pdf"], // allowed file formats
  },
});

module.exports = {
  cloudinary, storage1,
};
