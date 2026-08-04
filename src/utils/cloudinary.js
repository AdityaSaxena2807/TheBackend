import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return "no file path provided";
    //upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file uploaded successfully, now delete the file from local storage
    fs.unlinkSync(localFilePath);
    // console.log("File uploaded successfully on Cloudinary: ", response.url);
    //console.log(response) this was used to check cloudinary response in order to extract video duration
    return {
      url: response.secure_url,
      public_id: response.public_id,
      duration: response.duration,
    };
  } catch (error) {
    fs.unlinkSync(localFilePath); //delete the locally saved temporary file from local storage
    //as thee upload got failed
    console.error("Error uploading to Cloudinary:", error);
  }
};
const deleteOnCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) {
      console.warn("No publicId provided");
      return null;
    }

    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return null;
  }
};
export { uploadOnCloudinary, deleteOnCloudinary };
