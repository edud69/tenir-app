# tenir-app Feature Implementation Summary

This document summarizes the production-quality files created for the tenir-app Next.js project.

## Files Created

### 1. Chat Widget Component
**File:** `/src/components/assistant/chat-widget.tsx` (292 lines)

A feature-rich AI assistant chat widget with:

- **UI/UX:**
  - Floating button in bottom-right corner with MessageCircle icon (tenir accent color)
  - Animated chat panel slides up from bottom-right (~400px wide, ~500px tall)
  - Header with title and close button
  - Message area with scrollable history
  - User messages right-aligned (tenir-600 blue bubbles)
  - Assistant messages left-aligned (gray-200 bubbles)
  - Typing indicator with animated dots
  - Smooth CSS transitions for open/close

- **Features:**
  - State management with useState for messages, input, loading state, panel visibility
  - Real-time message streaming from API
  - Suggestion chips when empty (Tax Optimization, Dividend Strategy, Expense Deduction, Installments)
  - Input validation and disabled state during loading
  - Enter key to send, Shift+Enter for newlines support
  - Auto-focus input when panel opens
  - Auto-scroll to latest messages
  - Integrated disclaimer text

- **Internationalization:**
  - Uses next-intl for English/French translations
  - Pulls from 'assistant' namespace
  - Common namespace for shared terms

- **Accessibility:**
  - Proper ARIA labels
  - Focus-visible rings with tenir colors
  - Semantic HTML

---

### 2. AI Chat API Route
**File:** `/src/app/api/ai/chat/route.ts` (67 lines)

POST endpoint for streaming AI responses using Anthropic's Claude model:

- **Endpoint:** `POST /api/ai/chat`
- **Input:** `{ messages: Message[], organizationId?: string }`
- **Output:** Streaming text response via ReadableStream

- **Features:**
  - Uses Vercel AI SDK: `streamText` from 'ai' package
  - Uses `@ai-sdk/anthropic` for Claude integration
  - Model: `claude-3-5-sonnet-20241022`
  - Custom system prompt with domain expertise

- **System Prompt Expertise:**
  - CCPC (Canadian-Controlled Private Corporation) rules
  - Small business deduction and rates
  - RDTOH (Refundable Dividend Tax On Hand)
  - GRIP (General Rate Income Pool)
  - CDA (Capital Dividend Account)
  - Capital gains inclusion rates (2/3 post-June 2024)
  - Dividend taxation strategies
  - Tax installments planning
  - Bilingual support (French/English)

- **Configuration:**
  - Temperature: 0.7 (balanced for accuracy and creativity)
  - Max tokens: 1024
  - Streams response as data chunks

- **Error Handling:**
  - Try-catch with detailed error responses
  - Graceful fallback for API failures

---

### 3. Receipt OCR API Route
**File:** `/src/app/api/receipts/ocr/route.ts` (172 lines)

POST endpoint for analyzing receipt images and extracting data:

- **Endpoint:** `POST /api/receipts/ocr`
- **Input:** FormData with file (PDF, JPG, or PNG)
- **Output:** Structured JSON with extracted receipt data

- **Extracted Fields:**
  - Vendor name
  - Total amount (CAD)
  - Date (YYYY-MM-DD format)
  - GST amount
  - QST amount
  - Tax numbers
  - Line items (description + amount)
  - Category (office, meals, travel, professional, etc.)

- **Features:**
  - Uses Anthropic Claude 3.5 Sonnet for vision analysis
  - Base64 image encoding for API transmission
  - Supports: PDF, JPG, PNG formats
  - Optional Supabase Storage upload for record-keeping
  - Graceful handling of missing files
  - JSON validation and error reporting

- **Storage (Optional):**
  - Uploads processed receipts to Supabase Storage
  - Uses random unique IDs to prevent conflicts
  - Continues processing even if storage fails

- **Error Handling:**
  - File type validation
  - Parse error recovery with raw response
  - Detailed error messages

---

### 4. Tax Calculation API
**File:** `/src/app/api/taxes/calculate/route.ts` (221 lines)

POST endpoint for calculating Canadian/Quebec corporate taxes:

- **Endpoint:** `POST /api/taxes/calculate`
- **Input:**
  ```json
  {
    "activeBusinessIncome": number,
    "investmentIncome": number,
    "capitalGains": number,
    "dividendsReceived": number,
    "taxYear": number,
    "corporationType": "ccpc" | "general"
  }
  ```

- **Implemented Tax Calculations (2024-2025):**

  **Federal:**
  - Small business rate: 9% on first $500k
  - General rate: 15% above $500k
  - Investment income: 38.67% (includes 10.67% refundable)
  - Capital gains: 2/3 inclusion rate applied

  **Quebec:**
  - Small business rate: 3.2% on first $500k
  - General rate: 11.5% above $500k
  - Investment income: 45.96%
  - Capital gains: 2/3 inclusion rate

- **Output Components:**
  - Federal and Quebec breakdown by income type
  - RDTOH eligible/non-eligible amounts (30% and 10.67%)
  - Capital gains inclusion calculations
  - Effective tax rate
  - Detailed notes about calculations

- **Features:**
  - Separate tracking of business and investment income
  - Capital gains taxable amount calculation
  - RDTOH (IMRTD) refundable tax tracking
  - Multiple notes for user guidance
  - Flags for income exceeding small business limit

