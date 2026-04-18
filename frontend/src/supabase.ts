import { createClient } from '@supabase/supabase-js';

// Milestone interface
export interface Milestone {
  name: string;
  description: string;
  percentage: number;
  xlm: number;
}

// Verification result interface
export interface VerificationResult {
  status: 'matching' | 'partial' | 'not_matching' | 'error';
  confidence: number;
  feedback: string;
  gaps?: string[];
}

// Work Submission interfaces
export interface WorkSubmission {
  id: string;
  created_at: string;
  escrow_id: string;
  milestone_index: number;
  submitter_address: string;
  description: string;
  urls: string[];
  images?: string[];
  client_decision: 'accepted' | 'rejected' | null;
}

export interface WorkSubmissionInsert {
  escrow_id: string;
  milestone_index: number;
  submitter_address: string;
  description: string;
  urls: string[];
  images?: string[];
}

// Delivery Verification interfaces
export interface DeliveryVerification {
  id: string;
  created_at: string;
  submission_id: string;
  score: number;
  recommendation: 'approve' | 'request_changes' | 'reject';
  feedback: string;
  gaps: string[] | null;
  raw_response: Record<string, unknown>;
}

export interface DeliveryVerificationInsert {
  submission_id: string;
  score: number;
  recommendation: 'approve' | 'request_changes' | 'reject';
  feedback: string;
  gaps: string[] | null;
  raw_response: Record<string, unknown>;
}

// Combined view for UI
export interface SubmissionWithVerification {
  submission: WorkSubmission;
  verification: DeliveryVerification | null;
}

export type PaymentRelease = {
  milestone_index: number;
  released_at: string;
  tx_hash?: string;
  verification_id?: string;
  score?: number;
  recommendation?: 'approve' | 'request_changes' | 'reject';
};

// Escrow record types
export interface EscrowRecord {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  wallet_address: string;
  freelancer_address: string;
  amount: number;
  description: string;
  milestone_count: number;
  milestones: Milestone[];
  tx_hash: string | null;
  status: 'pending' | 'active' | 'completed' | 'refunded';
  verification_result: VerificationResult | null;
  on_chain_id: number | null;
  payment_releases: PaymentRelease[] | null;
}

export interface EscrowInsert {
  user_id: string;
  wallet_address: string;
  freelancer_address: string;
  amount: number;
  description: string;
  milestone_count: number;
  milestones: Milestone[];
  verification_result?: VerificationResult;
  on_chain_id?: number | null;
}

export interface EscrowUpdate {
  tx_hash?: string;
  status?: 'pending' | 'active' | 'completed' | 'refunded';
  verification_result?: VerificationResult;
  payment_releases?: PaymentRelease[];
}

export interface UserProfile {
  wallet_address: string;
  role: 'client' | 'freelancer';
  created_at: string;
}

// Database schema types for reference
export interface Database {
  public: {
    Tables: {
      escrows: {
        Row: EscrowRecord;
        Insert: EscrowInsert;
        Update: EscrowUpdate;
      };
      work_submissions: {
        Row: WorkSubmission;
        Insert: WorkSubmissionInsert;
        Update: Partial<Omit<WorkSubmission, 'id' | 'created_at'>>;
      };
      delivery_verifications: {
        Row: DeliveryVerification;
        Insert: DeliveryVerificationInsert;
        Update: Partial<Omit<DeliveryVerification, 'id' | 'created_at'>>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at'>;
        Update: Pick<UserProfile, 'role'>;
      };
    };
  };
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

/**
 * Authenticate user with their Stellar wallet address
 * Creates an anonymous Supabase session and associates the wallet address with the user
 * 
 * @param walletAddress - The Stellar wallet public key
 * @returns Authentication data including session and user information
 * @throws Error if authentication fails
 */
export const authenticateWithWallet = async (walletAddress: string) => {
  try {
    const { data: existing } = await supabase.auth.getSession();
    if (existing.session?.user) {
      const sessionWallet = existing.session.user.user_metadata?.wallet_address;
      if (sessionWallet === walletAddress) {
        return { user: existing.session.user, session: existing.session };
      }
      // Wallet switched — sign out so the new session carries the correct address
      await supabase.auth.signOut();
    }

    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { wallet_address: walletAddress } },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

/**
 * Get the current Supabase session
 * 
 * @returns Current session or null if not authenticated
 * @throws Error if session retrieval fails
 */
export const getCurrentSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    return data.session;
  } catch (error) {
    console.error('Get session error:', error);
    throw error;
  }
};

/**
 * Get the current authenticated user with metadata
 * 
 * @returns Current user object including wallet_address in metadata
 * @throws Error if user retrieval fails
 */
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error?.message?.includes('session')) return null;
  if (error) throw error;
  return data.user;
};

/**
 * Sign out the current user and clear the session
 * 
 * @throws Error if sign out fails
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Retry a database operation with exponential backoff
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
 * Insert a new escrow record into the database
 * Includes retry logic with exponential backoff for resilience
 * Invalidates cache after successful insert
 * 
 * @param escrow - The escrow data to insert
 * @returns The inserted escrow record with generated ID
 * @throws Error if insert fails after all retries
 */
