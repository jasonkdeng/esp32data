-- Supabase / Postgres table for storing ESP32 readings
-- Run this in Supabase SQL editor or via psql

CREATE TABLE IF NOT EXISTS public.readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id text NOT NULL,
  title text NOT NULL,
  value double precision NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Recommended: add an index for faster queries by timestamp
CREATE INDEX IF NOT EXISTS readings_timestamp_idx ON public.readings (timestamp DESC);
