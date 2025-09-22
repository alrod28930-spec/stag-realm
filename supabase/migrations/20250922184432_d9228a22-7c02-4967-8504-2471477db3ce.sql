-- Fix infinite recursion in RLS policies by removing circular dependencies

-- Drop problematic policies first
DROP POLICY IF EXISTS "Workspace members can view member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Members can view workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;

-- Recreate simplified policies without circular dependencies

-- Simple profile policies (no workspace dependencies)
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Simple workspace_members policies (avoid self-referencing)
CREATE POLICY "Users can view their own memberships" ON public.workspace_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Workspace owners can manage memberships" ON public.workspace_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces w 
            WHERE w.id = workspace_members.workspace_id 
            AND w.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can join workspaces" ON public.workspace_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Simple workspace policies
CREATE POLICY "Users can view workspaces they own" ON public.workspaces
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspaces" ON public.workspaces
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update workspaces" ON public.workspaces
    FOR UPDATE USING (owner_id = auth.uid());