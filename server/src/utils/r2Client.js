const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const path = require("path");

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} = process.env;

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function uploadBuffer(buffer, mimeType, folder, originalName = "") {
  const ext = path.extname(originalName);
  const key = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
  return key;
}

function getPublicUrl(key) {
  if (!key) return null;
  return `${R2_PUBLIC_URL}/${key}`;
}

async function getPresignedUrl(key, expiresInSeconds = 3600) {
  if (!key) return null;
  const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

module.exports = { uploadBuffer, getPublicUrl, getPresignedUrl };
