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

### UI/UX Decisions
-   **Color Schemes**: Leverages Shadcn UI's New York style for a modern and clean aesthetic.
-   **Templates**: Utilizes task templates for ContentFlowStudio to streamline task creation.
-   **Design Approaches**: Implements multiple task views (Grid, Kanban, Calendar), visual indicators for task status (overdue, due soon), and an analytics dashboard for data visualization. Enhanced dialogs for task details integrate watchers, approvals, time tracking, subtasks, comments, and activity seamlessly.

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
        -   Browser-based screen capture using the Screen Capture API (workers must grant permission).
        -   Random screenshot capture at 1-10 minute intervals during active sessions.
        -   Local OCR using Tesseract.js to detect applications and activity (no AI API costs).
        -   Hourly reports with random screenshot selection and activity summaries.
        -   Persistent "Monitoring Active" banner when session is running.
        -   Admin dashboard to view all worker sessions, screenshots, and hourly reports.
        -   Routes: `/content/monitoring` (worker page), `/admin/monitoring` (admin dashboard).
-   **Admin Features**: Invite code generation and management with detailed usage tracking (shows who used each code, when, and what role was granted), team invitation system via email, integration settings for Telegram/Discord.
-   **Security**: Role-based access control, bcrypt hashing, server-side middleware for route protection.

## External Dependencies

-   **Authentication**: `bcryptjs`, `express-session`, `connect-pg-simple`
-   **UI Components**: `@radix-ui/*`, `lucide-react`, `shadcn-ui`
-   **Data Processing**: `PapaParse`, `xlsx`, `pdf-parse`, `Multer`
-   **Database**: `Drizzle ORM`, `PostgreSQL` (`@neondatabase/serverless`)
-   **Email**: `Nodemailer`
-   **Google Integration**: Google APIs for Sheets (`google-auth-library`, `googleapis`) and Drive
-   **OCR**: `tesseract.js` for local text recognition from screenshots (no AI API costs)