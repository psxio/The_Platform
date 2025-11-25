# Unified Web3 & Content Production Platform

## Overview

A unified application combining two systems:
1. **Web3 Wallet Tools**: Address comparison, NFT collection management, and address extraction for Web3 users
2. **ContentFlowStudio**: Content production management system with task tracking, team directory, and deliverables for content teams

The application uses Google OAuth authentication with strict role-based access control:
- **web3 users**: Only see wallet address tools and NFT features
- **content users**: Only see content production management features
- **admin users**: Full access to both sides

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Authentication

**Google OAuth 2.0**: User-provided credentials stored as secrets
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required
- Passport.js with passport-google-oauth20 strategy
- Session-based auth with PostgreSQL session store
- Callback URL: `/api/auth/google/callback`

**User Roles** (stored in users.role field):
- `web3`: Access to Compare, Extract, Collections, History, To Do pages
- `content`: Access to Content Dashboard with tasks and team directory
- `admin`: Access to all features from both sides

**Role Selection**: First-time users see role selection page; can change role later via user menu

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool.

**Routing**: Uses Wouter for lightweight client-side routing with role-based route protection.

**UI Component Library**: Shadcn UI (New York style) with Radix UI primitives.

**Key Pages**:
- `/role-select`: Role selection for new users
- `/compare`: Web3 address comparison tool (web3/admin)
- `/extract`: EVM address extraction from files (web3/admin)
- `/collections`: NFT collection management (web3/admin)
- `/history`: Comparison history (web3/admin)
- `/todo`: Personal to-do list (web3/admin)
- `/content`: Content production dashboard (content/admin)

### Backend Architecture

**Runtime**: Node.js with Express server

**API Endpoints**:

Web3 Endpoints:
- POST `/api/compare` - Upload and compare two files
- POST `/api/compare-collection` - Compare eligible file against stored collection
- POST `/api/extract` - Extract EVM addresses from any file
- GET/POST/DELETE `/api/collections` - NFT collection CRUD
- GET/POST/DELETE `/api/collections/:id/addresses` - Collection addresses
- GET `/api/comparisons` - Comparison history

Auth Endpoints:
- GET `/api/auth/user` - Get current user
- GET `/api/login` - Initiate Google OAuth
- GET `/api/logout` - Log out
- PATCH `/api/auth/role` - Update user role

ContentFlowStudio Endpoints:
- GET/POST/PUT/DELETE `/api/content-tasks` - Content task CRUD
- GET/POST/PUT/DELETE `/api/directory` - Team directory CRUD
- GET/POST/DELETE `/api/deliverables` - Deliverable file management
- POST `/api/content-tasks/:id/deliverables` - Upload task deliverable

To-Do Endpoints:
- GET/POST/PATCH/DELETE `/api/tasks` - Personal task CRUD

### Database Schema

**Users table** (for Google Auth):
- id (varchar): UUID primary key
- email (varchar): Unique email
- firstName, lastName, profileImageUrl (varchar)
- role (varchar): "web3", "content", or "admin"
- createdAt, updatedAt (timestamp)

**Sessions table** (for session storage):
- sid (varchar): Session ID primary key
- sess (jsonb): Session data
- expire (timestamp): Session expiration

**Collections table** (NFT minted address collections):
- id (serial): Primary key
- name (text): Unique collection name
- description (text): Optional description
- createdAt (timestamp)

**Minted Addresses table**:
- id (serial): Primary key
- collectionId (integer): FK to collections (cascade delete)
- address (text): Lowercase EVM address
- createdAt (timestamp)

**Comparisons table** (comparison history):
- id (serial): Primary key
- collectionId (integer): Optional FK to collections
- mintedFileName, eligibleFileName (varchar)
- totalEligible, totalMinted, remaining, invalidAddresses (integer)
- results (jsonb): Full comparison results
- createdAt (timestamp)

**Tasks table** (personal to-do):
- id (serial): Primary key
- userId (varchar): FK to users (cascade delete)
- title (text), status (text), isPublic (boolean)
- createdAt (timestamp)

**Content Tasks table** (ContentFlowStudio):
- id (serial): Primary key
- description (text): Task description
- status (varchar): "TO BE STARTED", "IN PROGRESS", "COMPLETED"
- assignedTo, dueDate, assignedBy, client, deliverable, notes (varchar/text)
- createdAt (timestamp)

**Directory Members table** (team directory):
- id (serial): Primary key
- person (varchar): Person name
- skill (text): Skills/roles
- evmAddress (varchar): Optional EVM address
- client (varchar): Associated client

**Deliverables table** (task file uploads):
- id (serial): Primary key
- taskId (integer): FK to content_tasks (cascade delete)
- fileName (varchar), filePath (text), fileSize (varchar)
- uploadedAt (timestamp)

### External Dependencies

**Authentication**:
- passport, passport-google-oauth20: OAuth strategy
- express-session, connect-pg-simple: Session management
- openid-client: OIDC support

**UI Components**:
- Radix UI primitives (@radix-ui/*)
- Lucide React icons
- Shadcn UI components

**Data Processing**:
- PapaParse: CSV parsing
- xlsx: Excel file parsing
- pdf-parse: PDF text extraction
- Multer: File upload handling

**Database**:
- Drizzle ORM with PostgreSQL
- @neondatabase/serverless driver

## Recent Changes (November 25, 2025)

1. **App Merger**: Combined Web3 wallet tools with ContentFlowStudio
2. **Google OAuth**: Replaced Replit Auth with user-provided Google OAuth credentials
3. **Role-Based Access Control**: 
   - Three roles: web3, content, admin
   - Role selection page for new users
   - Role-based navigation showing only relevant features
4. **ContentFlowStudio Integration**:
   - Content Tasks page with filtering and bulk actions
   - Team Directory with skills and EVM addresses
   - Deliverable file uploads per task
5. **Database Schema Updates**:
   - Added role field to users table
   - Added content_tasks, directory_members, deliverables tables

## Previous Changes (November 24, 2025)

1. **Ethereum Address Validation**: Format validation with error reporting
2. **PostgreSQL Database**: Drizzle ORM with persistent storage
3. **Comparison History**: History page with past results
4. **Multi-Format File Support**: CSV, TXT, JSON, Excel parsing
