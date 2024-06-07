const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");
const File = require("./models/file-model");
const fs = require("fs");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

mongoose
  .connect("mongodb://localhost/fileUploadDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

app.use((req, res, next) => {
  const contentLength = Number(req.headers["content-length"]);
  if (contentLength > 1000000) {
    return res.status(400).send({
      message: "file size is too big!",
    });
  }
  next();
});

app.use(
  fileUpload({
    limits: {
      fileSize: 1000000,
    },
    abortOnLimit: true,
    createParentPath: true,
  })
);

app.get("/files", async (req, res) => {
  try {
    const file = await File.find();
    res.json(file);
  } catch (error) {
    res.status(500).send("Error retrieving files from database");
  }
});

app.post("/upload", async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send("No files were uploaded.");
  }

  const uploadedFiles = Array.isArray(req.files.file)
    ? req.files.file
    : [req.files.file];
  const allowedMimeTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
  ];

  const errors = [];
  const savedFiles = [];

  for (const uploadedFile of uploadedFiles) {
    if (!allowedMimeTypes.includes(uploadedFile.mimetype)) {
      errors.push({
        filename: uploadedFile.name,
        message: "Only image files (png, jpg, jpeg, gif) are allowed.",
      });
      continue;
    }

    try {
      const existingFile = await File.findOne({ filename: uploadedFile.name });

      if (existingFile) {
        errors.push({
          filename: uploadedFile.name,
          message: "File already exists.",
        });
        continue;
      }

      const uploadPath = __dirname + "/uploads/" + uploadedFile.name;

      await new Promise((resolve, reject) => {
        uploadedFile.mv(uploadPath, async (err) => {
          if (err) {
            return reject(err);
          }

          const newFile = new File({
            fieldname: uploadedFile.name,
            originalname: uploadedFile.name,
            encoding: uploadedFile.encoding,
            mimetype: uploadedFile.mimetype,
            filename: uploadedFile.name,
            path: uploadPath,
            size: uploadedFile.size,
          });

          try {
            const savedFile = await newFile.save();
            savedFiles.push(savedFile);
            resolve();
          } catch (saveError) {
            reject(saveError);
          }
        });
      });
    } catch (checkError) {
      errors.push({ filename: uploadedFile.name, message: checkError.message });
    }
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json({ message: "Some files failed to upload", errors });
  }

  res.json({
    message: "Files uploaded and saved in database!",
    files: savedFiles,
  });
});

app.delete("/files/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).send("File not found");
    }

    const filePath = file.path;

    fs.unlink(filePath, async (err) => {
      if (err) {
        return res.status(500).send("Error deleting file from the file system");
      }

      await File.findByIdAndDelete(req.params.id);
      res.send("File deleted");
    });
  } catch (error) {
    res.status(500).send("Error deleting file from database");
  }
});

app.get("/files/download/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).send("File not found");
    }

    res.download(file.path, file.originalname, (err) => {
      if (err) {
        return res.status(500).send("Error downloading file");
      }
    });
  } catch (error) {
    res.status(500).send("Error retrieving file from database");
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
