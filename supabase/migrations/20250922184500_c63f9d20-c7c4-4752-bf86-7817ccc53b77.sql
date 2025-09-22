-- Fix infinite recursion in RLS policies by removing circular dependencies

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Workspace members can view member profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces" ON public.workspace_members;

DROP POLICY IF EXISTS "Users can view workspaces they own" ON public.workspaces;
DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;

-- Create simplified policies without circular dependencies

-- Profile policies (no workspace dependencies to avoid recursion)
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Workspace_members policies (simplified to avoid self-referencing)
CREATE POLICY "workspace_members_select_own" ON public.workspace_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "workspace_members_insert_own" ON public.workspace_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow workspace owners to manage memberships (no self-referencing)
CREATE POLICY "workspace_members_manage_by_owner" ON public.workspace_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces w 
            WHERE w.id = workspace_members.workspace_id 
            AND w.owner_id = auth.uid()
        )
    );

-- Workspace policies (simple ownership-based)
CREATE POLICY "workspaces_select_own" ON public.workspaces
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "workspaces_insert_own" ON public.workspaces
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update_own" ON public.workspaces
    FOR UPDATE USING (owner_id = auth.uid());