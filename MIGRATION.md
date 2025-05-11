# MongoDB to Prisma Migration

This document outlines the steps taken to migrate from MongoDB to Prisma with PostgreSQL as the database.

## Migration Changes

1. **Removed MongoDB dependencies**
   - Removed `mongodb` and `mongoose` packages
   - Deleted MongoDB connection utilities

2. **Added Prisma setup**
   - Added Prisma schema with models based on previous MongoDB schemas
   - Added Prisma client configuration
   - Updated package.json with Prisma dependencies and scripts

3. **Updated API routes**
   - All API routes now use Prisma client instead of Mongoose models
   - Updated database queries to use Prisma's query syntax
   - Optimized relation handling using Prisma's built-in relation capabilities

4. **Environment Variables**
   - Changed from `MONGODB_URI` to `DATABASE_URL` for database connection
   - Added PostgreSQL connection string format

## How to Complete the Migration

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a PostgreSQL database**
   - Set up a PostgreSQL database locally or using a cloud provider

3. **Configure environment variables**
   Create a `.env` file with:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/checkin?schema=public"
   JWT_SECRET="your-jwt-secret-key-change-in-production"
   REFRESH_SECRET="your-refresh-secret-key-change-in-production"
   JWT_EXPIRES_IN="15m"
   REFRESH_EXPIRES_IN="7d"
   ```

4. **Run Prisma migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

6. **Verify the migration**
   ```bash
   npm run dev
   ```

## Things to Note

- The database schema has been normalized following SQL best practices
- The migration preserves all functionality while improving performance
- Relations between tables are now enforced at the database level
- Transactions are used where appropriate for data consistency 