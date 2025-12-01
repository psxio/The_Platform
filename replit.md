# Unified Onchain & Content Production Platform

## Overview
This project is a unified application combining Onchain Tools (address comparison, NFT management, EVM address extraction) and Content Studio (content production management, task tracking, team directory, deliverable management). It features internal email/password authentication with strict role-based access control (`web3`, `content`, `admin`), where all roles require a single-use invite code for access. The platform aims to streamline operations for both onchain users and content production teams within a secure, managed environment.

## Naming Conventions
- **Onchain Tools** (formerly "Web3 Tools"): All wallet and blockchain-related features
- **Content Studio** (formerly "ContentFlowStudio"): Content production management system
- **Buy Power** (formerly "Credits"): Client credit balance for ordering content
- **Icons**: Lucide icons are used throughout, with react-icons/si only for brand logos (Google, Telegram, Discord)

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React and TypeScript using Vite, Wouter for routing, and Shadcn UI (New York style) with Radix UI primitives for components. Design emphasizes modern aesthetics, utilizing task templates for Content Studio, multiple task views (Grid, Kanban, Calendar), visual indicators for task status, and an analytics dashboard. Task detail dialogs feature inline editing with role-based permissions and quick status workflow buttons.

### Navigation Structure
The main navigation (MainNav component) organizes the application into five sections with role-based visibility:
-   **Onchain Tools** (`/web3/*`): Compare, Extract, Merge, Collections, History, To-Do - visible to web3/admin roles
-   **Content Studio** (`/content-dashboard`): Dashboard, Monitoring - visible to content/admin roles
-   **Client Portal** (`/client-portal`): Direct link for buy power self-service - visible to content/admin roles
-   **Client Directory** (`/client-directory`): All client & partner profiles - visible to ALL authenticated users
-   **Admin** (`/admin/*`): User management, payments, invite codes, settings - visible to admin role only

Mobile navigation uses a responsive Sheet-based hamburger menu. Route guards (Web3RouteGuard, ContentRouteGuard, AdminRouteGuard) enforce access control and redirect unauthorized users to their default routes.

### Role Architecture
The system uses three roles: `web3`, `content`, and `admin`. "Clients" in the buy power system are content-role users who access the self-service portal to view balances, request buy power, and submit content orders. Admins manage client buy power grants and approve requests. If a dedicated external client role is needed in the future, the architecture supports extension by: (1) adding "client" to userRoles in schema.ts, (2) creating a ClientRouteGuard, (3) updating MainNav visibility logic.

### Technical Implementations
The backend is a Node.js application using Express, providing APIs for Onchain Tools, Content Studio features (tasks, directory, deliverables, subtasks, comments, activity, analytics, notifications, time tracking, task watchers, approval workflows, task templates, assets, recurring tasks, saved filters, deliverable versions, campaigns), personal to-do lists, and authentication/admin functionalities. Authentication uses `bcryptjs` for password hashing and PostgreSQL for session storage, enforcing role-based access control with invite codes.

### Feature Specifications
-   **Onchain Tools**: Address comparison, EVM address extraction (from various file types), NFT collection management, comparison history, CSV merge with deduplication.
-   **Content Studio**: Comprehensive task management (CRUD, filtering, bulk actions, subtasks, comments, activity, multiple views), team directory, deliverable management (uploads, versioning, Google Drive integration, annotations for feedback/revisions), email and in-app notifications, task templates, watchers, approval workflows, time tracking, analytics, asset library, recurring tasks, saved filters, time reports, campaign management, external integrations (Telegram, Discord), data export, welcome onboarding.
    -   **Internal Client Tracking**: Tasks can be marked as "internal" vs "external" client. Internal tasks can be assigned to predefined projects (4444 Collection, PSX, Create, Platform, General). Quick filter buttons (All/External/Internal) and project-specific filters help organize content work between client projects and internal initiatives.
    -   **Worker Monitoring**: Screen capture-based activity monitoring with multi-step consent, random screenshot capture, local OCR (Tesseract.js) for app detection, enhanced app categorization, hourly reports, and an admin dashboard for real-time activity and analytics.
    -   **Discord Presence Monitoring**: Real-time tracking of content team members' Discord screen sharing activity. Team members can link their Discord accounts, and the system monitors when they are actively screen sharing in designated voice channels. Live green indicators appear next to names in Worker Monitoring and Team Directory views. Requires Discord bot configuration (Bot Token, Guild ID, Channel IDs) in Admin > Discord Monitor settings.
    -   **Payment Requests**: System for content team members to submit and track payment requests, with admin approval workflows and multi-channel notifications.
    -   **Brand Packs**: Centralized client brand asset management with categorized file uploads (via Google Drive) for content teams.
    -   **Sheets Hub**: Google Sheets integration for multi-sheet data synchronization, supporting Payroll and Multi-Column Task sheets, with sync logging and entity aggregations.
    -   **Client Buy Power & Self-Service Portal**: Comprehensive buy power system for clients including balance management, a self-service portal for account overview, buy power requests, content order submission, and onboarding.
    -   **Order Messaging**: Real-time client-team communication on content orders. Clients can message the team directly from order details, team members can reply with internal notes (hidden from clients) or client-facing messages. Notifications sync automatically. Messages appear in order detail dialogs with read receipts.
    -   **Deliverable Annotations**: Feedback and revision request system for deliverables. Team members can add comments, revision requests, approvals, or rejections on specific deliverables or versions. Annotations can be resolved and tracked. Revision requests trigger notifications to task assignees.
    -   **Content Ideas (Pre-Production Approval)**: System for content team to pitch ideas to clients before entering production. Content/admin users can create ideas with title, description, content type, estimated cost/timeline, and priority. Ideas are associated with client users (content-role) who can approve or deny them through the Client Portal. Features include:
        -   **Team Side (Content Dashboard > Ideas)**: Create, edit, delete ideas; filter by status; view client feedback
        -   **Client Side (Client Portal > Ideas)**: Review pending ideas, approve with optional feedback, or decline with reasons
        -   **Workflow**: Pending → Approved (ready for production) or Denied
        -   **Schema**: `content_ideas` table with clientId (user), status, estimates, and notes
