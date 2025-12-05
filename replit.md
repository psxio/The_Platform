# Unified Onchain & Content Production Platform

## Overview
This project is a unified application combining Onchain Tools (address comparison, NFT management, EVM address extraction) and Content Studio (content production management, task tracking, team directory, deliverable management). It features internal email/password authentication with strict role-based access control, requiring a single-use invite code for access. The platform aims to streamline operations for both onchain users and content production teams within a secure, managed environment, providing comprehensive tools for managing digital assets, content workflows, and team collaboration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React and TypeScript using Vite, Wouter for routing, and Shadcn UI (New York style) with Radix UI primitives. Design emphasizes modern aesthetics, utilizing task templates, multiple task views (Grid, Kanban, Calendar), visual indicators for task status, and an analytics dashboard. Task detail dialogs feature inline editing with role-based permissions and quick status workflow buttons.

### Navigation Architecture (December 2024)
The platform uses a **space-based navigation** system with role-gated access:
- **SpaceSwitcher**: Top-level navigation between spaces (My Workspace, Tasks, Content, Onchain, DAO, Admin)
- **SpaceTabs**: Secondary navigation within each space
- **SpotlightSearch**: Global Cmd+K search across all spaces with role-filtered results

**Key Home Pages by Role:**
- **web3**: `/onchain-ops` - Onchain Operations dashboard with Safe wallet balances, comparison history, NFT collections
- **content**: `/content-dashboard` - Content Studio with grouped tabs (Work, Team, Library, Reports, Settings)
- **admin**: `/content-dashboard` + `/admin/control-center` - Full access plus unified admin dashboard

**Tasks Navigation (All Roles):**
- `/tasks` route accessible by ALL roles (web3, content, admin) for universal task management
- Defaults to Kanban view for intuitive visual task management
- Supports List, Kanban, and Calendar views with user preference persistence (localStorage)
- Quick access "Team Tasks" buttons in Production Command Center and DAO Dashboard headers

**Spotlight Search** (Cmd+K or click search button):
- Role-filtered page navigation (content/web3/admin pages only shown to authorized users)
- Dynamic search across tasks, projects, clients, wallets, and collections
- Quick keyboard shortcut access from anywhere in the app
- Includes "Tasks" and "Open Kanban Board" quick actions

### Role Architecture
The system uses three roles: `web3`, `content`, and `admin`, with role-based access control enforced throughout. Clients in the buy power system are `content`-role users accessing a self-service portal.

### Technical Implementations
The backend is a Node.js application using Express, providing APIs for Onchain Tools and Content Studio features. Authentication uses `bcryptjs` for password hashing and PostgreSQL for session storage, enforcing role-based access control with invite codes.

### Feature Specifications
-   **Onchain Tools**: Address comparison, EVM address extraction (from various file types), NFT collection management, comparison history, CSV merge with deduplication, duplicate checker, **Wallet Screener** (batch screen wallets for bots, sybil attacks, airdrop farmers with risk scores, labels, and CSV export - supports Ethereum, Optimism, BSC, Polygon, Base, Arbitrum), and **YouTube to MP3 Converter** (convert YouTube videos to downloadable MP3 audio files with progress tracking).
-   **Content Studio**: Comprehensive task management (CRUD, subtasks, comments, multiple views), team directory, deliverable management (uploads, versioning, Google Drive integration, annotations), notifications, task templates, watchers, approval workflows, time tracking, analytics, asset library, recurring tasks, saved filters, time reports, campaign management, external integrations (Telegram, Discord), data export. Includes internal client tracking, worker monitoring with screen capture and Discord presence, payment requests, brand packs, Sheets Hub integration, client buy power and self-service portal, real-time order messaging, deliverable annotations, content ideas (pre-production approval), YouTube Playlist integration, feedback forms, enhanced asset library, saved items/pinned content, burndown chart analytics, ClickUp-style enhanced subtasks/watchers, client documents hub, real-time whiteboards, and **Team Drive Browser** (browse shared Google Drive content folder with member-organized subfolders for client/internal files, file preview, grid/list views).
-   **DAO Management System**: Complete Agency DAO implementation with:
    - **Service Catalog**: 18 standardized services across 5 categories (Strategy & Consulting, Development, Design & UX, Marketing & Growth, Retainers) with 3-tier pricing structure.
    - **Project Management**: Multi-step project creation wizard with client selection, service bundling, discount application, and team assignment.
    - **Revenue Attribution**: Default 30/15/40/10/5 split template (Biz Dev/Treasury/Project Lead/Support/Referral) with council override capability.
    - **7-Tier Rank Progression**: Contributor → Senior Contributor → Lead → Principal → Partner → Senior Partner → Founder with performance multipliers (1.0x to 3.0x) and revenue thresholds ($25K to $400K). Founder role is reserved for original founders with permanent council eligibility.
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
-   **Admin Features**: Invite code generation, user management, integration settings, payment/brand pack/Sheets Hub management, client buy power management, and **3D Model Generator** (AI-powered 3D model creation from text prompts using Blender, exports to GLB/FBX/Blender/OBJ/STL formats, job queue with status tracking).
-   **Onboarding System**: Role-specific welcome modals with guided walkthroughs.
-   **Help Center**: Role-specific documentation and FAQs.

