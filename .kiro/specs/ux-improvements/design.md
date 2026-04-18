# Design Document: UX Improvements

## Overview

This design document specifies the technical implementation for comprehensive UX improvements to the MilestoneEscrow application. The improvements target freelancers in Southeast Asia and emerging markets with limited blockchain experience, focusing on creating an intuitive, accessible, and mobile-friendly interface.

### Goals

1. **Reduce cognitive load** through clear loading states and progress indicators
2. **Build user confidence** with actionable error messages and recovery paths
3. **Prevent user errors** through real-time form validation and confirmation dialogs
4. **Lower entry barriers** with guided onboarding for first-time users
5. **Enable mobile access** through responsive design optimized for touch interfaces
6. **Increase transparency** with detailed transaction history and status explanations
7. **Provide guidance** through contextual empty states
8. **Improve efficiency** with copy-to-clipboard functionality
9. **Ensure inclusivity** through comprehensive accessibility features

### Key Design Principles

- **Progressive disclosure**: Show information when needed, hide complexity when not
- **Immediate feedback**: Provide visual and textual feedback within 100-200ms
- **Graceful degradation**: Handle errors without breaking the user experience
- **Mobile-first**: Design for touch interfaces, enhance for desktop
- **Accessibility-first**: Build with WCAG 2.1 AA compliance from the start

## Architecture

### Component Hierarchy

```
App
├── Topbar
│   ├── ThemeToggle
│   ├── WalletConnector (enhanced)
│   └── HelpButton (new)
├── OnboardingModal (new)
├── ConfirmationDialog (new)
├── Toast/Notification System (new)
└── Pages
    ├── HomePage
    │   ├── EmptyState (enhanced)
    │   └── EscrowCard (enhanced)
    ├── EscrowPage
    │   ├── FormField (enhanced with validation)
    │   ├── LoadingIndicator (enhanced)
    │   ├── ErrorDisplay (new)
    │   └── MilestoneCard (enhanced)
    └── HistoryPage
        ├── FilterBar (new)
        ├── EmptyState (enhanced)
        └── EscrowDetailModal (new)
```

### State Management Approach

We will use React's built-in state management with custom hooks for shared logic:

1. **Local component state** for UI-specific state (form inputs, modals, dropdowns)
2. **Custom hooks** for reusable logic:
   - `useFormValidation` - Real-time form validation
   - `useLoadingState` - Loading state management with timeouts
   - `useErrorHandler` - Error handling and retry logic
   - `useClipboard` - Copy-to-clipboard functionality
   - `useOnboarding` - Onboarding state and progress
   - `useMediaQuery` - Responsive breakpoint detection
3. **Context API** for global state:
   - `ToastContext` - Global notification system
   - `OnboardingContext` - Onboarding state across pages

### Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
Custom Hook (validation, loading, error handling)
    ↓
API Call / State Update
    ↓
Loading State → Success/Error State
    ↓
UI Update (feedback, notifications, state changes)
```

## Components and Interfaces

### 1. Loading Indicator System

**Purpose**: Provide visual feedback during asynchronous operations

**Component Structure**:

```typescript
// LoadingState type
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// LoadingIndicator component
interface LoadingIndicatorProps {
  state: LoadingState;
  message?: string;
  estimatedTime?: number; // milliseconds
  variant?: 'spinner' | 'progress' | 'skeleton' | 'pulse';
}

// useLoadingState hook
interface UseLoadingStateReturn {
  state: LoadingState;
  startLoading: () => void;
  setSuccess: () => void;
  setError: () => void;
  reset: () => void;
  elapsedTime: number;
}
```

**Implementation Details**:
- Spinner variant for AI generation (indeterminate)
- Progress bar variant for blockchain transactions (with estimated time)
- Skeleton variant for initial page loads
- Pulse variant for inline validation
- Automatic transition animations (fade-in/fade-out)
- Minimum display time of 300ms to prevent flashing
- Maximum timeout of 30 seconds with error fallback

### 2. Error Handling System

**Purpose**: Display user-friendly error messages with recovery actions

**Component Structure**:

```typescript
// Error types
type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

interface AppError {
  code: string;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  retryable: boolean;
  troubleshootingSteps?: string[];
}

// ErrorDisplay component
interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'banner' | 'modal';
}

// useErrorHandler hook
interface UseErrorHandlerReturn {
  error: AppError | null;
  handleError: (error: unknown) => void;
  clearError: () => void;
  retry: () => Promise<void>;
}
```

**Error Message Mapping**:
- Network errors → "Connection lost. Check your internet and try again."
- Wallet errors → "Wallet connection failed. Make sure Freighter is installed and unlocked."
- AI errors → "AI milestone generation failed. You can retry or enter milestones manually."
- Transaction errors → "Transaction failed: [specific reason]. Your funds are safe."
- Validation errors → Inline field-specific messages

### 3. Form Validation System

**Purpose**: Provide real-time validation feedback for form inputs

**Component Structure**:

```typescript
// Validation rule types
type ValidationRule = {
  validate: (value: string) => boolean;
  message: string;
};

