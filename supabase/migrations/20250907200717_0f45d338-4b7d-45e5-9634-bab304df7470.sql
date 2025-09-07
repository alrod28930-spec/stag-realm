-- Create cradle_sheets table for spreadsheet workspace
CREATE TABLE IF NOT EXISTS public.cradle_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Sheet',
  data JSONB NOT NULL DEFAULT '{
    "cells": {},
    "rows": 100,
    "cols": 26,
    "activeCell": "A1",
    "sheets": [{"id": "sheet1", "name": "Sheet1", "active": true}]
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cradle_sheets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own cradle sheets" 
ON public.cradle_sheets 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_cradle_sheets_updated_at
  BEFORE UPDATE ON public.cradle_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Create index for better performance
CREATE INDEX idx_cradle_sheets_user_id ON public.cradle_sheets(user_id);
CREATE INDEX idx_cradle_sheets_workspace_id ON public.cradle_sheets(workspace_id);