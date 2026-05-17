
CREATE TABLE public.diagnoses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device TEXT NOT NULL,
  hint TEXT,
  problems JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_price_min NUMERIC NOT NULL,
  estimated_price_max NUMERIC NOT NULL,
  repair_time TEXT NOT NULL,
  confidence TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view diagnoses"
ON public.diagnoses FOR SELECT
USING (true);

CREATE POLICY "Anyone can create diagnoses"
ON public.diagnoses FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_diagnoses_created_at ON public.diagnoses (created_at DESC);