### System Design Choices
The system uses a PostgreSQL database managed with Drizzle ORM. Key tables support users, sessions, Onchain Tools data, Content Studio features (tasks, members, deliverables, templates, watchers, approvals, time entries, assets, recurring tasks, campaigns, versions, content ideas), admin invite codes, team integrations, onboarding, worker monitoring data, payment requests, client brand packs, Google Sheets connections, payroll records, client buy power/transactions, buy power requests, content orders, client onboarding tracking, client profiles, client calendar events, internal team members, and team payment history. DAO Management tables include dao_roles (7-tier rank progression with multipliers), dao_memberships (member rank and revenue tracking), dao_service_catalog (18 standardized services), dao_discounts (4 discount types), dao_projects (project management), dao_project_services (project-service relationships), dao_revenue_attributions (split allocations), dao_treasury (balance and bonus tracking), dao_bonus_runs (distribution history), dao_invoices/payments (billing), dao_project_debriefs (lessons learned), dao_safe_wallets (multi-chain Safe wallet management), dao_safe_balances (token balances), dao_safe_pending_txs (pending transactions), dao_member_skills (skills matrix with proficiency 1-5), dao_member_availability (weekly hours, preferences), dao_consistency_metrics (reliability scores, role counts), dao_peer_feedback (structured feedback with ratings), dao_project_opportunities (opportunity queue), dao_role_bids (interest expression), dao_inbound_deals (deal attribution), dao_ip_contributions (IP registry), and dao_role_assignment_history (assignment audit trail). 

**ClickUp-Inspired Task Enhancements** (December 2024) include:
- **task_dependencies**: Task relationships (blocks, blocked_by, relates_to, duplicates, parent_of, child_of) linking both content and team tasks
- **enhanced_subtasks**: Full-featured subtasks with assignee, priority, due date, time tracking, status, and reordering
- **task_docs**: Rich collaborative documents attached to tasks, projects, or clients with view counts, templates, and nesting
- **task_doc_comments**: Threaded comments on docs with resolution status
- **client_uploads**: Per-client file uploads with categories, tags, and task/doc linking
- **kanban_configs**: Board-level and user-level Kanban customization with WIP limits, swimlanes, saved filters, and card display settings
- **task_custom_fields**: Dynamic custom fields (text, number, dropdown, date, checkbox, URL, email, phone, currency, rating, labels, people) scoped to boards, campaigns, or clients
- **task_custom_field_values**: Storage for custom field values per task
- **watcher_auto_add_rules**: Configurable triggers (create, comment, edit, assign, mention) for automatic watcher addition

Security is enforced via role-based access control, bcrypt hashing, and server-side middleware.

## External Dependencies

-   **Authentication**: `bcryptjs`, `express-session`, `connect-pg-simple`
-   **UI Components**: `@radix-ui/*`, `lucide-react`, `shadcn-ui`, `react-icons`
-   **Data Processing**: `PapaParse`, `xlsx`, `pdf-parse`, `Multer`
-   **Database**: `Drizzle ORM`, `PostgreSQL` (`@neondatabase/serverless`)
-   **Email**: `Nodemailer`
-   **Google Integration**: Google APIs for Sheets and Drive
-   **Discord Integration**: `discord.js`
-   **OCR**: `tesseract.js`
-   **3D Graphics**: Blender (headless mode for model generation)
-   **AI**: Anthropic Claude API via Replit AI Integrations