-   **Client Directory**: Centralized database of all client and partner profiles accessible to all team members (web3, content, admin). Features include:
    -   **Client Profiles**: Company name, industry, relationship status (active/partner/prospect/inactive/paused), key contacts with roles and emails, website and social links (X/Twitter, Discord, Telegram), project history, notes, and custom tags.
    -   **Per-Client Calendar**: Schedule and track deadlines, milestones, meetings, deliverables, launches, and reviews for each client. Events can be linked to tasks and orders.
    -   **Search & Filtering**: Find clients by name, filter by relationship status and industry.
    -   **25+ Pre-seeded Clients**: Database initialized with partner data including betrmint, creatordao, district, DRVN, fireside, pizzadao, and more.
-   **Internal Team Management** (`/admin/internal-team`): Centralized roster for all internal team members with pay tracking, wallet addresses, and contact information. Admin-only access with features:
    -   **Team Roster**: View all 19+ team members with name, role, department, pay rate, wallet address, and payment method
    -   **Payment History**: Track all payments made to team members with transaction details
    -   **Multi-payment Support**: Crypto (Base, ETH, SOL), Venmo, PayPal, bank transfers
    -   **Search & Filter**: Find team members by name or filter by department/role/status
    -   **CRUD Operations**: Add, edit, and remove team members with full data validation
-   **Admin Features**: Invite code generation and management, team invitation system, integration settings, payment request management, brand pack management, Sheets Hub access, client buy power management.
-   **Onboarding System**: Role-specific welcome modals with 5-6 step guided walkthroughs. Web3 users see Onchain Tools tutorial (Compare, Extract, Collections, History, Merge); Content/Admin users see Content Studio tutorial (Tasks, Team, Deliverables, Analytics). Progress tracked in database (`userOnboarding` for content/admin, `web3Onboarding` for web3 users, `clientOnboarding` for clients).
-   **Help Center** (`/help`): Role-specific documentation with Getting Started guides, feature documentation, and FAQ. Accessible from user menu (both mobile and desktop navigation).

### System Design Choices
The system uses a PostgreSQL database managed with Drizzle ORM. Key tables support users, sessions, Onchain Tools data, Content Studio features (tasks, members, deliverables, templates, watchers, approvals, time entries, assets, recurring tasks, campaigns, versions, content ideas), admin invite codes, team integrations, onboarding, worker monitoring data (consent, sessions, screenshots, hourly reports), payment requests, client brand packs, Google Sheets connections, payroll records, client buy power/transactions, buy power requests (with admin approval workflow), content orders (for spending buy power), client onboarding tracking, client profiles (company info, contacts, relationship status, notes), client calendar events (deadlines, milestones, meetings linked to client profiles), internal team members (name, role, wallet, pay rate, payment method), and team payment history (audit trail for payments). Security is enforced via role-based access control, bcrypt hashing, and server-side middleware.

## External Dependencies

-   **Authentication**: `bcryptjs`, `express-session`, `connect-pg-simple`
-   **UI Components**: `@radix-ui/*`, `lucide-react`, `shadcn-ui`, `react-icons` (for brand logos only)
-   **Data Processing**: `PapaParse`, `xlsx`, `pdf-parse`, `Multer`
-   **Database**: `Drizzle ORM`, `PostgreSQL` (`@neondatabase/serverless`)
-   **Email**: `Nodemailer`
-   **Google Integration**: Google APIs for Sheets (`google-auth-library`, `googleapis`) and Drive
-   **Discord Integration**: `discord.js` for gateway connection and voice state monitoring
-   **OCR**: `tesseract.js`
