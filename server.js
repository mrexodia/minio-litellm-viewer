const express = require("express");
const cors = require("cors");
const { Client } = require("minio");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Parse MinIO URL from .env
const bucketUrl = new URL(process.env.BUCKET);
const minioClient = new Client({
  endPoint: bucketUrl.hostname,
  port:
    parseInt(bucketUrl.port) || (bucketUrl.protocol === "https:" ? 443 : 80),
  useSSL: bucketUrl.protocol === "https:",
  accessKey: process.env.ACCESS_KEY,
  secretKey: process.env.SECRET_KEY,
});

const bucketName = bucketUrl.pathname.split("/")[1];

// API Routes
app.get("/api/dates", async (req, res) => {
  try {
    console.log(`Listing available dates in bucket: ${bucketName}`);
    const dateFolders = new Set();
    const stream = minioClient.listObjects(bucketName, "", true);

    stream.on("data", (obj) => {
      console.log(`Found object: ${obj?.name || "undefined"}`);
      // Extract date folder names from object paths
      if (obj && obj.name && obj.name.includes("/")) {
        const dateFolder = obj.name.split("/")[0];
        console.log(`Adding date folder: ${dateFolder}`);
        dateFolders.add(dateFolder);
      }
    });

    stream.on("end", () => {
      console.log(
        `Found ${dateFolders.size} date folders:`,
        Array.from(dateFolders)
      );
      const sortedFolders = Array.from(dateFolders).sort((a, b) =>
        b.localeCompare(a)
      );
      res.json(sortedFolders);
    });

    stream.on("error", (err) => {
      console.error("Error listing date folders:", err);
      res
        .status(500)
        .json({ error: "Failed to list date folders", details: err.message });
    });
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
    const objects = [];
    const stream = minioClient.listObjects(bucketName, date + "/", false);

    stream.on("data", (obj) => {
      // Only include JSON files
      if (obj && obj.name && obj.name.endsWith(".json")) {
        objects.push({
          name: obj.name,
          displayName: obj.name.split("/").pop(),
          size: obj.size,
          lastModified: obj.lastModified,
          etag: obj.etag,
        });
      }
    });

    stream.on("end", () => {
      res.json(
        objects.sort(
          (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
        )
      );
    });

    stream.on("error", (err) => {
      console.error("Error listing files:", err);
      res.status(500).json({ error: "Failed to list files" });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/files/:filename", async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const stream = await minioClient.getObject(bucketName, filename);

    let content = "";
    stream.on("data", (chunk) => {
      content += chunk.toString();
    });

    stream.on("end", () => {
      res.json({ content, filename });
    });

    stream.on("error", (err) => {
      console.error("Error reading file:", err);
      res.status(500).json({ error: "Failed to read file" });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "File not found or internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`MinIO LiteLLM Viewer running on http://localhost:${PORT}`);
  console.log(`Connected to MinIO bucket: ${bucketName}`);
});