interface FieldValidation {
  rules: ValidationRule[];
  validateOn: 'change' | 'blur' | 'submit';
  debounceMs?: number;
}

// FormField component
interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  validation?: FieldValidation;
  type?: 'text' | 'number' | 'textarea';
  placeholder?: string;
  helpText?: string;
  required?: boolean;
}

// useFormValidation hook
interface UseFormValidationReturn {
  values: Record<string, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  validateField: (name: string) => void;
  validateAll: () => boolean;
  setFieldValue: (name: string, value: string) => void;
  setFieldTouched: (name: string) => void;
  reset: () => void;
}
```

**Validation Rules**:
- Stellar address: 56 characters, starts with 'G', alphanumeric
- Amount: Positive number, max 7 decimals, min 1 XLM, max wallet balance
- Description: Min 10 characters, max 500 characters
- Real-time validation with 300ms debounce
- Visual states: default, valid (green border), invalid (red border), warning (yellow border)

### 4. Confirmation Dialog System

**Purpose**: Prevent accidental critical actions with confirmation prompts

**Component Structure**:

```typescript
// ConfirmationDialog component
interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  severity?: 'info' | 'warning' | 'danger';
  details?: Array<{ label: string; value: string }>;
}

// useConfirmation hook
interface UseConfirmationReturn {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  isOpen: boolean;
  close: () => void;
}
```

**Dialog Triggers**:
- Initialize escrow: Show amount, recipient, milestone count, network fee
- Release milestone: Show milestone number, amount, recipient
- Refund escrow: Show warning about irreversibility, total amount
- All dialogs include Escape key to cancel and focus trap

### 5. Onboarding System

**Purpose**: Guide first-time users through the application

**Component Structure**:

```typescript
// Onboarding step
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector for spotlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick: () => void;
  };
}

// OnboardingModal component
interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  steps: OnboardingStep[];
  currentStep: number;
}

// useOnboarding hook
interface UseOnboardingReturn {
  isOnboarded: boolean;
  currentStep: number;
  totalSteps: number;
  startOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  showHelp: () => void;
}
```

**Onboarding Flow**:
1. Welcome screen: Explain escrow concept
2. Wallet connection: Guide through Freighter installation
3. Escrow creation: Explain form fields and AI feature
4. Milestone management: Explain release and refund
5. Transaction history: Show where to track escrows

**Tooltip System**:
- Hover tooltips for technical terms (Stellar, XLM, Testnet, Milestone)
- Click tooltips for complex concepts (Escrow, Smart Contract)
- Dismissible help panel accessible from topbar

### 6. Mobile Responsive Design

**Purpose**: Optimize UI for mobile devices with touch interfaces

**Breakpoints**:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Mobile Optimizations**:

```typescript
// useMediaQuery hook
interface UseMediaQueryReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}
```

**Layout Changes**:
- Single-column layout on mobile
- Stacked form fields with increased spacing (16px → 24px)
- Touch targets minimum 44x44px (WCAG 2.5.5)
- Mobile navigation: Hamburger menu or bottom tab bar
- Collapsible sections for milestone cards
- Horizontal scrolling for transaction history
- Larger font sizes (14px → 16px base)
- Sticky headers for forms
- Pull-to-refresh for history page

### 7. Transaction History Enhancement

**Purpose**: Provide detailed transaction information with clear status explanations

**Component Structure**:

```typescript
// Enhanced Escrow type
interface EscrowDetail {
  id: number;
  title: string;
  description: string;
  clientAddress: string;
  freelancerAddress: string;
  totalAmount: number;
  status: 'Pending' | 'Released' | 'Refunded' | 'Disputed';
  milestones: MilestoneDetail[];
  createdAt: string;
  updatedAt: string;
  transactionHash: string;
  networkFee: number;
}

interface MilestoneDetail {
  number: number;
  name: string;
  description: string;
  amount: number;
  percentage: number;
  status: 'Pending' | 'Released' | 'Refunded';
  releasedAt?: string;
  transactionHash?: string;
}

// EscrowDetailModal component
interface EscrowDetailModalProps {
  escrow: EscrowDetail;
  isOpen: boolean;
  onClose: () => void;
}

// FilterBar component
interface FilterBarProps {
  onFilterChange: (filters: EscrowFilters) => void;
  activeFilters: EscrowFilters;
}