export const insertEscrow = async (escrow: EscrowInsert): Promise<EscrowRecord> => {
  return retryWithBackoff(async () => {
    try {
      const { data, error } = await supabase
        .from('escrows')
        .insert(escrow)
        .select()
        .single();
      
      if (error) {
        console.error('Insert escrow error:', error);
        throw new Error(`Failed to insert escrow: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('Insert escrow returned no data');
      }
      
      // Invalidate cache for this user
      invalidateEscrowCache(escrow.user_id);
      
      return data;
    } catch (error) {
      console.error('Insert escrow error:', error);
      throw error;
    }
  });
};

/**
 * Update an existing escrow record
 * Includes retry logic with exponential backoff for resilience
 * Invalidates cache after successful update
 * 
 * @param id - The UUID of the escrow to update
 * @param updates - The fields to update (tx_hash, status, verification_result)
 * @returns The updated escrow record
 * @throws Error if update fails after all retries
 */
export const updateEscrow = async (
  id: string,
  updates: EscrowUpdate
): Promise<EscrowRecord> => {
  return retryWithBackoff(async () => {
    try {
      const { data, error } = await supabase
        .from('escrows')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Update escrow error:', error);
        throw new Error(`Failed to update escrow: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('Update escrow returned no data');
      }
      
      // Invalidate cache for this user
      invalidateEscrowCache(data.user_id);
      
      return data;
    } catch (error) {
      console.error('Update escrow error:', error);
      throw error;
    }
  });
};

/**
 * In-memory cache for escrow data
 * Maps user_id to their escrow records
 */
const escrowCache = new Map<string, EscrowRecord[]>();

/**
 * Fetch all escrow records for a specific user
 * Includes retry logic with exponential backoff for resilience
 * 
 * @param userId - The UUID of the user
 * @returns Array of escrow records ordered by creation date (newest first)
 * @throws Error if fetch fails after all retries
 */
export const fetchUserEscrows = async (userId: string): Promise<EscrowRecord[]> => {
  return retryWithBackoff(async () => {
    try {
      const { data, error } = await supabase
        .from('escrows')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Fetch escrows error:', error);
        throw new Error(`Failed to fetch escrows: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Fetch escrows error:', error);
      throw error;
    }
  });
};

/**
 * Fetch all escrow records for a specific user with caching
 * Returns cached data if available, otherwise fetches from database
 * 
 * @param userId - The UUID of the user
 * @returns Array of escrow records ordered by creation date (newest first)
 * @throws Error if fetch fails after all retries
 */
export const fetchUserEscrowsCached = async (userId: string): Promise<EscrowRecord[]> => {
  // Check if data is in cache
  if (escrowCache.has(userId)) {
    console.log(`Cache hit for user ${userId}`);
    return escrowCache.get(userId)!;
  }
  
  console.log(`Cache miss for user ${userId}, fetching from database`);
  
  // Fetch from database
  const escrows = await fetchUserEscrows(userId);
  
  // Store in cache
  escrowCache.set(userId, escrows);
  
  return escrows;
};

/**
 * Fetch all escrow records where the client wallet_address matches.
 * This is the stable identifier across Supabase session resets.
 */
export const fetchEscrowsByWallet = async (walletAddress: string): Promise<EscrowRecord[]> => {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('escrows')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch escrows: ${error.message}`);
    return data || [];
  });
};

/**
 * Invalidate the escrow cache for a specific user
 * Should be called after INSERT, UPDATE, or DELETE operations
 *
 * @param userId - The UUID of the user whose cache should be invalidated
 */
export const invalidateEscrowCache = (userId: string): void => {
  if (escrowCache.has(userId)) {
    console.log(`Invalidating cache for user ${userId}`);
    escrowCache.delete(userId);
  }
};

/**
 * Clear the entire escrow cache
 * Useful for logout or when switching users
 */
export const clearEscrowCache = (): void => {
  console.log('Clearing entire escrow cache');
  escrowCache.clear();
};

/**
 * Subscribe to real-time escrow updates for a specific user
 * Listens to INSERT, UPDATE, and DELETE events on the escrows table
 * 
 * @param userId - The UUID of the user to filter events for
 * @param callback - Callback function invoked when an event occurs
 *                   Receives the event type and the escrow record (new for INSERT/UPDATE, old for DELETE)
 * @returns Realtime channel subscription that can be unsubscribed
 */
export const subscribeToEscrows = (
  userId: string,
  callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', escrow: EscrowRecord) => void
) => {
  return supabase
    .channel('escrows')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'escrows',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        
        // For DELETE events, use payload.old; for INSERT/UPDATE, use payload.new
        const escrowData = eventType === 'DELETE' ? payload.old : payload.new;
        
        if (escrowData) {
          callback(eventType, escrowData as EscrowRecord);
        }
      }
    )
    .subscribe();
};

