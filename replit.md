# CSV Wallet Address Comparison Tool

## Overview

A Web3-focused utility tool for comparing wallet addresses across multiple file formats to identify which eligible addresses have not yet minted. The application provides a clean, professional interface for uploading two files (minted addresses and eligible addresses) and displays comparison results with statistics, downloadable output, and comparison history tracking.

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
- Two-page application with navigation between Compare and History pages
- Drag-and-drop file upload zones with visual feedback for multiple file formats
- Real-time file parsing and comparison with Ethereum address validation
- Statistics dashboard displaying total eligible, already minted, and remaining addresses
- Searchable results table with download capability
- Comparison history with persistent storage in PostgreSQL
- Mobile-responsive layout (single column stacking on small screens)

### Backend Architecture

**Runtime**: Node.js with Express server

**API Design**: REST API with file upload endpoints using Multer for multipart/form-data handling

**Multi-Format File Processing**: Unified parser (server/file-parser.ts) supporting:
- **CSV**: PapaParse for robust CSV parsing with multiple formats and delimiters
- **TXT**: Plain text address lists (one per line)
- **JSON**: Array of address objects or plain address strings with flexible field mapping
- **Excel**: .xlsx and .xls files using xlsx library for spreadsheet parsing
- Extraction of Ethereum addresses (0x + 40 hex characters) with format validation
- Optional metadata extraction (username, points, rank)
- Flexible parsing that handles both structured data and plain text address lists

**Address Validation**: 
- Format validation: 0x prefix + 40 hexadecimal characters
- Case-insensitive comparison for address matching
- Validation error reporting with line numbers and invalid address details

**Request Flow**:
1. Client uploads two files via `/api/compare` endpoint (supports CSV, TXT, JSON, Excel)
2. Server detects format and parses content to extract wallet addresses with validation
3. Server performs case-insensitive set comparison to identify addresses in eligible list but not in minted list
4. Results saved to PostgreSQL database for history tracking
5. Results returned with statistics, validation errors (if any), and full address details

**API Endpoints**:
- POST `/api/compare` - Upload and compare two files
- POST `/api/extract` - Extract EVM addresses from any file (PDF, CSV, TXT, JSON, Excel, HTML)
- GET `/api/comparisons` - Retrieve comparison history (with optional limit query param)
- GET `/api/comparisons/:id` - Retrieve specific comparison by ID

**Development vs Production**:
- Development: Vite dev server with HMR and specialized error handling
- Production: Compiled static assets served by Express

### Data Storage Solutions

**Current Implementation**: PostgreSQL database with Drizzle ORM for persistent comparison history storage.

**Database Schema**: Defined in `shared/schema.ts` with comparisons table:
- id (serial): Auto-incrementing primary key
- mintedFileName (varchar): Name of minted addresses file
- eligibleFileName (varchar): Name of eligible addresses file
- totalEligible (integer): Count of total eligible addresses
- totalMinted (integer): Count of already minted addresses
- remaining (integer): Count of addresses that haven't minted
- invalidAddresses (integer, nullable): Count of invalid addresses found
- results (jsonb): Full comparison results including address details
- createdAt (timestamp): When comparison was performed

**Data Models**:
- Address: Contains wallet address, optional username, points, and rank
- ComparisonResult: Contains array of non-minted addresses, statistics object, and optional validation errors
- Comparison: Database record with file names, statistics, and full results

### External Dependencies

**UI Components**: 
- Radix UI primitives (@radix-ui/*) - Accessible component primitives
- Lucide React - Icon library
- cmdk - Command menu component
- class-variance-authority & clsx - Utility-first styling helpers

**Data Processing**:
- PapaParse - CSV parsing and manipulation
- xlsx - Excel file parsing (.xlsx, .xls)
- Multer - File upload handling

**Database & ORM**:
- Drizzle ORM - TypeScript ORM with PostgreSQL dialect for schema definition and queries
- @neondatabase/serverless - Neon database driver for PostgreSQL connections
- PostgreSQL - Persistent storage for comparison history

**Development Tools**:
- TypeScript - Type safety across stack
- Vite - Frontend build tool and dev server
- esbuild - Server bundling for production
- Replit-specific plugins for development experience

**Styling**:
- Tailwind CSS - Utility-first CSS framework
- PostCSS with Autoprefixer

**Key Architectural Choices**:

1. **Multi-Format Support**: Unified parser architecture supports CSV, TXT, JSON, and Excel formats with automatic format detection based on file extension, providing flexibility for users with different data sources.

2. **Persistent History**: Comparison results are saved to PostgreSQL database, allowing users to review past comparisons and download previous results without re-uploading files.

3. **Address Validation**: Ethereum address format validation with detailed error reporting helps users identify and fix data quality issues before comparison.

4. **Case-Insensitive Matching**: Address comparison is case-insensitive to handle different checksumming conventions while maintaining compatibility.

5. **Flexible Parsing**: Parser handles multiple data formats including properly structured files, plain text address lists, and mixed content with metadata extraction using regex patterns.

6. **Type Safety**: Shared schema definitions between client and server using Zod for runtime validation and TypeScript for compile-time type checking.

7. **Modular Component System**: Shadcn UI approach allows for customization while maintaining consistency through design tokens and variants.

8. **Build Optimization**: Separate development and production server configurations for optimal developer experience and production performance.

## Recent Changes (November 25, 2025)

1. **Address Extractor Feature**: New Extract page that scans any file (PDF, CSV, TXT, JSON, Excel, HTML) to automatically find and extract all EVM wallet addresses, with CSV download capability
2. **Three-Page Navigation**: Updated UI with Compare, Extract, and History tabs

## Previous Changes (November 24, 2025)

1. **Ethereum Address Validation**: Implemented format validation (0x + 40 hex chars) with error reporting UI showing invalid addresses and line numbers
2. **PostgreSQL Database**: Set up Drizzle ORM with comparisons table for persistent history storage
3. **Comparison History**: Added History page with navigation, displaying past comparisons with download capability
4. **Multi-Format File Support**: Extended parser to support CSV, TXT, JSON (.json), and Excel (.xlsx, .xls) files with unified parsing interface