interface EscrowFilters {
  status?: 'Pending' | 'Released' | 'Refunded' | 'All';
  dateRange?: { start: Date; end: Date };
  amountRange?: { min: number; max: number };
  searchQuery?: string;
}
```

**Status Explanations**:
- Pending: "Funds are locked. Waiting for milestone completion."
- Released: "Milestone completed. Funds transferred to freelancer."
- Refunded: "Escrow cancelled. Funds returned to client."
- Disputed: "Issue reported. Awaiting resolution."

**Time Display**:
- Relative time for recent (< 24h): "2 hours ago"
- Absolute time for older: "Jan 15, 2025 at 3:45 PM"
- Elapsed time since last status change

### 8. Empty State System

**Purpose**: Provide guidance when no data is available

**Component Structure**:

```typescript
// EmptyState component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  illustration?: string; // SVG path
}
```

**Empty State Scenarios**:
- No escrows: "No escrows yet. Create your first escrow to get started."
- No active escrows: "All escrows completed! Create a new one."
- No wallet: "Connect your Freighter wallet to view your escrows."
- Zero balance: "Your wallet is empty. Get testnet XLM from Friendbot."
- No AI milestones: "AI will break down your project into fair milestones."
- No search results: "No escrows match your filters. Try adjusting them."

### 9. Copy-to-Clipboard System

**Purpose**: Enable easy copying of addresses and IDs

**Component Structure**:

```typescript
// useClipboard hook
interface UseClipboardReturn {
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
  error: Error | null;
  reset: () => void;
}

// CopyButton component
interface CopyButtonProps {
  text: string;
  label?: string;
  showLabel?: boolean;
  variant?: 'icon' | 'button';
  onCopy?: () => void;
}
```

**Implementation**:
- Click to copy for all addresses and IDs
- Visual feedback: Icon changes to checkmark for 2 seconds
- Toast notification: "Address copied to clipboard"
- Fallback for unsupported browsers: Show text in selectable modal
- Keyboard accessible: Enter/Space to trigger

### 10. Accessibility Features

**Purpose**: Ensure WCAG 2.1 AA compliance for all users

**Accessibility Requirements**:

```typescript
// Focus management
interface FocusManagement {
  trapFocus: (element: HTMLElement) => () => void;
  restoreFocus: (previousElement: HTMLElement) => void;
  moveFocus: (direction: 'next' | 'prev') => void;
}

// Screen reader announcements
interface A11yAnnouncement {
  message: string;
  priority: 'polite' | 'assertive';
  delay?: number;
}
```

**Implementation Checklist**:
- ✅ ARIA labels for all interactive elements
- ✅ Semantic HTML (nav, main, section, article)
- ✅ Keyboard navigation (Tab, Shift+Tab, Enter, Space, Escape, Arrow keys)
- ✅ Visible focus indicators (2px solid outline, 4.5:1 contrast)
- ✅ Color contrast 4.5:1 for text, 3:1 for UI components
- ✅ Text alternatives for icons (aria-label, sr-only text)
- ✅ Skip navigation links
- ✅ Focus trap in modals
- ✅ Live regions for dynamic content (aria-live)
- ✅ Form labels and error associations (aria-describedby)
- ✅ Disabled state communication (aria-disabled)
- ✅ Loading state announcements
- ✅ Browser zoom support up to 200%

## Data Models

### Enhanced Escrow Model

```typescript
interface Escrow {
  // Existing fields
  id: number;
  title: string;
  address: string;
  amount: number;
  status: 'Pending' | 'Released' | 'Refunded' | 'Disputed';
  milestone: number;
  totalMilestones: number;
  
  // New fields for UX improvements
  description: string;
  clientAddress: string;
  freelancerAddress: string;
  createdAt: string;
  updatedAt: string;
  transactionHash: string;
  networkFee: number;
  milestones: MilestoneDetail[];
  metadata: {
    aiGenerated: boolean;
    lastStatusChange: string;
    viewCount: number;
  };
}
```

### Validation State Model

```typescript
interface ValidationState {
  value: string;
  error: string | null;
  warning: string | null;
  touched: boolean;
  validating: boolean;
  valid: boolean;
}

interface FormState {
  fields: Record<string, ValidationState>;
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
}
```

### Onboarding State Model

```typescript
interface OnboardingState {
  completed: boolean;
  currentStep: number;
  skipped: boolean;
  completedAt: string | null;
  viewedSteps: string[];
  preferences: {
    showTooltips: boolean;
    showHelpPanel: boolean;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Before writing correctness properties, I need to analyze which acceptance criteria are suitable for property-based testing using the prework tool.

