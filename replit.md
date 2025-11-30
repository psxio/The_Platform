# Unified Web3 & Content Production Platform

## Overview
This project is a unified application combining two distinct systems:
1.  **Web3 Wallet Tools**: Provides features like address comparison, NFT collection management, and EVM address extraction for Web3 users.
2.  **ContentFlowStudio**: A comprehensive content production management system offering task tracking, team directory, and deliverable management for content teams.

The platform uses internal email/password authentication with strict role-based access control. There are three main user roles: `web3` (access to wallet tools), `content` (access to content management), and `admin` (full access to both systems and administrative features like invite code generation). **All roles require a valid single-use invite code** - the platform is fully locked down, preventing unauthorized access to any features.

**Bootstrap Admin**: For initial production setup, set the `BOOTSTRAP_ADMIN_EMAIL` environment variable to an email address. That user can become admin without an invite code (shows "Auto-Access" badge on role selection). Currently set to `psxonbase@gmail.com` for production.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Authentication
The system uses internal email/password authentication with bcryptjs for password hashing and PostgreSQL for session storage. It features role-based access control with `web3`, `content`, and `admin` roles. All role access requires a single-use invite code - admins can generate role-specific codes to grant access to new team members.

### Frontend Architecture
The frontend is built with **React** and **TypeScript** using **Vite**. Routing is handled by **Wouter** with role-based protection. **Shadcn UI** (New York style) with **Radix UI** primitives is used for the UI components. Key pages include `role-select`, `compare`, `extract`, `collections`, `history`, `todo`, `content`, and `admin/codes`.

### Backend Architecture
The backend is a **Node.js** application using **Express**. It provides separate API endpoints for Web3 tools, ContentFlowStudio features (tasks, directory, deliverables, subtasks, comments, activity, analytics, notifications, time tracking, task watchers, approval workflows, task templates), personal to-do lists, and authentication/admin functionalities (invite codes).

### Database Schema
The system utilizes a **PostgreSQL** database managed with **Drizzle ORM**. Key tables include:
-   `users`: Stores user credentials, roles, and profile information.
-   `sessions`: For session management.
-   `collections`, `minted_addresses`, `comparisons`: For Web3 tools.
-   `tasks`: For personal to-do lists.
-   `content_tasks`, `directory_members`, `deliverables`: For ContentFlowStudio core.
-   `admin_invite_codes`: For secure role-based access (stores forRole to indicate which role a code grants: web3, content, or admin).
-   `admin_invite_code_uses`: Tracks detailed usage history for each invite code (user email, name, role granted, timestamp).
-   `task_templates`, `template_subtasks`, `task_watchers`, `approvals`, `time_entries`: For advanced ContentFlowStudio features.
-   `assets`, `recurring_tasks`, `saved_filters`, `deliverable_versions`, `campaigns`: For enhanced ContentFlowStudio features.
-   `team_integration_settings`: Stores Telegram bot tokens and Discord webhook URLs for external notifications.
-   `user_invites`: Manages team invitation tokens with role assignments and expiration.
-   `user_onboarding`: Tracks first-time user onboarding completion status.
-   `monitoring_consent`: Stores worker consent for monitoring activities (acknowledgments for screen capture, activity logging, hourly reports, data storage).
-   `monitoring_sessions`: Tracks active and completed monitoring sessions per worker.
-   `monitoring_screenshots`: Stores captured screenshots with OCR text, detected apps, and activity level.
-   `monitoring_hourly_reports`: Hourly activity summaries with random screenshot selection for each hour.
-   `payment_requests`: Payment requests submitted by content team members (amount, currency, reason, status, admin review details).
-   `payment_request_events`: Audit trail for payment request status changes (created, approved, rejected, cancelled).
-   `client_brand_packs`: Client brand packs with metadata (name, description, website, colors, notes).
-   `brand_pack_files`: Files attached to brand packs with category and metadata.
-   `connected_sheets`: Google Sheets connections with sheet ID, URL, type (payroll/tasks/custom), sync settings.
-   `payroll_records`: Synced payroll data with entity names, wallet addresses, amounts, token info.
-   `sheet_sync_logs`: Sync operation history with status, record counts, and error messages.
-   `multi_column_tasks`: Tasks parsed from multi-column task sheets with column names and descriptions.

### UI/UX Decisions
-   **Color Schemes**: Leverages Shadcn UI's New York style for a modern and clean aesthetic.
-   **Templates**: Utilizes task templates for ContentFlowStudio to streamline task creation.
-   **Design Approaches**: Implements multiple task views (Grid, Kanban, Calendar), visual indicators for task status (overdue, due soon), and an analytics dashboard for data visualization. Enhanced dialogs for task details integrate watchers, approvals, time tracking, subtasks, comments, and activity seamlessly.
-   **Task Details Dialog**: Features inline editing with role-based permissions:
    -   **Admin**: Full control over all fields (status, priority, assignee, due date, client, campaign, notes, description)
    -   **Task Owner (assignedTo)**: Can edit status, notes, add/toggle subtasks, log time entries
    -   **Task Assigner (assignedBy)**: Can reassign, change priority, due date, client, description, campaign
    -   **Others**: View-only with ability to comment and watch
    -   Visual permission badges indicate available actions for the current user
    -   Quick status workflow buttons for common transitions (Start Work, Mark Complete)

