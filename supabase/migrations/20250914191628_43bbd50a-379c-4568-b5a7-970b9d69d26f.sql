-- Create ui_layouts table for workspace layouts
CREATE TABLE IF NOT EXISTS public.ui_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  layout jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, workspace_id, name)
);

-- Enable RLS
ALTER TABLE public.ui_layouts ENABLE ROW LEVEL SECURITY;

-- Create policies for ui_layouts
CREATE POLICY "Users can manage their own layouts"
  ON public.ui_layouts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_ui_layouts_updated_at
  BEFORE UPDATE ON public.ui_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add workspace feature for Elite tier workspace functionality
INSERT INTO public.features (code, description, tier_min) VALUES 
('workspace_multi_panel', 'Multi-panel drag-and-drop workspace with bubble mode', 'elite')
ON CONFLICT (code) DO UPDATE SET
description = EXCLUDED.description,
tier_min = EXCLUDED.tier_min;