import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables."
  );
}

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BUCKET_NAME = "resumes";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Sanitize file name for storage
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Upload a resume PDF file to Supabase Storage
 */
export async function uploadResume(
  userId: string,
  file: File,
  originalFileName: string
): Promise<UploadResult> {
  try {
    // Validate file type
    if (file.type !== "application/pdf") {
      return { success: false, error: "Only PDF files are allowed" };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds 5MB limit (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      };
    }

    // Create file path with timestamp to ensure uniqueness
    const timestamp = Date.now();
    const sanitized = sanitizeFileName(originalFileName.replace(/\.pdf$/i, ""));
    const fileName = `${timestamp}-${sanitized}.pdf`;
    const filePath = `${userId}/${fileName}`;

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return {
        success: false,
        error: "Failed to upload file to storage",
      };
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    if (!urlData.publicUrl) {
      return {
        success: false,
        error: "Failed to generate public URL for uploaded file",
      };
    }

    return {
      success: true,
      fileUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error("Resume upload error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during upload",
    };
  }
}

/**
 * Delete a resume file from Supabase Storage
 */
export async function deleteResume(fileUrl: string): Promise<DeleteResult> {
  try {
    // Extract file path from public URL
    // URL format: https://project.supabase.co/storage/v1/object/public/resumes/userid/filename.pdf
    const urlParts = fileUrl.split("/resumes/");
    if (urlParts.length !== 2) {
      return {
        success: false,
        error: "Invalid file URL format",
      };
    }

    const filePath = "resumes/" + urlParts[1];

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      return {
        success: false,
        error: "Failed to delete file from storage",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Resume delete error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during deletion",
    };
  }
}
