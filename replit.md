# Unified Onchain & Content Production Platform

## Overview
This project is a unified application combining Onchain Tools (address comparison, NFT management, EVM address extraction) and Content Studio (content production management, task tracking, team directory, deliverable management). It features internal email/password authentication with strict role-based access control, requiring a single-use invite code for access. The platform aims to streamline operations for both onchain users and content production teams within a secure, managed environment, providing comprehensive tools for managing digital assets, content workflows, and team collaboration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React and TypeScript using Vite, Wouter for routing, and Shadcn UI (New York style) with Radix UI primitives. Design emphasizes modern aesthetics, utilizing task templates, multiple task views (Grid, Kanban, Calendar), visual indicators for task status, and an analytics dashboard. Task detail dialogs feature inline editing with role-based permissions and quick status workflow buttons.

### Role Architecture
The system uses three roles: `web3`, `content`, and `admin`, with role-based access control enforced throughout. Clients in the buy power system are `content`-role users accessing a self-service portal.

### Technical Implementations
The backend is a Node.js application using Express, providing APIs for Onchain Tools and Content Studio features. Authentication uses `bcryptjs` for password hashing and PostgreSQL for session storage, enforcing role-based access control with invite codes.

### Feature Specifications
-   **Onchain Tools**: Address comparison, EVM address extraction (from various file types), NFT collection management, comparison history, CSV merge with deduplication.
-   **Content Studio**: Comprehensive task management (CRUD, subtasks, comments, multiple views), team directory, deliverable management (uploads, versioning, Google Drive integration, annotations), notifications, task templates, watchers, approval workflows, time tracking, analytics, asset library, recurring tasks, saved filters, time reports, campaign management, external integrations (Telegram, Discord), data export. Includes internal client tracking, worker monitoring with screen capture and Discord presence, payment requests, brand packs, Sheets Hub integration, client buy power and self-service portal, real-time order messaging, deliverable annotations, content ideas (pre-production approval), YouTube Playlist integration, feedback forms, enhanced asset library, saved items/pinned content, burndown chart analytics, ClickUp-style enhanced subtasks/watchers, client documents hub, and real-time whiteboards.
-   **DAO Management System**: Complete Agency DAO implementation with:
    - **Service Catalog**: 18 standardized services across 5 categories (Strategy & Consulting, Development, Design & UX, Marketing & Growth, Retainers) with 3-tier pricing structure.
    - **Project Management**: Multi-step project creation wizard with client selection, service bundling, discount application, and team assignment.
    - **Revenue Attribution**: Default 30/15/40/10/5 split template (Biz Dev/Treasury/Project Lead/Support/Referral) with council override capability.
    - **6-Tier Rank Progression**: Contributor → Senior Contributor → Lead → Principal → Partner → Senior Partner with performance multipliers (1.0x to 2.5x) and revenue thresholds ($25K to $400K).
    - **Treasury & Bonus System**: 15% automatic treasury allocation, $100K bonus trigger threshold, multiplier-based distribution to eligible members.
    - **6-Person Council**: Senior Partners and Partners eligible for council seats with special permissions for treasury operations, bonus runs, and attribution overrides.
    - **Discount Types**: DAO-to-DAO (10%), Multi-Service Bundle (15%), Long-Term Retainer (20%), Referral (5%).
    - **Project Debriefs**: Lessons learned, improvements, and client feedback documentation per project.
    - **Safe Wallet Integration**: Multi-chain Safe (Gnosis) wallet management with balance tracking, pending transaction monitoring, and transaction history across Ethereum, Polygon, Arbitrum, Optimism, Base, and other supported chains.
    - **Role Assignment & Fairness System**: Comprehensive system addressing equitable opportunity distribution including:
      - **Member Skills Matrix**: 1-5 proficiency scale across service categories with verification status
      - **Availability Tracking**: Weekly hours, project type preferences, and unavailable periods
      - **Consistency Metrics**: On-time delivery rate, collaboration/quality/responsibility scores, peer ratings separate from revenue performance
      - **Peer Feedback**: Structured feedback collection per project debrief with automatic score aggregation
      - **Project Opportunities Queue**: Visible pipeline of upcoming projects for transparent role allocation
      - **Role Bidding System**: Members can express interest in specific roles (Lead/PM/Core/Support) for fair consideration
      - **Workload Balancing**: Tracks lead/PM/core/support role distribution to prevent senior members from monopolizing high-value roles
      - **Inbound Deal Attribution**: Tracks who brought deals and referral credits
      - **IP Contributions**: Registry of member intellectual property contributions with revenue share tracking
      - **Role Assignment History**: Complete audit trail of project assignments with skill/workload/consistency scores at time of assignment
-   **Client Directory**: Centralized database of client and partner profiles with company info, contacts, relationship status, project history, notes, and custom tags. Features a per-client calendar and search/filtering.
-   **Internal Team Management**: Centralized roster for internal team members with pay tracking, wallet addresses, and contact information.
-   **Admin Features**: Invite code generation, user management, integration settings, payment/brand pack/Sheets Hub management, client buy power management.
-   **Onboarding System**: Role-specific welcome modals with guided walkthroughs.
-   **Help Center**: Role-specific documentation and FAQs.

### System Design Choices
The system uses a PostgreSQL database managed with Drizzle ORM. Key tables support users, sessions, Onchain Tools data, Content Studio features (tasks, members, deliverables, templates, watchers, approvals, time entries, assets, recurring tasks, campaigns, versions, content ideas), admin invite codes, team integrations, onboarding, worker monitoring data, payment requests, client brand packs, Google Sheets connections, payroll records, client buy power/transactions, buy power requests, content orders, client onboarding tracking, client profiles, client calendar events, internal team members, and team payment history. DAO Management tables include dao_roles (6-tier rank progression with multipliers), dao_memberships (member rank and revenue tracking), dao_service_catalog (18 standardized services), dao_discounts (4 discount types), dao_projects (project management), dao_project_services (project-service relationships), dao_revenue_attributions (split allocations), dao_treasury (balance and bonus tracking), dao_bonus_runs (distribution history), dao_invoices/payments (billing), dao_project_debriefs (lessons learned), dao_safe_wallets (multi-chain Safe wallet management), dao_safe_balances (token balances), dao_safe_pending_txs (pending transactions), dao_member_skills (skills matrix with proficiency 1-5), dao_member_availability (weekly hours, preferences), dao_consistency_metrics (reliability scores, role counts), dao_peer_feedback (structured feedback with ratings), dao_project_opportunities (opportunity queue), dao_role_bids (interest expression), dao_inbound_deals (deal attribution), dao_ip_contributions (IP registry), and dao_role_assignment_history (assignment audit trail). Security is enforced via role-based access control, bcrypt hashing, and server-side middleware.

## External Dependencies

-   **Authentication**: `bcryptjs`, `express-session`, `connect-pg-simple`
-   **UI Components**: `@radix-ui/*`, `lucide-react`, `shadcn-ui`, `react-icons`
-   **Data Processing**: `PapaParse`, `xlsx`, `pdf-parse`, `Multer`
-   **Database**: `Drizzle ORM`, `PostgreSQL` (`@neondatabase/serverless`)
-   **Email**: `Nodemailer`
-   **Google Integration**: Google APIs for Sheets and Drive
-   **Discord Integration**: `discord.js`
-   **OCR**: `tesseract.js`