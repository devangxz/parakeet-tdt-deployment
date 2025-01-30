# Next.js Project Setup

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

### 1. Environment Setup

1. Clone the project repository.
2. Configure the environment variables in the `.env` file with appropriate values.
3. Set `UPLOAD_ENVIRONMENT` to your first name in all caps (e.g., `JOHN`).
4. **AWS Lambda Configuration:**
   - For the metadata extractor Lambda function:
     - To locally run AWS Lambda, install `ngrok` and execute:
       ```bash
       ngrok http 3000
       ```
     - Add a new environment variable `JOHN_WEBHOOK_URL` (replace `JOHN` with your `UPLOAD_ENVIRONMENT` value) with your webhook URL.
     - Update `config.webhookUrls` in the Lambda function:
       ```javascript
       webhookUrls: {
           PROD: process.env.PROD_WEBHOOK_URL,
           STAGING: process.env.STAGING_WEBHOOK_URL,
           DEV: process.env.DEV_WEBHOOK_URL,
           JOHN: process.env.JOHN_WEBHOOK_URL,  // Add your entry here
       }
       ```

### 2. Installation

- Run the following command to install dependencies:
    ```bash
    npm install
    ```

### 3. Database Setup

1. Start the database and Redis using Docker:
   ```bash
   docker-compose up
   ```
2. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
    #### Note:  In case above command produces any "host access denied" error. Try adding your host in pg_hba.config file in the postgres-data folder.
    
3. Populate the database with test accounts:
   ```bash
   npm run dev-seed
   ```

#### Test Accounts:
| Role | Email | Password |
|------|--------------------|------------|
| B2C Account | demo@gmail.com | Demo#1234 |
| RL Account | demo+rl@gmail.com | Demo#1234 |
| Transcriber Account | demo+tr@gmail.com | Demo#1234 |
| Reviewer Account | demo+rv@gmail.com | Demo#1234 |

### 4. Running the Application

1. Start the main application:
   ```bash
   npm run dev
   ```
2. Start background workers in separate terminals:
   ```bash
   # Conversion worker
   npm run dev-conversion-worker

   # ASR worker
   npm run dev-asr-worker

   # LLM worker
   npm run dev-llm-worker
   ```

Access the app at [http://localhost:3000](http://localhost:3000).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Setting up File Cache

Clone the `file-cache` repository from the Scribie GitHub repository and follow its `README.md` instructions to set up file handling operations.

## REST API Documentation

### Reference:
[API Reference](https://docs.scribie.com/docs)

### Updating API Documentation:
- When you make changes to the API, you need to update the documentation. You can find the documentation in the `src/pages/docs` folder.
- New API endpoints should be added to `src/app/api/v1/route.ts` and documented accordingly.

## Database Migrations

### Useful Links:
- [Prisma Migrate Guide](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate)
- [Prisma Migration Troubleshooting](https://www.prisma.io/docs/guides/database/production-troubleshooting#failed-migration)

### Running Migrations:
Prisma uses the _prisma_migrations table to track migrations. We generate migrations whenever we change the structure OR need to update existing data in the database.

Run:
```bash
npx prisma migrate dev
```
after making changes in the schema.prisma file to generate the new migration. In the terminal it will ask for the name of the migration, you can give any name to the migration in snake case.



### Seeding Templates
```sql
INSERT INTO public.scb_templates(name, user_id) VALUES 
  ('Scribie Single Line Spaced', null),
  ('Scribie Double Line Spaced', null),
  ('Blank Single Line Spaced', null),
  ('Blank Double Line Spaced', null);
```

### Creating a Customer RL
```sql
INSERT INTO scb_organizations (name, user_id)
SELECT 'REMOTELEGAL', u.id FROM scb_users u WHERE u.email='test@gmail.com';

INSERT INTO scb_templates(name, user_id)
SELECT 'Deposition', u.id FROM scb_users u WHERE u.email='test@gmail.com';

INSERT INTO public.scb_templates(name, user_id)
SELECT 'Examination Under Oath', u.id FROM scb_users u WHERE u.email='test@gmail.com';

INSERT INTO public.scb_templates(name, user_id)
SELECT 'Public Hearing', u.id FROM scb_users u WHERE u.email='test@gmail.com';

INSERT INTO public.scb_templates(name, user_id)
SELECT 'Hearing Argument Only', u.id FROM scb_users u WHERE u.email='test@gmail.com';

INSERT INTO public.scb_user_rates(
  user_id, manual_rate, sv_rate, agreed_monthly_hours, add_charge_rate, audio_time_coding, rush_order, custom_format, custom_format_option, deadline,
  custom_format_qc_rate, custom_format_review_rate, order_type)
SELECT u.id, 10, 10, 10, 10, 10, 10, 10, 'legal', 10, 10, 10, 'TRANSCRIPTION_FORMATTING' 
FROM scb_users u WHERE u.email='test@gmail.com';

UPDATE scb_customers 
SET custom_plan=true 
WHERE user_id = (SELECT id FROM scb_users WHERE email='test@gmail.com');
```

### Enabling Legal for a Transcriber
```sql
UPDATE scb_verifiers SET legal_enabled=true
WHERE user_id = (SELECT u.id FROM scb_users u WHERE u.email='test+qc@gmail.com');
```

---
