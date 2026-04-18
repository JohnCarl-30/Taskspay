import type { Milestone } from './openai';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export interface VerificationResult {
  status: 'matching' | 'partial' | 'not_matching' | 'error';
  confidence: number; // 0-100
  feedback: string;
  gaps?: string[]; // For partial matches
}

/**
 * In-memory cache for verification results
 * Maps cache key (description + milestones JSON) to verification result
 */
const verificationCache = new Map<string, VerificationResult>();

/**
 * Generate a cache key from description and milestones
 * 
 * @param description - Project description
 * @param milestones - Array of milestones
 * @returns Cache key string
 */
const generateCacheKey = (description: string, milestones: Milestone[]): string => {
  return `${description}:${JSON.stringify(milestones)}`;
};

export const verifyMilestones = async (
  description: string,
  milestones: Milestone[]
): Promise<VerificationResult> => {
  // Handle missing API key
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_OPENAI_API_KEY_HERE") {
    return {
      status: 'error',
      confidence: 0,
      feedback: 'Verification unavailable - API key not configured',
    };
  }

  // Build verification prompt
  const verificationPrompt = `You are a project milestone verification expert.

Project Description: "${description}"

Generated Milestones:
${milestones.map((m, i) => `${i + 1}. ${m.name} (${m.percentage}%): ${m.description}`).join('\n')}

Analyze if the milestones comprehensively cover the project scope.

Return ONLY valid JSON:
{
  "status": "matching" | "partial" | "not_matching",
  "confidence": 0-100,
  "feedback": "brief explanation",
  "gaps": ["missing aspect 1", "missing aspect 2"]
}

Criteria:
- Do milestones cover all major deliverables mentioned?
- Are milestones specific to the project type?
- Is the breakdown logical and complete?

Note: Only include "gaps" array if status is "partial" or "not_matching".`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: verificationPrompt }],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content
      .replace(/```json|```/g, "")
      .trim();
    
    const parsed: VerificationResult = JSON.parse(text);

    // Validate the response structure
    if (!parsed.status || !['matching', 'partial', 'not_matching'].includes(parsed.status)) {
      throw new Error('Invalid verification status in response');
    }

    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
      throw new Error('Invalid confidence value in response');
    }

    return parsed;
  } catch (error) {
    console.error('Verification error:', error);
    return {
      status: 'error',
      confidence: 0,
      feedback: 'Verification unavailable due to API error',
    };
  }
};

/**
 * Verify milestones with caching
 * Returns cached result if available for the same description and milestones
 * 
 * @param description - Project description
 * @param milestones - Array of milestones to verify
 * @returns Verification result
 */
export const verifyMilestonesCached = async (
  description: string,
  milestones: Milestone[]
): Promise<VerificationResult> => {
  const cacheKey = generateCacheKey(description, milestones);
  
  // Check if result is in cache
  if (verificationCache.has(cacheKey)) {
    console.log('Verification cache hit');
    return verificationCache.get(cacheKey)!;
  }
  
  console.log('Verification cache miss, calling API');
  
  // Call API
  const result = await verifyMilestones(description, milestones);
  
  // Store in cache (only cache successful results, not errors)
  if (result.status !== 'error') {
    verificationCache.set(cacheKey, result);
  }
  
  return result;
};

/**
 * Clear the verification cache
 * Useful for testing or when cache becomes too large
 */
export const clearVerificationCache = (): void => {
  console.log('Clearing verification cache');
  verificationCache.clear();
};
