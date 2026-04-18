import { supabase } from '../supabase';
import type { DeliveryVerification, DeliveryVerificationInsert, WorkSubmission } from '../supabase';
import type { Milestone } from '../openai';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

/**
 * In-memory cache for verification results
 * Maps submission ID to verification result
 */
const verificationCache = new Map<string, DeliveryVerification>();

/**
 * Build the verification prompt for AI analysis
 * Constructs a structured prompt that includes milestone requirements and work submission
 * 
 * @param milestone - The milestone with requirements to verify against
 * @param submission - The work submission to analyze
 * @returns Formatted prompt string for OpenAI API
 */
export function buildVerificationPrompt(
  milestone: Milestone,
  submission: WorkSubmission
): string {
  return `You are an expert freelance project evaluator analyzing work deliverables.

MILESTONE REQUIREMENTS:
Name: ${milestone.name}
Description: ${milestone.description}
Acceptance Criteria: ${milestone.description}

FREELANCER SUBMISSION:
Description: ${submission.description}
${submission.urls.length > 0 ? `URLs Provided: ${submission.urls.join(', ')}` : 'No URLs provided'}

EVALUATION TASK:
Analyze if the submission adequately demonstrates completion of the milestone requirements.

EVALUATION CRITERIA:
1. Completeness: Does the submission address all aspects of the milestone?
2. Relevance: Is the submitted work directly related to the milestone requirements?
3. Quality: Does the submission demonstrate professional-quality work?
4. Evidence: Are the provided URLs and description sufficient proof of completion?

Return ONLY valid JSON in this exact format:
{
  "score": 0-100,
  "recommendation": "approve" | "request_changes" | "reject",
  "feedback": "2-3 sentence explanation of the score",
  "gaps": ["specific missing element 1", "specific missing element 2"]
}

SCORING GUIDELINES:
- 80-100: Excellent - clearly meets all requirements
- 50-79: Partial - meets some requirements but has gaps
- 0-49: Insufficient - does not adequately demonstrate completion

RECOMMENDATION GUIDELINES:
- "approve": score >= 80, work clearly meets requirements
- "request_changes": score 50-79, work is partially complete
- "reject": score < 50, work does not meet requirements

Note: Only include "gaps" array if score < 80. Each gap should be specific and actionable.`;
}

/**
 * Validate the structure and content of an AI verification response
 * Ensures all required fields are present and values are within valid ranges
 * 
 * @param response - The parsed JSON response from OpenAI
 * @throws Error if response structure is invalid
 */
export function validateVerificationResponse(response: unknown): void {
  // Type guard to check if response is an object
  if (typeof response !== 'object' || response === null) {
    throw new Error('Invalid verification response: not an object');
  }

  const resp = response as Record<string, unknown>;

  // Validate score
  if (typeof resp.score !== 'number' || resp.score < 0 || resp.score > 100) {
    throw new Error('Invalid score in verification response');
  }
  
  // Validate recommendation
  if (!['approve', 'request_changes', 'reject'].includes(resp.recommendation as string)) {
    throw new Error('Invalid recommendation in verification response');
  }
  
  // Validate feedback
  if (typeof resp.feedback !== 'string' || resp.feedback.length === 0) {
    throw new Error('Invalid feedback in verification response');
  }
  
  // Validate score-recommendation consistency
  if (resp.score >= 80 && resp.recommendation !== 'approve') {
    console.warn('Score-recommendation mismatch: high score but not approved');
  }
  if (resp.score < 50 && resp.recommendation !== 'reject') {
    console.warn('Score-recommendation mismatch: low score but not rejected');
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
 * Verify a work submission against milestone requirements using OpenAI
 * Calls OpenAI API with 10-second timeout, validates response, and stores result
 * 
 * @param submission - The work submission to verify
 * @param milestone - The milestone requirements to verify against
 * @returns The created delivery verification record
 * @throws Error if API key is missing, API call fails, or validation fails
 */
export async function verifyWorkSubmission(
  submission: WorkSubmission,
  milestone: Milestone
): Promise<DeliveryVerification> {
  // Handle missing API key
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_OPENAI_API_KEY_HERE") {
    throw new Error('OpenAI API key not configured');
  }
  
  const prompt = buildVerificationPrompt(milestone, submission);
  
  try {
    // Create AbortController for 10-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const text = data.choices[0].message.content
      .replace(/```json|```/g, "")
      .trim();
    
    const parsed = JSON.parse(text);
    
    // Validate response structure
    validateVerificationResponse(parsed);
    
    // Prepare insert data
    const insertData: DeliveryVerificationInsert = {
      submission_id: submission.id,
      score: parsed.score,
      recommendation: parsed.recommendation,
      feedback: parsed.feedback,
      gaps: parsed.gaps || null,
      raw_response: data,
    };
    
    // Store in database with retry logic
    const verification = await retryWithBackoff(async () => {
      const { data: verificationData, error } = await supabase
        .from('delivery_verifications')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('Insert delivery verification error:', error);
        throw new Error(`Failed to store verification: ${error.message}`);
      }
      
      if (!verificationData) {
        throw new Error('Insert delivery verification returned no data');
      }
      
      return verificationData;
    });
    
    // Cache the result
    verificationCache.set(submission.id, verification);
    
    console.log('Verification created:', verification.id);
    return verification;
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Verification timeout: OpenAI API took longer than 10 seconds');
    }
    
    console.error('Verification error:', error);
    throw error;
  }
}

/**
 * Fetch verification result for a submission from database
 * Includes retry logic with exponential backoff
 * 
 * @param submissionId - UUID of the work submission
 * @returns The delivery verification record, or null if not found
 * @throws Error if fetch fails after all retries
 */
export async function fetchVerification(
  submissionId: string
): Promise<DeliveryVerification | null> {
  return retryWithBackoff(async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_verifications')
        .select('*')
        .eq('submission_id', submissionId)
        .single();
      
      if (error) {
        // Handle "not found" as null return, not an error
        if (error.code === 'PGRST116') {
          console.log('Verification not found for submission:', submissionId);
          return null;
        }
        
        console.error('Fetch verification error:', error);
        throw new Error(`Failed to fetch verification: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Fetch verification error:', error);
      throw error;
    }
  });
}

/**
 * Fetch verification with in-memory caching
 * Returns cached result if available, otherwise fetches from database
 * 
 * @param submissionId - UUID of the work submission
 * @returns The delivery verification record, or null if not found
 * @throws Error if fetch fails after all retries
 */
export async function fetchVerificationCached(
  submissionId: string
): Promise<DeliveryVerification | null> {
  // Check if result is in cache
  if (verificationCache.has(submissionId)) {
    console.log('Verification cache hit for submission:', submissionId);
    return verificationCache.get(submissionId)!;
  }
  
  console.log('Verification cache miss, fetching from database');
  
  // Fetch from database
  const verification = await fetchVerification(submissionId);
  
  // Cache result if found
  if (verification) {
    verificationCache.set(submissionId, verification);
  }
  
  return verification;
}

/**
 * Clear the verification cache
 * Useful for testing or when cache becomes too large
 */
export function clearVerificationCache(): void {
  console.log('Clearing verification cache');
  verificationCache.clear();
}
