# Next.js Project Setup

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

### Environment Setup

1. After cloning the project, configure the environment variables in the `.env` file with appropriate values
2. In the `.env` file, set `UPLOAD_ENVIRONMENT` to your first name in all caps (e.g., "JOHN")
3. AWS Lambda Configuration:
   - In the metadata extractor Lambda function:
     - Add a new environment variable `JOHN_WEBHOOK_URL` (replacing JOHN with your name matching your `UPLOAD_ENVIRONMENT`) with your webhook URL
     - Update the `config.webhookUrls` in the Lambda function code to include your new entry:
     ```javascript
     webhookUrls: {
         PROD: process.env.PROD_WEBHOOK_URL,
         STAGING: process.env.STAGING_WEBHOOK_URL,
         DEV: process.env.DEV_WEBHOOK_URL,
         JOHN: process.env.JOHN_WEBHOOK_URL,  // Add your entry here matching your UPLOAD_ENVIRONMENT
     }
     ```

### Installation

Run `npm install` to install all dependencies

### Database Setup

1. Run `docker-compose up` to start the database and redis
2. Run `npx prisma migrate dev` in another terminal, which will create the database and tables in the database

### Running the Application

1. Start the main application:
```bash
npm run dev
```

2. Start the background workers (open separate terminals for each):
```bash
# Conversion worker
npm run dev-conversion-worker

# ASR worker
npm run dev-asr-worker

# LLM worker
npm run dev-llm-worker
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Rest API Documentation

[API Reference](https://docs.scribie.com/docs)

When you make changes to the API, you need to update the documentation. You can find the documentation in the `src/pages/docs` folder.

For adding new API endpoints, you need to add the new endpoint in the `src/app/api/v1/route.ts` file and then update the documentation in the `src/pages/docs` folder.

## Database Migrations

> See also:
>
> - https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate
> - https://www.prisma.io/docs/guides/database/production-troubleshooting#failed-migration

Prisma uses the `_prisma_migrations` table to track migrations. We generate migrations whenever we change the structure OR need to update existing data in the database.

Run `npx prisma migrate dev` after making changes in the `schema.prisma` file to generate the new migration. In the terminal it will ask for the name of the migration, you can give any name to the migration in snake case.


- create templates
  ```sql
  INSERT INTO public.scb_templates(
  name, user_id)
  VALUES ( 'Scribie Single Line Spaced', null);
  INSERT INTO public.scb_templates(
  name, user_id)
  VALUES ( 'Scribie Double Line Spaced', null);
  INSERT INTO public.scb_templates(
  name, user_id)
  VALUES ( 'Blank Single Line Spaced', null);
  INSERT INTO public.scb_templates(
  name, user_id)
  VALUES ( 'Blank Double Line Spaced', null);
  ```
  - Make a customer RL
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
  SELECT u.id, 10, 10, 10, 10, 10, 10, 10, 'legal', 10, 10, 10, 'TRANSCRIPTION_FORMATTING' FROM scb_users u WHERE u.email='test@gmail.com';

  UPDATE scb_customers SET custom_plan=true WHERE user_id = (SELECT id FROM scb_users WHERE email='test@gmail.com');
  ```
  - Enable legal for a transcriber (with email id test+qc@gmail.com)
  ```sql
    UPDATE scb_verifiers SET legal_enabled=true
    WHERE user_id = (SELECT u.id FROM scb_users u WHERE u.email='test+qc@gmail.com');
    ```