/**
 * Insert a new escrow record with optimistic UI update
 * Updates UI immediately with temporary record, then performs actual insert
 * 
 * @param escrow - The escrow data to insert
 * @param onOptimisticUpdate - Callback to update UI with temporary record
 * @returns The inserted escrow record with real ID from database
 * @throws Error if insert fails (caller should rollback optimistic update)
 */
export const insertEscrowOptimistic = async (
  escrow: EscrowInsert,
  onOptimisticUpdate: (tempEscrow: EscrowRecord) => void
): Promise<EscrowRecord> => {
  // Create temporary record with optimistic ID
  const tempEscrow: EscrowRecord = {
    ...escrow,
    id: `temp-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tx_hash: null,
    status: 'pending',
    verification_result: escrow.verification_result || null,
    on_chain_id: escrow.on_chain_id ?? null,
    payment_releases: null,
  };
  
  // Update UI immediately
  console.log('Optimistic update: adding temporary escrow', tempEscrow.id);
  onOptimisticUpdate(tempEscrow);
  
  try {
    // Perform actual insert
    const inserted = await insertEscrow(escrow);
    console.log('Optimistic update: replaced with real escrow', inserted.id);
    return inserted;
  } catch (error) {
    // On error, caller should rollback the optimistic update
    console.error('Optimistic update failed, caller should rollback', error);
    throw error;
  }
};

/**
 * Update escrow payment_releases array with a new payment release record
 * Fetches current payment_releases, appends new record, and saves to database
 * Includes retry logic with exponential backoff for resilience
 * 
 * @param escrowId - The UUID of the escrow to update
 * @param paymentRelease - The payment release record to append
 * @returns The updated escrow record
 * @throws Error if fetch or update fails after all retries
 */
export const updateEscrowPaymentReleases = async (
  escrowId: string,
  paymentRelease: PaymentRelease
): Promise<EscrowRecord> => {
  return retryWithBackoff(async () => {
    try {
      // Step 1: Fetch current payment_releases array
      const { data: escrow, error: fetchError } = await supabase
        .from('escrows')
        .select('payment_releases')
        .eq('id', escrowId)
        .single();
      
      if (fetchError) {
        console.error('Fetch payment_releases error:', fetchError);
        throw new Error(`Failed to fetch payment_releases: ${fetchError.message}`);
      }
      
      if (!escrow) {
        throw new Error('Escrow not found');
      }
      
      // Step 2: Append new payment release record
      const currentReleases = (escrow.payment_releases as PaymentRelease[]) || [];
      const updatedReleases = [...currentReleases, paymentRelease];
      
      console.log(`Appending payment release for milestone ${paymentRelease.milestone_index} to escrow ${escrowId}`);
      
      // Step 3: Call updateEscrow to save updated payment_releases array
      const updatedEscrow = await updateEscrow(escrowId, {
        payment_releases: updatedReleases,
      });
      
      console.log(`Successfully updated payment_releases for escrow ${escrowId}`);
      
      return updatedEscrow;
    } catch (error) {
      console.error('Update payment_releases error:', error);
      
      // Provide user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new Error('Escrow not found in database');
        }
        if (error.message.includes('permission')) {
          throw new Error('Permission denied: unable to update payment releases');
        }
      }

      throw error;
    }
  });
};

/**
 * Fetch a user profile by wallet address. Returns null if not yet created
 * (first-time user — triggers role selection UI).
 */
export const getUserProfile = async (
  walletAddress: string
): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
  return data;
};

/**
 * Create or update the user profile (used during role selection).
 */
export const upsertUserProfile = async (
  walletAddress: string,
  role: 'client' | 'freelancer'
): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      { wallet_address: walletAddress, role },
      { onConflict: 'wallet_address' }
    )
    .select()
    .single();
  if (error) throw new Error(`Failed to save profile: ${error.message}`);
  if (!data) throw new Error('Upsert returned no data');
  return data;
};

/**
 * Fetch all escrows where the given wallet is the assigned freelancer.
 * Requires migration 009 RLS so freelancers can read their assigned escrows.
 */
export const fetchFreelancerEscrows = async (
  walletAddress: string
): Promise<EscrowRecord[]> => {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('escrows')
      .select('*')
      .eq('freelancer_address', walletAddress)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch freelancer escrows: ${error.message}`);
    return data || [];
  });
};

/**
 * Fetch a single escrow by id (used to refresh after mutations).
 */
export const fetchEscrowById = async (id: string): Promise<EscrowRecord | null> => {
  const { data, error } = await supabase
    .from('escrows')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch escrow: ${error.message}`);
  return data;
};

export const updateWorkSubmission = async (
  id: string,
  updates: { client_decision: 'accepted' | 'rejected' }
): Promise<WorkSubmission> => {
  const { data, error } = await supabase
    .from('work_submissions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update submission: ${error.message}`);
  if (!data) throw new Error('Update returned no data');
  return data;
};
