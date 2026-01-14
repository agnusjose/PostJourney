import multer from "multer";
import fs from "fs";

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const { providerId } = req.body;
    const dir = `uploads/equipment/${providerId}`;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

export const uploadEquipmentImage = multer({ storage });