-- Create the table for storing payment webhooks
create table if not exists webhook_payments (
  id text primary key, -- Corresponds to the payment ID (e.g., pa_...)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  amount_in_cents integer,
  currency text,
  status text,
  payload jsonb, -- Stores the full JSON payload for future reference
  event_type text
);

-- Enable Row Level Security (RLS) is recommended
alter table webhook_payments enable row level security;

-- Policy to allow inserts from the anon key (if using the provided publishable key)
-- ideally use service_role key for backend, but this works for the provided key.
create policy "Enable insert for everyone" on webhook_payments for insert with check (true);

-- Policy to allow select for everyone (or restrict as needed)
create policy "Enable select for everyone" on webhook_payments for select using (true);
