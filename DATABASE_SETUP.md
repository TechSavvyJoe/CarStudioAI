# Database Setup Instructions

## Vercel Postgres (Free Tier)

Your app now supports persistent storage using Vercel Postgres!

### Setup Steps:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/joes-projects-01f07834/car-studio-ai
   - Click on the "Storage" tab

2. **Create Postgres Database**
   - Click "Create Database"
   - Select "Postgres"
   - Choose the **FREE** "Hobby" plan (includes 256MB storage)
   - Click "Create"

3. **Connect to Your Project**
   - Select your `car-studio-ai` project to connect the database
   - Vercel will automatically add environment variables:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`
     - `POSTGRES_USER`
     - `POSTGRES_HOST`
     - `POSTGRES_PASSWORD`
     - `POSTGRES_DATABASE`

4. **Deploy**
   - The database tables will be created automatically on first use
   - Run: `npx vercel --prod`

### Features:

✅ **Cross-device sync** - Access your projects from any device  
✅ **Persistent storage** - Data survives browser cache clears  
✅ **Automatic backups** - Vercel handles backups  
✅ **Free tier** - 256MB storage, 60 compute hours/month  

### Database Schema:

- **projects** table: Stores project metadata (id, name, timestamps)
- **images** table: Stores all image data (URLs, AI labels, status, 360 info)

### Fallback:

If database is not configured, the app automatically falls back to localStorage (current behavior).

---

**Note:** The database initialization happens automatically - no manual SQL execution needed!
