# Quick Start Guide - The Platform

## 🚀 Get Started in 3 Steps

### Step 1: Set Up Environment Variables

1. **Copy the example environment file:**
   ```bash
   copy .env.example .env
   ```

2. **Edit `.env` and set the required DATABASE_URL:**
   ```env
   DATABASE_URL=postgresql://username:password@hostname:5432/database_name
   ```

   **Where to get a database:**
   - **Neon.tech** (Recommended) - Free PostgreSQL: https://neon.tech
   - **Supabase** - Free PostgreSQL: https://supabase.com
   - **Local PostgreSQL** - Install locally

3. **Optional: Set other environment variables** (see `.env.example` for all options)

---

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including the newly added `cross-env` for Windows compatibility.

---

### Step 3: Run the Development Server

```bash
npm run dev
```

You should see output like:
```
[bootstrap] 🚀 Bootstrapping microservices architecture...
[bootstrap] 📝 Registering services...
[bootstrap] ✅ Registered Web3 Service
[bootstrap] ✅ Microservices architecture bootstrapped successfully
[bootstrap] Microservices ready
[express] serving on port 5000
```

**The application is now running at:** `http://localhost:5000`

---

## 🎯 What's Available

### Web3 Service Endpoints

All Web3 endpoints are now available at `/api/v1/web3/*`:

#### Collection Management
- `GET /api/v1/web3/collections` - List all collections
- `POST /api/v1/web3/collections` - Create a collection
- `GET /api/v1/web3/collections/:name` - Get collection details
- `DELETE /api/v1/web3/collections/:name` - Delete collection

#### Address Extraction
- `POST /api/v1/web3/extract` - Extract addresses from files
- `POST /api/v1/web3/extract-tweets` - Extract from Twitter threads

#### Comparison Tools
- `GET /api/v1/web3/comparisons` - Get comparison history
- `POST /api/v1/web3/compare` - Compare two files
- `POST /api/v1/web3/compare-collection` - Compare file vs collection

#### Wallet Screening
- `POST /api/v1/web3/screen` - Screen wallet addresses
- `GET /api/v1/web3/screen/status` - Get API status

#### Health Check
- `GET /api/v1/web3/health` - Service health status
- `GET /api/v1/health` - All services health

---

## 🔧 Testing the API

### Test Health Check

```bash
curl http://localhost:5000/api/v1/web3/health
```

Expected response:
```json
{
  "name": "web3",
  "status": "healthy",
  "timestamp": "2025-12-07T10:00:00.000Z"
}
```

### Create a Collection

```bash
curl -X POST http://localhost:5000/api/v1/web3/collections \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"my-collection\"}"
```

### List Collections

```bash
curl http://localhost:5000/api/v1/web3/collections
```

---

## 📝 Database Setup

### Initialize Database Schema

Run database migrations:
```bash
npm run db:push
```

This will create all necessary tables in your database.

---

## 🛠️ Common Issues & Solutions

### Issue: "DATABASE_URL must be set"

**Solution:** Make sure you've created a `.env` file and set the `DATABASE_URL` variable.

```bash
# Create .env from example
copy .env.example .env

# Edit .env and add your database URL
# DATABASE_URL=postgresql://...
```

---

### Issue: "NODE_ENV is not recognized" (Windows)

**Solution:** ✅ Already fixed! We've installed `cross-env` which handles this automatically.

The package.json scripts now use:
```json
"dev": "cross-env NODE_ENV=development tsx server/index-dev.ts"
```

---

### Issue: Port 5000 already in use

**Solution:** Change the port in your `.env` file:
```env
PORT=3000
```

Or kill the process using port 5000:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Mac/Linux
lsof -ti:5000 | xargs kill
```

---

## 📚 Additional Documentation

- **`WEB3_SERVICE_MIGRATION_COMPLETE.md`** - Complete Web3 service documentation
- **`MODERNIZATION_PROGRESS.md`** - Platform modernization status
- **`EXECUTION_PLAN.md`** - Implementation roadmap
- **`AI_COST_OPTIMIZATION.md`** - AI cost management strategy
- **`.env.example`** - All available environment variables

---

## 🎓 Development Workflow

### 1. Start Development Server
```bash
npm run dev
```

### 2. Watch for Changes
The server automatically restarts when you modify files (using `tsx` watch mode).

### 3. Check TypeScript Types
```bash
npm run check
```

### 4. Build for Production
```bash
npm run build
```

### 5. Run Production Build
```bash
npm start
```

---

## 🔐 Environment Variables Reference

### Required
- `DATABASE_URL` - PostgreSQL connection string (REQUIRED)

### Recommended
- `SESSION_SECRET` - Session encryption key (use strong random string)
- `NODE_ENV` - Environment (development/production)

### Optional Features
- **Google Integration:** `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`
- **Email:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- **Web3:** `ETHERSCAN_API_KEY`, `X_API_BEARER_TOKEN`
- **AI:** `AI_INTEGRATIONS_ANTHROPIC_API_KEY`

See `.env.example` for complete list and descriptions.

---

## 🏗️ Architecture Overview

The Platform now uses a modern microservices architecture:

```
┌─────────────────────────────────────────┐
│          API Gateway (/api/v1/*)        │
│    - Request logging                    │
│    - Error handling                     │
│    - Health checks                      │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼───────┐  ┌─────▼────────┐
│ Web3 Service │  │ More services│
│              │  │   (coming)   │
│ 23 endpoints │  │              │
└──────────────┘  └──────────────┘
```

### Key Features
- ✅ Modular service architecture
- ✅ Centralized logging
- ✅ Health check monitoring
- ✅ Type-safe TypeScript
- ✅ Request validation
- ✅ Error handling
- ✅ Windows compatibility

---

## 🚀 Next Steps

1. **Set up your database** - Get a free PostgreSQL database from Neon or Supabase
2. **Configure environment** - Copy `.env.example` to `.env` and set DATABASE_URL
3. **Run migrations** - Execute `npm run db:push` to set up database schema
4. **Start developing** - Run `npm run dev` and access `http://localhost:5000`
5. **Test the API** - Try the Web3 endpoints documented above

---

## 💡 Need Help?

- Check the logs in `server/logs/` for detailed error information
- Verify all environment variables are set correctly in `.env`
- Test health endpoints: `/api/v1/health` and `/api/v1/web3/health`
- Review error responses for specific details

---

## 🎉 You're Ready!

The Platform is now ready for development with:
- ✅ Modern microservices architecture
- ✅ Web3 service fully operational (23 endpoints)
- ✅ Cross-platform compatibility (Windows, Mac, Linux)
- ✅ Production-ready logging and monitoring
- ✅ Comprehensive API validation

Happy coding! 🚀

---

*Last updated: December 7, 2025*
*Version: 1.0.0 with microservices architecture*
