import { supabase } from '../supabase';
import type { WorkSubmission, WorkSubmissionInsert } from '../supabase';

/**
 * Validation error class for submission input validation
 */
export class SubmissionValidationError extends Error {
  field: string;
  
  constructor(
    message: string,
    field: string
  ) {
    super(message);
    this.name = 'SubmissionValidationError';
    this.field = field;
  }
}

/**
 * Validate description length
 * @param description - The description text to validate
 * @throws SubmissionValidationError if description is invalid
 */
function validateDescription(description: string): void {
  if (!description || description.trim().length === 0) {
    throw new SubmissionValidationError(
      'Description is required',
      'description'
    );
  }
  
  if (description.length > 2000) {
    throw new SubmissionValidationError(
      'Description must be 2000 characters or less',
      'description'
    );
  }
}

/**
 * Validate URL format
 * @param url - The URL string to validate
 * @returns true if URL is valid, false otherwise
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate URLs array
 * @param urls - Array of URL strings to validate
 * @throws SubmissionValidationError if URLs are invalid
 */
function validateUrls(urls: string[]): void {
  if (urls.length > 5) {
    throw new SubmissionValidationError(
      'Maximum 5 URLs allowed',
      'urls'
    );
  }
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (!url || url.trim().length === 0) {
      throw new SubmissionValidationError(
        `URL ${i + 1} is empty`,
        'urls'
      );
    }
    
    if (!isValidUrl(url)) {
      throw new SubmissionValidationError(
        `URL ${i + 1} is not a valid HTTP/HTTPS URL: ${url}`,
        'urls'
      );
    }
  }
}

/**
 * Retry a database operation with exponential backoff
 * Reuses the pattern from supabase.ts for consistency
 * 
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Result of the function
 * @throws Error if all retries are exhausted
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // If this is the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Calculate exponential backoff delay: baseDelay * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw new Error('Max retries exceeded');
};

/**
 * Submit work evidence for a milestone
 * Includes input validation and retry logic with exponential backoff
 * 
 * @param params - Submission parameters
 * @param params.escrowId - UUID of the escrow contract
 * @param params.milestoneIndex - Zero-based index of the milestone
 * @param params.submitterAddress - Stellar public key of the submitter
 * @param params.description - Text description of completed work (max 2000 characters)
 * @param params.urls - Array of URLs providing evidence (max 5 URLs)
 * @returns The created work submission record
 * @throws SubmissionValidationError if input validation fails
 * @throws Error if database insert fails after all retries
 */
export async function submitWork(params: {
  escrowId: string;
  milestoneIndex: number;
  submitterAddress: string;
  description: string;
  urls: string[];
  images?: string[];
}): Promise<WorkSubmission> {
  const { escrowId, milestoneIndex, submitterAddress, description, urls, images = [] } = params;
  
  // Input validation
  validateDescription(description);
  validateUrls(urls);
  
  // Validate milestone index
  if (milestoneIndex < 0) {
    throw new SubmissionValidationError(
      'Milestone index must be non-negative',
      'milestoneIndex'
    );
  }
  
  // Validate submitter address (basic check for Stellar public key format)
  if (!submitterAddress || submitterAddress.length !== 56 || !submitterAddress.startsWith('G')) {
    throw new SubmissionValidationError(
      'Invalid Stellar public key format',
      'submitterAddress'
    );
  }
  
  // Prepare insert data
  const insertData: WorkSubmissionInsert = {
    escrow_id: escrowId,
    milestone_index: milestoneIndex,
    submitter_address: submitterAddress,
    description: description.trim(),
    urls: urls.map(url => url.trim()),
    images: images && images.length > 0 ? images : [],
  };
  
  // Insert with retry logic
  return retryWithBackoff(async () => {
    try {
      const { data, error } = await supabase
        .from('work_submissions')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('Insert work submission error:', error);
        throw new Error(`Failed to submit work: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('Insert work submission returned no data');
      }
      
      console.log('Work submission created:', data.id);
      return data;
    } catch (error) {
      console.error('Submit work error:', error);
      throw error;
    }
  });
}

/**
 * Fetch all submissions for a specific milestone
 * Includes retry logic with exponential backoff
 * Returns submissions ordered by creation date (newest first)
 * 
 * @param escrowId - UUID of the escrow contract
 * @param milestoneIndex - Zero-based index of the milestone
 * @returns Array of work submissions ordered by creation date (newest first)
 * @throws Error if fetch fails after all retries
 */
export async function fetchMilestoneSubmissions(
  escrowId: string,
  milestoneIndex: number
): Promise<WorkSubmission[]> {
  return retryWithBackoff(async () => {
    try {
      const { data, error } = await supabase
        .from('work_submissions')
        .select('*')
        .eq('escrow_id', escrowId)
        .eq('milestone_index', milestoneIndex)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Fetch milestone submissions error:', error);
        throw new Error(`Failed to fetch submissions: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Fetch milestone submissions error:', error);
      throw error;
    }
  });
}

/**
 * Fetch a single submission by ID
 * Includes retry logic with exponential backoff
 * 
 * @param submissionId - UUID of the work submission
 * @returns The work submission record, or null if not found
 * @throws Error if fetch fails after all retries
 */
export async function fetchSubmissionById(
  submissionId: string
): Promise<WorkSubmission | null> {
  return retryWithBackoff(async () => {
    try {
      const { data, error } = await supabase
        .from('work_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();
      
      if (error) {
        // Handle "not found" as null return, not an error
        if (error.code === 'PGRST116') {
          console.log('Submission not found:', submissionId);
          return null;
        }
        
        console.error('Fetch submission by ID error:', error);
        throw new Error(`Failed to fetch submission: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Fetch submission by ID error:', error);
      throw error;
    }
  });
}