### Feature Specifications
-   **Web3 Wallet Tools**: Address comparison, EVM address extraction from various file types (CSV, TXT, JSON, Excel, PDF, ZIP archives), NFT collection management, comparison history, and CSV merge with deduplication.
-   **ContentFlowStudio**:
    -   Comprehensive task management (CRUD, filtering, bulk actions, subtasks, comments, activity timeline).
    -   Multiple task views (Grid, Kanban, Calendar).
    -   Team directory with member management.
    -   Deliverable file uploads with version history and file previews (Google Drive integration).
    -   Email notifications for assignments and due dates.
    -   In-app notification system.
    -   Task templates with subtask templates.
    -   Task watchers for collaboration.
    -   Approval workflows.
    -   Time tracking with timer functionality.
    -   Analytics dashboard with visual charts.
    -   Asset Library for managing images, videos, and documents with categories/tags.
    -   Recurring Tasks for automated task scheduling (daily/weekly/monthly/yearly).
    -   Saved Filters for quick access to custom filter presets.
    -   Time Reports with date range filtering, grouping, and CSV/JSON export.
    -   Campaign management for organizing related tasks.
    -   External Integrations: Telegram Bot API and Discord webhooks for sending task notifications to external channels.
    -   Data Export: Full task data export in CSV and JSON formats for backup and analysis.
    -   Welcome Onboarding: First-time user welcome modal highlighting key features.
    -   **Worker Monitoring**: Screen capture-based activity monitoring for content team workers:
        -   Multi-step consent flow requiring acknowledgment of all monitoring activities before starting.
        -   Browser-based screen capture using the Screen Capture API (workers must grant permission for full screen).
        -   Random screenshot capture at 1-10 minute intervals during active sessions.
        -   Local OCR using Tesseract.js to detect applications and activity (no AI API costs).
        -   Enhanced app categorization system (Productivity, Communication, Development, Entertainment, Social, Other).
        -   Hourly reports with random screenshot selection and activity summaries.
        -   Persistent "Monitoring Active" banner when session is running.
        -   Monitoring button accessible from main navigation bar for content users.
        -   Active session indicator (green pulse) when monitoring is running.
        -   Admin dashboard with enhanced features:
            -   Real-time activity feed with auto-refresh (10-second intervals).
            -   App usage analytics with category breakdown and visual progress bars.
            -   Idle worker alerts when workers show low activity.
            -   Overall activity rate progress indicator.
            -   App category visualization with color-coded badges.
        -   Routes: `/content/monitoring` (worker page), `/admin/monitoring` (admin dashboard).
    -   **Payment Requests**: Content team members can submit payment requests for missed or pending payments:
        -   Submit requests with amount, currency (supports fiat and crypto), and reason.
        -   Track request status (pending, approved, rejected, cancelled).
        -   Cancel pending requests before admin review.
        -   View history of all submitted requests with admin notes.
        -   Admin approval workflow with notes and rejection reasons.
        -   Notifications via in-app, Telegram, and Discord on status changes.
        -   Routes: `/content` (Payments tab), `/admin/payments` (admin review dashboard).
    -   **Brand Packs**: Centralized client brand asset management:
        -   Admins can create brand packs for each client with description, website, primary/secondary colors, and notes.
        -   File uploads organized by category (Logo, Brand Guidelines, Font, Color Palette, Template, Other).
        -   Content team members can browse and download brand assets from the "Brands" tab.
        -   Quick access to brand pack from task details when client is assigned (shows file count badge).
        -   Files stored via Google Drive integration for reliable hosting.
        -   Routes: `/content` (Brands tab), `/admin/brand-packs` (admin management).
    -   **Sheets Hub**: Google Sheets integration for multi-sheet data synchronization:
        -   Connect multiple Google Sheets by URL with automatic sheet ID extraction.
        -   Support for different sheet types: Payroll (financial tracking) and Multi-Column Tasks.
        -   Payroll sheets: Track entity names, wallet addresses, inflow/outflow amounts, token types, and receivers.
        -   Multi-column task sheets: Parse project-based column headers with task descriptions.
        -   Sync operations pull data from Google Sheets into local database with full sync logging.
        -   Entity aggregations with total in/out calculations and record counts.
        -   Sheet metadata preview before connecting (shows title and tab names).
        -   Sync status tracking (success, error, pending) with last sync timestamps.
        -   Admin-only access with route: `/admin/sheets-hub`.
-   **Admin Features**: Invite code generation and management with detailed usage tracking (shows who used each code, when, and what role was granted), team invitation system via email, integration settings for Telegram/Discord, payment request management, brand pack management, sheets hub for Google Sheets integration.
-   **Security**: Role-based access control, bcrypt hashing, server-side middleware for route protection.

## External Dependencies

-   **Authentication**: `bcryptjs`, `express-session`, `connect-pg-simple`
-   **UI Components**: `@radix-ui/*`, `lucide-react`, `shadcn-ui`
-   **Data Processing**: `PapaParse`, `xlsx`, `pdf-parse`, `Multer`
-   **Database**: `Drizzle ORM`, `PostgreSQL` (`@neondatabase/serverless`)
-   **Email**: `Nodemailer`
-   **Google Integration**: Google APIs for Sheets (`google-auth-library`, `googleapis`) and Drive
-   **OCR**: `tesseract.js` for local text recognition from screenshots (no AI API costs)