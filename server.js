const express = require("express");
const cors = require("cors");
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Parse MinIO URL from .env
const bucketUrl = new URL(process.env.BUCKET);
const s3Client = new S3Client({
  endpoint: `${bucketUrl.protocol}//${bucketUrl.hostname}:${
    bucketUrl.port || (bucketUrl.protocol === "https:" ? 443 : 80)
  }`,
  region: "us-east-1", // MinIO requires a region
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

const bucketName = bucketUrl.pathname.split("/")[1];

// API Routes
app.get("/api/dates", async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Delimiter: "/", // This gives us prefixes (folders) instead of individual files
    });

    const response = await s3Client.send(command);

    // Extract date folder names from CommonPrefixes
    const dateFolders = (response.CommonPrefixes || [])
      .map((prefix) => prefix.Prefix.replace("/", ""))
      .filter((folder) => folder); // Remove empty strings

    const sortedFolders = dateFolders.sort((a, b) => b.localeCompare(a));
    res.json(sortedFolders);
  } catch (error) {
    console.error("Error in /api/dates:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

app.get("/api/dates/:date/files", async (req, res) => {
  try {
    const date = req.params.date;

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `${date}/`,
    });

    const response = await s3Client.send(command);

    // Filter and format JSON files
    const objects = (response.Contents || [])
      .filter((obj) => obj.Key.endsWith(".json"))
      .map((obj) => ({
        name: obj.Key,
        displayName: obj.Key.split("/").pop(),
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag,
      }));

    const sortedObjects = objects.sort(
      (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
    );

    res.json(sortedObjects);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/files/:filename", async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: filename,
    });

    const response = await s3Client.send(command);
    const content = await response.Body.transformToString();

    // Parse and return JSON directly
    const jsonData = JSON.parse(content);
    res.json(jsonData);
  } catch (error) {
    console.error("Error:", error);
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: "Invalid JSON format" });
    } else {
      res
        .status(500)
        .json({ error: "File not found or internal server error" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`MinIO LiteLLM Viewer running on http://localhost:${PORT}`);
  console.log(`Connected to MinIO bucket: ${bucketName}`);
});