- **Accuracy Notes:**
  - Simplified rates for MVP (actual rates depend on multiple credits)
  - Recommends CPA consultation for precise calculations
  - Suitable for planning and estimation

---

### 5. Form Generation API
**File:** `/src/app/api/forms/generate/route.ts` (320 lines)

POST endpoint for generating government tax form structures:

- **Endpoint:** `POST /api/forms/generate`
- **Input:**
  ```json
  {
    "formType": "T2" | "CO-17" | "T5" | "RL-3",
    "taxYear": number,
    "organizationId": string (optional)
  }
  ```

- **Supported Forms:**

  1. **T2 - Corporation Income Tax Return (Canada)**
     - Identification section
     - Income statement (revenues, expenses)
     - Investment income
     - Deductions and credits
     - Tax payable summary
     - 28 fields total

  2. **CO-17 - Corporation Income Tax Return (Quebec)**
     - Identification (NEQ, BN, address)
     - Business income
     - Investment income (eligible/non-eligible dividends)
     - Quebec-specific deductions
     - Tax calculation
     - 24 fields total

  3. **T5 - Statement of Investment Income**
     - Payer and recipient information
     - Dividend, interest, capital gains income
     - Tax withheld information
     - Eligible dividend designation
     - 17 fields total

  4. **RL-3 - Investment Income (Quebec)**
     - Quebec payer/recipient information
     - Quebec-specific income breakdowns
     - Quebec tax credits
     - 16 fields total

- **Output Format:**
  - Draft status with generated timestamp
  - Organized sections with field definitions
  - Field types: text, number, date, currency
  - Placeholder values (ready for population)
  - Helpful notes about usage

- **MVP Features:**
  - Structure only (no auto-population yet)
  - Correct field codes matching CRA/Revenu Québec
  - Ready for database integration
  - Extensible design for future enhancements

---

## Integration Points

### Dependencies Used
- `next-intl` - Internationalization
- `lucide-react` - Icons
- `@ai-sdk/anthropic` - Claude AI integration
- `ai` - Vercel AI SDK for streaming
- `@supabase/supabase-js` - Optional storage
- `@anthropic-ai/sdk` - Direct Anthropic API calls
- Existing utilities: `cn()` from `@/lib/utils`

### Styling
- **Tailwind CSS** with tenir color palette
- tenir-600 (primary blue): #0070c7
- accent-500 (secondary magenta): #d946ef
- Responsive design with hover states
- Proper focus-visible styling for accessibility

### Translations
All translations exist in `src/messages/en.json` and `src/messages/fr.json`:
- `assistant.title` - "AI Assistant" / "Assistant IA"
- `assistant.placeholder` - Input placeholder
- `assistant.disclaimer` - Legal disclaimer
- `assistant.suggestions.*` - 4 suggestion chips
- `common.*` - Shared button labels

### Environment Variables Required
For production use:
- `ANTHROPIC_API_KEY` - For both chat and OCR features
- `NEXT_PUBLIC_SUPABASE_URL` - For storage (optional)
- `SUPABASE_SERVICE_ROLE_KEY` - For storage (optional)

---

## Usage Examples

### Chat Widget Integration
```tsx
import { ChatWidget } from '@/components/assistant/chat-widget';

export default function Layout() {
  return (
    <>
      <main>{/* ... */}</main>
      <ChatWidget organizationId="org_123" />
    </>
  );
}
```

### Tax Calculation
```bash
curl -X POST http://localhost:3000/api/taxes/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "activeBusinessIncome": 500000,
    "investmentIncome": 50000,
    "capitalGains": 25000,
    "dividendsReceived": 10000,
    "taxYear": 2024,
    "corporationType": "ccpc"
  }'
```

### Receipt OCR
```bash
curl -X POST http://localhost:3000/api/receipts/ocr \
  -F "file=@receipt.pdf"
```

### Form Generation
```bash
curl -X POST http://localhost:3000/api/forms/generate \
  -H "Content-Type: application/json" \
  -d '{
    "formType": "T2",
    "taxYear": 2024,
    "organizationId": "org_123"
  }'
```

---

## Production Checklist

- [ ] Add `@anthropic-ai/sdk` to package.json if using direct API
- [ ] Set `ANTHROPIC_API_KEY` in environment variables
- [ ] Test chat streaming with various message lengths
- [ ] Verify receipt OCR with sample receipts (PDF, JPG, PNG)
- [ ] Validate tax calculations against CPA reference
- [ ] Populate form fields with actual organization data
- [ ] Add rate limiting to API endpoints
- [ ] Implement error logging and monitoring
- [ ] Add user authentication to protect APIs
- [ ] Test with real Supabase storage bucket
- [ ] Add input validation with Zod schemas
- [ ] Implement message storage for conversation history
- [ ] Add tests for tax calculation accuracy
- [ ] Performance test streaming responses

---

## Notes

All code follows the tenir-app conventions:
- TypeScript strict mode
- React 18+ with Server/Client components
- Next.js 14+ App Router
- Tailwind CSS for styling
- Production-ready error handling
- Proper TypeScript interfaces
- Accessibility best practices
- Bilingual support (EN/FR)
