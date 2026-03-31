// src/FileUpload.js
// Handles file uploads to Firebase Storage with progress tracking
import { storage, auth } from "./firebase";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

// ── Allowed file types ────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ── Upload file to Firebase Storage ──────────────────────────────────────────
export function uploadToFirebase(file, onProgress) {
  return new Promise((resolve, reject) => {
    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      reject(new Error("Only PDF, DOC, and DOCX files are supported."));
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      reject(new Error(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`));
      return;
    }

    // Require auth for Firebase Storage
    const user = auth.currentUser;
    if (!user) {
      reject(new Error("Please sign in to upload files."));
      return;
    }

    // Build a unique storage path under the user's UID
    const ext       = file.name.split(".").pop();
    const timestamp = Date.now();
    const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path      = `uploads/${user.uid}/${timestamp}_${safeName}`;
    const storageRef = ref(storage, path);

    // Start upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedBy:   user.uid,
        uploadedAt:   new Date().toISOString(),
      },
    });

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(pct, snapshot.state);
      },
      (error) => {
        console.error("Upload error:", error);
        switch (error.code) {
          case "storage/unauthorized":
            reject(new Error("Permission denied. Please sign in again."));
            break;
          case "storage/quota-exceeded":
            reject(new Error("Storage quota exceeded."));
            break;
          case "storage/canceled":
            reject(new Error("Upload was cancelled."));
            break;
          default:
            reject(new Error(`Upload failed: ${error.message}`));
        }
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url, path, name: file.name, size: file.size });
        } catch(e) {
          reject(new Error("Failed to get download URL."));
        }
      }
    );
  });
}

// ── Delete file from Firebase Storage ────────────────────────────────────────
export async function deleteFromFirebase(path) {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch(e) {
    console.error("Delete error:", e);
  }
}

// ── Format file size for display ──────────────────────────────────────────────
export function formatSize(bytes) {
  if (bytes < 1024)        return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}