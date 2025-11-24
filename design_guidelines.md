# Design Guidelines: CSV Wallet Address Comparison Tool

## Design Approach
**System Selected:** Clean, functional design inspired by Linear and modern Web3 dashboards
**Rationale:** Utility-focused tool requiring clarity, trust, and efficiency for processing blockchain wallet data

## Core Design Principles
- **Clarity First:** Every element serves the data comparison workflow
- **Trust & Precision:** Professional appearance befitting financial/blockchain data
- **Efficiency:** Minimal clicks from upload to results
- **Scannable Results:** Easy identification of eligible addresses

## Typography
- **Primary Font:** Inter or similar modern sans-serif via Google Fonts
- **Headings:** 
  - H1: text-2xl md:text-3xl, font-semibold
  - H2: text-xl font-medium
  - Labels: text-sm font-medium uppercase tracking-wide
- **Body Text:** text-base leading-relaxed
- **Data/Addresses:** font-mono text-sm (monospace for wallet addresses)
- **Stats:** text-3xl md:text-4xl font-bold for numbers

## Layout System
**Spacing Units:** Use Tailwind primitives of 4, 6, 8, 12, 16
- Component padding: p-6 to p-8
- Section spacing: mb-8, gap-6
- Card spacing: p-6
- Tight groupings: gap-4
- Generous whitespace: py-12 for main container

**Container Structure:**
- Max width: max-w-5xl mx-auto
- Page padding: px-4 md:px-6
- Single column layout for clarity

## Component Library

### File Upload Zones
- Two distinct upload areas (side-by-side on desktop, stacked mobile)
- Drag-and-drop areas: border-2 border-dashed rounded-lg p-8
- Clear labels: "Already Minted Addresses" and "Eligible to Mint Addresses"
- Upload icon (cloud upload) centered above text
- File name display once uploaded with remove option
- Accepted format indicator: "CSV files only"

### Statistics Dashboard
- Three-column grid (stacks to single column mobile)
- Large number display with descriptive label below
- Cards with subtle background distinction
- Metrics: Total Eligible, Already Minted, Remaining to Mint

### Results Table
- Clean table with alternating row backgrounds for scannability
- Columns: Wallet Address, Username (if available), Points
- Sticky header on scroll
- Monospace font for addresses
- Copy-to-clipboard button per address
- Search/filter functionality above table

### Action Buttons
- Primary: "Process Files" (prominent, full width on mobile)
- Secondary: "Download Results CSV" 
- Tertiary: "Clear All" option
- Button sizes: px-6 py-3 for primary actions

### Status Indicators
- Processing state: Animated spinner with status text
- Success: Checkmark with count summary
- Error: Clear error messages with retry option
- Empty state: Helpful instructions with icon

### Header
- Simple centered logo/title area
- Optional: Brief description subtitle "Compare wallet addresses across CSV files"
- Height: py-6

### Footer
- Minimal: Copyright or attribution
- Contact/support link if needed
- py-6

## Interaction States
- Hover: Subtle brightness/opacity changes
- Active upload zone: Border highlight when dragging file over
- Disabled states: Reduced opacity for unavailable actions
- Loading: Subtle pulse animation on processing

## Visual Hierarchy
1. Upload zones (primary focus on entry)
2. Process button (clear call-to-action)
3. Statistics (immediate feedback post-processing)
4. Results table (detailed output)
5. Download action (final step)

## Images
**No hero image needed** - This is a utility tool focused on functionality, not visual marketing.

## Accessibility
- WCAG AA contrast ratios throughout
- Clear focus indicators on all interactive elements
- Descriptive labels for screen readers
- Keyboard navigation support for all functions
- Error states announced properly

## Page Flow
Single-page application structure:
1. Header with tool title
2. Two-column upload section
3. Process button (centered, prominent)
4. Statistics cards (appears after processing)
5. Results table with search/filter
6. Download button (sticky or prominent)
7. Simple footer

This design prioritizes workflow efficiency and data clarity over decorative elements, appropriate for a Web3 utility tool.