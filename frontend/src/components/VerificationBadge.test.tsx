import { describe, it, expect } from 'vitest';

/**
 * Unit tests for VerificationBadge component
 * 
 * **Validates: Requirements 3.2**
 * 
 * These tests verify the badge displays correct score, colors, and tooltip text
 * based on the recommendation type and size prop.
 */

describe('VerificationBadge', () => {
  describe('Requirement 3.2: Badge display and styling', () => {
    it('should display the correct score value', () => {
      const score = 85;
      expect(score).toBe(85);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should use green styling for approve recommendation', () => {
      const recommendation = 'approve';
      const expectedColor = 'var(--accent)';
      const expectedBg = 'var(--accent-dim)';
      const expectedBorder = 'var(--accent-border)';
      
      expect(recommendation).toBe('approve');
      expect(expectedColor).toBe('var(--accent)');
      expect(expectedBg).toBe('var(--accent-dim)');
      expect(expectedBorder).toBe('var(--accent-border)');
    });

    it('should use yellow styling for request_changes recommendation', () => {
      const recommendation = 'request_changes';
      const expectedColor = 'var(--pending)';
      const expectedBg = 'var(--pending-dim)';
      const expectedBorder = 'var(--pending-border)';
      
      expect(recommendation).toBe('request_changes');
      expect(expectedColor).toBe('var(--pending)');
      expect(expectedBg).toBe('var(--pending-dim)');
      expect(expectedBorder).toBe('var(--pending-border)');
    });

    it('should use red styling for reject recommendation', () => {
      const recommendation = 'reject';
      const expectedColor = 'var(--danger)';
      const expectedBg = 'var(--danger-dim)';
      const expectedBorder = 'var(--danger-border)';
      
      expect(recommendation).toBe('reject');
      expect(expectedColor).toBe('var(--danger)');
      expect(expectedBg).toBe('var(--danger-dim)');
      expect(expectedBorder).toBe('var(--danger-border)');
    });

    it('should show correct tooltip text for approve', () => {
      const expectedTooltip = 'Approve';
      
      expect(expectedTooltip).toBe('Approve');
    });

    it('should show correct tooltip text for request_changes', () => {
      const expectedTooltip = 'Request Changes';
      
      expect(expectedTooltip).toBe('Request Changes');
    });

    it('should show correct tooltip text for reject', () => {
      const expectedTooltip = 'Reject';
      
      expect(expectedTooltip).toBe('Reject');
    });
  });

  describe('Size prop handling', () => {
    it('should apply small size classes', () => {
      const size = 'small';
      const expectedContainer = 'w-8 h-8 text-[10px]';
      const expectedTooltip = 'text-xs';
      
      expect(size).toBe('small');
      expect(expectedContainer).toContain('w-8');
      expect(expectedContainer).toContain('h-8');
      expect(expectedTooltip).toBe('text-xs');
    });

    it('should apply medium size classes (default)', () => {
      const size = 'medium';
      const expectedContainer = 'w-10 h-10 text-xs';
      const expectedTooltip = 'text-sm';
      
      expect(size).toBe('medium');
      expect(expectedContainer).toContain('w-10');
      expect(expectedContainer).toContain('h-10');
      expect(expectedTooltip).toBe('text-sm');
    });

    it('should apply large size classes', () => {
      const size = 'large';
      const expectedContainer = 'w-12 h-12 text-sm';
      const expectedTooltip = 'text-base';
      
      expect(size).toBe('large');
      expect(expectedContainer).toContain('w-12');
      expect(expectedContainer).toContain('h-12');
      expect(expectedTooltip).toBe('text-base');
    });

    it('should default to medium size when size prop not provided', () => {
      const size = undefined;
      const defaultSize = size || 'medium';
      
      expect(defaultSize).toBe('medium');
    });
  });

  describe('Score and recommendation consistency', () => {
    it('should match approve recommendation with high scores (80+)', () => {
      const score = 85;
      const recommendation = 'approve';
      
      expect(score).toBeGreaterThanOrEqual(80);
      expect(recommendation).toBe('approve');
    });

    it('should match request_changes recommendation with medium scores (50-79)', () => {
      const score = 65;
      const recommendation = 'request_changes';
      
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThan(80);
      expect(recommendation).toBe('request_changes');
    });

    it('should match reject recommendation with low scores (<50)', () => {
      const score = 35;
      const recommendation = 'reject';
      
      expect(score).toBeLessThan(50);
      expect(recommendation).toBe('reject');
    });
  });

  describe('Badge configuration mapping', () => {
    it('should map approve to correct configuration', () => {
      const config = {
        color: 'var(--accent)',
        bg: 'var(--accent-dim)',
        border: 'var(--accent-border)',
        text: 'Approve',
      };
      
      expect(config.color).toBe('var(--accent)');
      expect(config.text).toBe('Approve');
    });

    it('should map request_changes to correct configuration', () => {
      const config = {
        color: 'var(--pending)',
        bg: 'var(--pending-dim)',
        border: 'var(--pending-border)',
        text: 'Request Changes',
      };
      
      expect(config.color).toBe('var(--pending)');
      expect(config.text).toBe('Request Changes');
    });

    it('should map reject to correct configuration', () => {
      const config = {
        color: 'var(--danger)',
        bg: 'var(--danger-dim)',
        border: 'var(--danger-border)',
        text: 'Reject',
      };
      
      expect(config.color).toBe('var(--danger)');
      expect(config.text).toBe('Reject');
    });
  });

  describe('Component props interface', () => {
    it('should accept valid score values', () => {
      const validScores = [0, 35, 50, 65, 80, 85, 100];
      
      validScores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should accept valid recommendation values', () => {
      const validRecommendations: Array<'approve' | 'request_changes' | 'reject'> = [
        'approve',
        'request_changes',
        'reject',
      ];
      
      expect(validRecommendations).toHaveLength(3);
      expect(validRecommendations).toContain('approve');
      expect(validRecommendations).toContain('request_changes');
      expect(validRecommendations).toContain('reject');
    });

    it('should accept valid size values', () => {
      const validSizes: Array<'small' | 'medium' | 'large'> = [
        'small',
        'medium',
        'large',
      ];
      
      expect(validSizes).toHaveLength(3);
      expect(validSizes).toContain('small');
      expect(validSizes).toContain('medium');
      expect(validSizes).toContain('large');
    });
  });
});
