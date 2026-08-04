import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
    //this means that the files will be saved in the public/temp folder
    //here cb means callback function i.e. it will be called when the file is saved
  },
  //this means that the file will be saved with the original name and the timestamp
  filename: function (req, file, cb) {
    cb(null, file.originalname + "-" + Date.now());
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max video
  },
});
