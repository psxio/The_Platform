# Unified Web3 & Content Production Platform

## Overview
This project is a unified application combining Web3 Wallet Tools (address comparison, NFT management, EVM address extraction) and ContentFlowStudio (content production management, task tracking, team directory, deliverable management). It features internal email/password authentication with strict role-based access control (`web3`, `content`, `admin`), where all roles require a single-use invite code for access. The platform aims to streamline operations for both Web3 users and content production teams within a secure, managed environment.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React and TypeScript using Vite, Wouter for routing, and Shadcn UI (New York style) with Radix UI primitives for components. Design emphasizes modern aesthetics, utilizing task templates for ContentFlowStudio, multiple task views (Grid, Kanban, Calendar), visual indicators for task status, and an analytics dashboard. Task detail dialogs feature inline editing with role-based permissions and quick status workflow buttons.

### Navigation Structure
The main navigation (MainNav component) organizes the application into four sections with role-based visibility:
-   **Web3 Tools** (`/web3/*`): Compare, Extract, Merge, Collections, History, To-Do - visible to web3/admin roles
-   **Content Studio** (`/content-dashboard`): Dashboard, Monitoring - visible to content/admin roles
-   **Client Portal** (`/client-portal`): Direct link for credit self-service - visible to content/admin roles
-   **Admin** (`/admin/*`): User management, payments, invite codes, settings - visible to admin role only

Mobile navigation uses a responsive Sheet-based hamburger menu. Route guards (Web3RouteGuard, ContentRouteGuard, AdminRouteGuard) enforce access control and redirect unauthorized users to their default routes.

### Role Architecture
The system uses three roles: `web3`, `content`, and `admin`. "Clients" in the credit system are content-role users who access the self-service portal to view balances, request credits, and submit content orders. Admins manage client credit grants and approve requests. If a dedicated external client role is needed in the future, the architecture supports extension by: (1) adding "client" to userRoles in schema.ts, (2) creating a ClientRouteGuard, (3) updating MainNav visibility logic.

### Technical Implementations
The backend is a Node.js application using Express, providing APIs for Web3 tools, ContentFlowStudio features (tasks, directory, deliverables, subtasks, comments, activity, analytics, notifications, time tracking, task watchers, approval workflows, task templates, assets, recurring tasks, saved filters, deliverable versions, campaigns), personal to-do lists, and authentication/admin functionalities. Authentication uses `bcryptjs` for password hashing and PostgreSQL for session storage, enforcing role-based access control with invite codes.

### Feature Specifications
-   **Web3 Wallet Tools**: Address comparison, EVM address extraction (from various file types), NFT collection management, comparison history, CSV merge with deduplication.
-   **ContentFlowStudio**: Comprehensive task management (CRUD, filtering, bulk actions, subtasks, comments, activity, multiple views), team directory, deliverable management (uploads, versioning, Google Drive integration), email and in-app notifications, task templates, watchers, approval workflows, time tracking, analytics, asset library, recurring tasks, saved filters, time reports, campaign management, external integrations (Telegram, Discord), data export, welcome onboarding.
    -   **Worker Monitoring**: Screen capture-based activity monitoring with multi-step consent, random screenshot capture, local OCR (Tesseract.js) for app detection, enhanced app categorization, hourly reports, and an admin dashboard for real-time activity and analytics.
    -   **Payment Requests**: System for content team members to submit and track payment requests, with admin approval workflows and multi-channel notifications.
    -   **Brand Packs**: Centralized client brand asset management with categorized file uploads (via Google Drive) for content teams.
    -   **Sheets Hub**: Google Sheets integration for multi-sheet data synchronization, supporting Payroll and Multi-Column Task sheets, with sync logging and entity aggregations.
    -   **Client Credits & Self-Service Portal**: Comprehensive credit system for clients including credit management, a self-service portal for account overview, credit requests, content order submission, and onboarding.
-   **Admin Features**: Invite code generation and management, team invitation system, integration settings, payment request management, brand pack management, Sheets Hub access, client credits management.

### System Design Choices
The system uses a PostgreSQL database managed with Drizzle ORM. Key tables support users, sessions, Web3 tools data, ContentFlowStudio features (tasks, members, deliverables, templates, watchers, approvals, time entries, assets, recurring tasks, campaigns, versions), admin invite codes, team integrations, onboarding, worker monitoring data (consent, sessions, screenshots, hourly reports), payment requests, client brand packs, Google Sheets connections, payroll records, client credits/transactions, credit requests (with admin approval workflow), content orders (for spending credits), and client onboarding tracking. Security is enforced via role-based access control, bcrypt hashing, and server-side middleware.

## External Dependencies

-   **Authentication**: `bcryptjs`, `express-session`, `connect-pg-simple`
-   **UI Components**: `@radix-ui/*`, `lucide-react`, `shadcn-ui`
-   **Data Processing**: `PapaParse`, `xlsx`, `pdf-parse`, `Multer`
-   **Database**: `Drizzle ORM`, `PostgreSQL` (`@neondatabase/serverless`)
-   **Email**: `Nodemailer`
-   **Google Integration**: Google APIs for Sheets (`google-auth-library`, `googleapis`) and Drive
-   **OCR**: `tesseract.js`