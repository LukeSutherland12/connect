# Paragon Connect

They build the home. We handle the site.

The Connect CRM: every job, booking, delivery, photo and dollar in one place.

Live: https://lukesutherland12.github.io/connect/

## What's in it

- **Dashboard** — active jobs, to-dos, total job value, still to be paid, next 14 days, who needs to do what.
- **Jobs** — per job: Progress (4 stages, every service), Book, Materials (plans, dated delivery per stage, urgent delivery), Photos, Money (contract, extras, payments, our costs and margin), weekly Updates, People.
- **Map** — every job pinned with its completion %.
- **To-do** — made automatically from every job and put against each person in their own colour.
- **People** — a contact page for each person: call, text, email, their to-dos and jobs.
- **Weekly updates** — written automatically every Monday for each active job, ready to email.
- **View as** — see exactly what a customer, builder or contractor sees.

## Accounts

- **Test mode (default):** with `config.js` blank, accounts, jobs and photos are saved in each browser only.
- **Shared accounts:** create a free Supabase project, run `supabase-setup.sql` in its SQL Editor, then paste the project URL and anon key into `config.js`. For quick testing, turn off "Confirm email" under Authentication → Providers → Email.

Prices for urgent delivery fees are placeholders in [BRACKETS] until they're set.
