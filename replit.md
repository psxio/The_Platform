# CSV Wallet Address Comparison Tool

## Overview

A Web3-focused utility tool for comparing wallet addresses across CSV files to identify which eligible addresses have not yet minted. The application provides a clean, professional interface for uploading two CSV files (minted addresses and eligible addresses) and displays comparison results with statistics and downloadable output.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool.

**Routing**: Uses Wouter for lightweight client-side routing.

**UI Component Library**: Shadcn UI (New York style) with Radix UI primitives providing accessible, customizable components. The design system emphasizes:
- Clean, functional design inspired by Linear and Web3 dashboards
- Utility-focused interface prioritizing clarity and trust
- Monospace fonts for wallet addresses, Inter/modern sans-serif for general text
- Tailwind CSS for styling with custom design tokens

**State Management**: 
- React hooks for local component state
- TanStack Query (React Query) for server state management and data fetching
- No global state management solution (context-based patterns where needed)

**Key Design Decisions**:
- Single-page application with file upload workflow
- Drag-and-drop file upload zones with visual feedback
- Real-time CSV parsing and comparison
- Statistics dashboard displaying total eligible, already minted, and remaining addresses
- Searchable results table with download capability
- Mobile-responsive layout (single column stacking on small screens)

### Backend Architecture

**Runtime**: Node.js with Express server

**API Design**: REST API with file upload endpoints using Multer for multipart/form-data handling

**CSV Processing**: PapaParse library for robust CSV parsing with support for:
- Multiple CSV formats and delimiters
- Extraction of Ethereum addresses (0x + 40 hex characters)
- Optional metadata extraction (username, points, rank)
- Flexible parsing that handles both structured CSV and plain text address lists

**Request Flow**:
1. Client uploads two CSV files via `/api/compare` endpoint
2. Server parses CSV content to extract wallet addresses
3. Server performs set comparison to identify addresses in eligible list but not in minted list
4. Results returned with statistics and full address details

**Development vs Production**:
- Development: Vite dev server with HMR and specialized error handling
- Production: Compiled static assets served by Express

### Data Storage Solutions

**Current Implementation**: In-memory storage using a Map-based storage class for user data.

**Database Schema Defined**: Drizzle ORM configured for PostgreSQL with schema defined in `shared/schema.ts`, though currently the comparison tool operates statelessly without persistent storage.

**Data Models**:
- Address: Contains wallet address, optional username, points, and rank
- ComparisonResult: Contains array of non-minted addresses and statistics object

### External Dependencies

**UI Components**: 
- Radix UI primitives (@radix-ui/*) - Accessible component primitives
- Lucide React - Icon library
- cmdk - Command menu component
- class-variance-authority & clsx - Utility-first styling helpers

**Data Processing**:
- PapaParse - CSV parsing and manipulation
- Multer - File upload handling

**Database & ORM**:
- Drizzle ORM - TypeScript ORM with PostgreSQL dialect configured
- @neondatabase/serverless - Neon database driver (configured but not actively used)

**Development Tools**:
- TypeScript - Type safety across stack
- Vite - Frontend build tool and dev server
- esbuild - Server bundling for production
- Replit-specific plugins for development experience

**Styling**:
- Tailwind CSS - Utility-first CSS framework
- PostCSS with Autoprefixer

**Key Architectural Choices**:

1. **Stateless Processing**: Comparison operations don't require persistent storage, making the tool fast and privacy-focused (no data retention).

2. **Flexible CSV Parsing**: Parser handles multiple formats including properly structured CSV, plain text address lists, and mixed content with metadata extraction using regex patterns.

3. **Type Safety**: Shared schema definitions between client and server using Zod for runtime validation.

4. **Modular Component System**: Shadcn UI approach allows for customization while maintaining consistency through design tokens and variants.

5. **Build Optimization**: Separate development and production server configurations for optimal developer experience and production performance.