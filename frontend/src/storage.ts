import { supabase } from './supabase';

const BUCKET_NAME = 'work-submissions';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Initialize or ensure the storage bucket exists
 * This is called on app startup
 */
export async function ensureStorageBucket(): Promise<void> {
  try {
    // Check if bucket exists by listing
    await supabase.storage.from(BUCKET_NAME).list('', { limit: 1 });
  } catch (error) {
    console.warn('Storage bucket may not exist, will create on first upload', error);
  }
}

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file to upload
 * @param escrowId - The escrow ID
 * @param submissionId - The work submission ID
 * @param index - The image index (0-based)
 * @returns The public URL of the uploaded image
 */
export async function uploadImage(
  file: File,
  escrowId: string,
  submissionId: string,
  index: number
): Promise<string> {
  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  // Create unique path with hierarchical organization
  const timestamp = Date.now();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `escrows/${escrowId}/submissions/${submissionId}/image_${index}_${timestamp}.${ext}`;

  try {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
}

/**
 * Delete an image from Supabase Storage
 * @param imageUrl - The public URL of the image to delete
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract path from public URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const path = pathParts.slice(pathParts.indexOf(BUCKET_NAME) + 1).join('/');

    await supabase.storage.from(BUCKET_NAME).remove([path]);
  } catch (error) {
    console.error('Image deletion error:', error);
    throw error;
  }
}

/**
 * Delete multiple images from Supabase Storage
 * @param imageUrls - Array of public URLs to delete
 */
export async function deleteImages(imageUrls: string[]): Promise<void> {
  const deletionPromises = imageUrls.map((url) => deleteImage(url).catch(() => {}));
  await Promise.all(deletionPromises);
}
