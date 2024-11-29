import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import cron from "node-cron";
import fetch from "node-fetch";
import fs from "fs";
import path, { dirname } from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { format } from "date-fns";
dotenv.config();
const pipelinePromise = promisify(pipeline);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);
const bucketName = process.env.SUPABASE_BUCKET_NAME || "";
const s3 = new S3Client({
  region: process.env.AWS_REGION || "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});
const sendSlackNotification = async (message) => {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL || "";
    if (!webhookUrl) {
      throw new Error("SLACK_WEBHOOK_URL is not defined");
    }
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: message,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to send Slack notification: ${response.statusText}`,
      );
    }
    console.log("Slack notification sent successfully");
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error sending Slack notification: ${error.message}`);
    } else {
      console.error("Unknown error occurred while sending Slack notification");
    }
  }
};
const uploadToS3 = async (filePath, key) => {
  try {
    const fileStream = fs.createReadStream(filePath);
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME || "",
      Key: key,
      Body: fileStream,
    };
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);
    console.log(`File uploaded successfully to S3: ${key}`);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error uploading to S3: ${err.message}`);
    } else {
      console.error(`Unknown error uploading to S3`);
    }
  }
};
const listFilesRecursively = async (folder = "") => {
  try {
    const { data: filesAndFolders, error } = await supabase.storage
      .from(bucketName)
      .list(folder, { limit: 1000 });
    if (error) {
      console.error(
        `Error listing items in folder ${folder}: ${error.message}`,
      );
      throw error;
    }
    let files = [];
    for (const item of filesAndFolders || []) {
      if (item.name.endsWith("/")) {
        const subfolderFiles = await listFilesRecursively(
          `${folder}/${item.name}`.replace(/\/+$/, ""),
        );
        files = files.concat(subfolderFiles);
      } else {
        files.push({
          name: `${folder}/${item.name}`.replace(/\/+$/, ""),
        });
      }
    }
    return files;
  } catch (error) {
    console.error(
      `Error while listing files in folder ${folder}: ${error.message}`,
    );
    throw error;
  }
};
const ensureDirectoryExists = (directoryPath) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};
const downloadFilesFromSupabase = async () => {
  try {
    const bucketName = process.env.SUPABASE_BUCKET_NAME || "";
    console.log(`Using bucket: ${bucketName}`);
    const currentDate = format(new Date(), "yyyy-MM-dd");
    const backupFolderName = `${currentDate}-storage-backup`;
    const { data: folders, error: folderError } = await supabase.storage
      .from(bucketName)
      .list("", { limit: 100, offset: 0 });
    if (folderError)
      throw new Error(`Error listing folders: ${folderError.message}`);
    if (!folders || folders.length === 0) {
      throw new Error("No folders found in the bucket.");
    }
    console.log(`Found ${folders.length} folders in bucket ${bucketName}`);
    for (const folder of folders) {
      console.log(`Processing folder: ${folder.name}`);
      const files = await listFilesRecursively(folder.name);
      if (files && files.length > 0) {
        for (const file of files) {
          console.log(`Processing file: ${file.name}`);
          const { data: signedUrlData, error: signedUrlError } =
            await supabase.storage
              .from(bucketName)
              .createSignedUrl(file.name, 60);
          if (signedUrlError) {
            console.error(
              `Error creating signed URL for file ${file.name}: ${signedUrlError.message}`,
            );
            continue;
          }
          const signedUrl = signedUrlData?.signedUrl;
          if (!signedUrl) {
            console.error(`Signed URL not available for file: ${file.name}`);
            continue;
          }
          console.log(
            `Signed URL generated for file ${file.name}: ${signedUrl}`,
          );
          const downloadsDir = path.resolve(
            __dirname,
            `dist/${backupFolderName}`,
          );
          ensureDirectoryExists(downloadsDir);
          const filePath = path.join(downloadsDir, path.basename(file.name));
          const fileStream = fs.createWriteStream(filePath);
          const response = await fetch(signedUrl);
          if (!response.ok) {
            console.error(
              `Failed to fetch file: ${file.name}, Status: ${response.statusText}`,
            );
            continue;
          }
          const nodeStream = response.body;
          await pipelinePromise(nodeStream, fileStream);
          console.log(`Downloaded and saved ${file.name}`);
          const s3Key = `${backupFolderName}/${file.name}`;
          await uploadToS3(filePath, s3Key);
        }
      } else {
        console.log(`No files found in folder: ${folder.name}`);
      }
    }
    await sendSlackNotification(
      `Backup completed successfully. Folder: ${backupFolderName}`,
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error downloading files: ${error.message}`);
      await sendSlackNotification(`Backup failed. Error: ${error.message}`);
    } else {
      console.error("Unknown error occurred while downloading files");
      await sendSlackNotification(`Backup failed due to unknown error.`);
    }
  }
};
cron.schedule(`${process.env.CRON_BACKUP}`, () => {
  downloadFilesFromSupabase();
});
