# ClearCredit - Futuristic Credit Repair Platform

## 1. Concept & Vision

ClearCredit is a premium, AI-powered credit repair SaaS platform designed for professional credit repair businesses and their analysts. It combines the sleek, futuristic aesthetic of a high-tech command center with the functionality of a enterprise-grade CRM and document management system. The platform feels like stepping into the future of financial services - with glowing interfaces, smooth animations, and intelligent automation that makes credit repair feel effortless.

## 2. Design Language

### Aesthetic Direction
**Reference:** Cyberpunk-minimal meets Bloomberg Terminal - dark mode dominant with neon accent glows, glass-morphism panels, and data visualization that feels alive. Think SpaceX mission control meets premium fintech.

### Color Palette
```
--bg-primary: #0a0a0f (Deep space black)
--bg-secondary: #12121a (Elevated surface)
--bg-tertiary: #1a1a25 (Cards and panels)
--accent-primary: #00f0ff (Cyan neon - primary actions)
--accent-secondary: #8b5cf6 (Violet - secondary highlights)
--accent-success: #10b981 (Emerald - positive status)
--accent-warning: #f59e0b (Amber - warnings)
--accent-danger: #ef4444 (Red - errors/deletions)
--text-primary: #f8fafc (Near white)
--text-secondary: #94a3b8 (Muted slate)
--text-muted: #64748b (Dimmed)
--glow-cyan: 0 0 20px rgba(0, 240, 255, 0.3)
--glow-violet: 0 0 20px rgba(139, 92, 246, 0.3)
```

### Typography
- **Primary Font:** Inter (clean, modern, highly readable)
- **Monospace:** JetBrains Mono (for data, numbers, codes)
- **Display Font:** Space Grotesk (futuristic headers)

### Spatial System
- Base unit: 4px
- Section padding: 32px / 48px
- Card padding: 24px
- Component gap: 16px
- Border radius: 12px (cards), 8px (buttons), 6px (inputs)

### Motion Philosophy
- **Page transitions:** Fade + subtle slide (300ms ease-out)
- **Card hover:** Transform scale(1.02) + glow intensification
- **Data updates:** Number morphing animations
- **Loading states:** Pulsing skeleton with cyan glow
- **Micro-interactions:** Button press (scale 0.98), toggle slides, accordion smooth expand

### Visual Assets
- **Icons:** Lucide React (consistent stroke width, modern)
- **Charts:** Recharts with custom neon theme
- **Decorative:** Subtle grid patterns, gradient overlays, animated particles (sparse)

## 3. Layout & Structure

### Navigation Architecture
```
├── Dashboard (Overview / Command Center)
├── Clients
│   ├── Client List
│   ├── Client Detail
│   └── Add New Client
├── Credit Reports
│   ├── Report Upload
│   ├── Report Analysis View
│   └── Dispute Items
├── Disputes
│   ├── Active Disputes
│   ├── Dispute Detail
│   └── Letter Generator (AI)
├── Documents
│   ├── Service Contracts
│   └── Generated Letters
├── Billing
│   ├── Invoices
│   ├── Subscriptions (Stripe)
│   └── Payment History
└── Settings
    ├── Team Members
    ├── Business Profile
    └── Integrations
```

### Page Structure
- **Sidebar:** 260px fixed, collapsible to icons (64px)
- **Main Content:** Fluid, max-width 1400px centered
- **Header:** Sticky, 64px height, contains search + user menu
- **Content Area:** Scrollable with sticky sub-headers where needed

### Responsive Strategy
- Desktop-first (primary use case for analysts)
- Tablet: Collapsible sidebar, adjusted grid
- Mobile: Bottom navigation, stacked layouts

## 4. Features & Interactions

### Dashboard
- **Overview Cards:** Total clients, active disputes, letters generated this month, revenue
- **Progress Chart:** Visual pipeline of dispute statuses (New → In Progress → Resolved → Deleted)
- **Recent Activity Feed:** Timeline of recent actions across all clients
- **Quick Actions:** Upload report, Add client, Generate letter buttons
- **AI Insights Panel:** "AI has identified 12 high-confidence disputes this week"

### Client Management
- **Client List:** Sortable table with avatar, name, credit score trend, dispute count, status
- **Client Profile:** 
  - Contact information
  - Credit score history chart (line graph)
  - Active disputes count
  - Documents attached
  - Notes/timeline
  - Subscription status
- **Add Client Modal:** Multi-step form with validation

### Credit Report Processing
- **Upload Interface:** Drag-and-drop zone with progress indicator
- **AI Analysis Engine:**
  - Parses PDF/text credit reports
  - Identifies negative items (late payments, collections, charge-offs, etc.)
  - Categorizes by credit bureau
  - Generates dispute confidence score (0-100%)
- **Dispute Items Board:** Kanban-style board (To Dispute → Drafting → Sent → Received Response → Resolved/Deleted)

### AI Letter Generator (FCRA Compliance)
- **Template Selection:** Multiple FCRA-compliant templates
  - Dispute letter (inaccurate info)
  - Debt validation request
  - Pay for delete request
  - Good will letter
  - Address dispute
- **AI Generation:** 
  - Auto-populates client data
  - Generates customized content based on dispute reason
  - Preview with highlight changes option
- **Letter Editor:** Rich text editor for manual adjustments
- **Export Options:** PDF, Print, Email directly

### Progress Tracker
- **Pipeline View:** Kanban board with drag-and-drop
- **Calendar View:** Timeline of key dates (dispute sent, response due, follow-up)
- **Filters:** By status, client, bureau, date range
- **Automation Rules:**
  - Auto-remind after 30 days no response
  - Track response deadlines
  - Escalation triggers

### Service Contract Generator
- **Contract Templates:** State-compliant service agreements
- **Dynamic Fields:** Client name, services selected, pricing, start/end dates
- **Digital Signature:** Capture via canvas
- **Contract History:** Track all signed versions

### Billing Platform (Stripe Integration)
- **Subscription Plans:**
  - Starter: $99/mo (5 clients)
  - Professional: $299/mo (25 clients)
  - Enterprise: $699/mo (unlimited)
- **Invoice Generation:**
  - Auto-generate monthly invoices
  - Manual invoice creation
  - Custom invoice templates
- **Payment Processing:**
  - Stripe Checkout integration
  - Saved payment methods
  - Automatic retry on failure
- **Billing Dashboard:**
  - MRR/ARR metrics
  - Payment history
  - Outstanding invoices
  - Plan usage meters

## 5. Component Inventory

### Navigation
- **Sidebar:** Logo, nav items with icons, collapse toggle, user section at bottom
- **States:** Default, hover (glow), active (accent bg + glow), collapsed

### Buttons
- **Primary:** Cyan bg, dark text, glow on hover
- **Secondary:** Transparent with cyan border
- **Ghost:** Text only with hover underline
- **Danger:** Red variant for destructive actions
- **States:** Default, hover (scale + glow), active (pressed), disabled (50% opacity), loading (spinner)

### Cards
- **Standard:** bg-tertiary, rounded-xl, subtle border
- **Interactive:** Hover lift + glow border
- **Stat Card:** Icon + large number + label + trend indicator

### Forms
- **Inputs:** Dark bg, cyan focus ring, floating labels
- **Select:** Custom dropdown with search
- **Checkbox/Toggle:** Cyan when active with smooth transition
- **File Upload:** Dashed border zone, drag state highlight

### Tables
- **Header:** Sticky, sortable columns with indicators
- **Rows:** Hover highlight, action menu on right
- **Pagination:** Page numbers + prev/next

### Modals
- **Overlay:** backdrop-blur + dark tint
- **Panel:** Glass-morphism with slide-up animation
- **Close:** X button + click outside + Escape key

### Charts
- **Line Chart:** Gradient fill under line, animated draw-in
- **Bar Chart:** Neon bars with hover tooltips
- **Progress Ring:** Animated circular progress with percentage

### Empty States
- **Illustrations:** Minimal line art in muted cyan
- **Messages:** Friendly copy + CTA button

### Loading States
- **Skeleton:** Pulsing bg with subtle glow
- **Spinner:** Rotating ring in cyan
- **Progress Bar:** Animated gradient bar

## 6. Technical Approach

### Framework & Architecture
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + custom CSS variables
- **State:** React Context + useReducer for complex state
- **Database:** Prisma ORM with SQLite (can migrate to Postgres)
- **Auth:** NextAuth.js with credentials + optional OAuth

### API Design
```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/clients
POST   /api/clients
GET    /api/clients/:id
PUT    /api/clients/:id
DELETE /api/clients/:id

GET    /api/reports
POST   /api/reports/upload
POST   /api/reports/analyze
GET    /api/reports/:id

GET    /api/disputes
POST   /api/disputes
PUT    /api/disputes/:id
DELETE /api/disputes/:id

POST   /api/letters/generate
GET    /api/letters/:id
PUT    /api/letters/:id

POST   /api/contracts/generate
POST   /api/contracts/:id/sign

POST   /api/billing/create-subscription
POST   /api/billing/create-invoice
GET    /api/billing/invoices
POST   /api/billing/webhook (Stripe)
```

### Data Model
```prisma
User {
  id, email, password, name, role, businessId
}

Business {
  id, name, address, phone, stripeCustomerId, plan
}

Client {
  id, businessId, name, email, phone, address, ssnLast4, createdAt
}

CreditReport {
  id, clientId, fileUrl, parsedData, analyzedAt
}

DisputeItem {
  id, reportId, bureau, type, description, confidenceScore, status, timeline
}

DisputeLetter {
  id, disputeItemId, templateType, content, generatedAt, sentAt
}

ServiceContract {
  id, clientId, content, signedAt, signatureUrl
}

Invoice {
  id, businessId, clientId, amount, status, stripeInvoiceId, dueAt
}

Subscription {
  id, businessId, plan, status, stripeSubscriptionId, currentPeriodEnd
}
```

### Stripe Integration
- Stripe Checkout for subscription management
- Stripe Billing for invoice generation
- Stripe Webhooks for payment status updates
- Customer portal for self-service billing management

### AI Integration
- OpenAI GPT-4 for letter generation
- Custom prompts for FCRA compliance
- Template system with variable interpolation