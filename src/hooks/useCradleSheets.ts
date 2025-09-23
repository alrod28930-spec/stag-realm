import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { useDemoMode } from '@/utils/demoMode';

interface CradleSheet {
  id: string;
  name: string;
  data: any;
  created_at: string;
  updated_at: string;
}

export function useCradleSheets() {
  const [sheets, setSheets] = useState<CradleSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuthStore();
  const { isDemoMode } = useDemoMode();

  // Load user's sheets
  useEffect(() => {
    loadSheets();
  }, []);

  const loadSheets = async () => {
    try {
      // Check if this is a test account (demo or owner) - never touch database
      if (isDemoMode) {
        const demoSheets = localStorage.getItem('demo-cradle-sheets');
        if (demoSheets) {
          setSheets(JSON.parse(demoSheets));
        } else {
          const defaultSheet = {
            id: 'demo-sheet-1',
            name: 'Demo Sheet',
            data: {
              cells: {},
              rows: 1000,
              cols: 100,
              columnWidths: {},
              rowHeights: {},
              frozenRows: 0,
              frozenCols: 0
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setSheets([defaultSheet]);
          localStorage.setItem('demo-cradle-sheets', JSON.stringify([defaultSheet]));
        }
        setLoading(false);
        return;
      }

      // Only proceed with database operations for genuine authenticated users
      if (!user || !isAuthenticated) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('cradle_sheets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading sheets:', error);
        toast({
          title: "Error loading sheets",
          description: error.message,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      setSheets(data || []);
      
      // Create default sheet if none exist for real authenticated users
      if ((!data || data.length === 0)) {
        await createSheet('My First Sheet');
      }
    } catch (error: any) {
      console.error('Error loading sheets:', error);
      toast({
        title: "Error loading sheets",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createSheet = async (name: string): Promise<CradleSheet | null> => {
    try {
      const defaultData = {
        cells: {},
        rows: 1000,
        cols: 100,
        columnWidths: {},
        rowHeights: {},
        frozenRows: 0,
        frozenCols: 0
      };

      // Check if this is a test account (demo or owner) - never touch database
      if (isDemoMode) {
        const newSheet: CradleSheet = {
          id: `demo-sheet-${Date.now()}`,
          name,
          data: defaultData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const updatedSheets = [newSheet, ...sheets];
        setSheets(updatedSheets);
        localStorage.setItem('demo-cradle-sheets', JSON.stringify(updatedSheets));
        
        toast({
          title: "Sheet created",
          description: `"${name}" has been created successfully.`
        });
        
        return newSheet;
      }

      // Only proceed with database operations for genuine authenticated users
      if (!user || !isAuthenticated) {
        toast({
          title: "Authentication required",
          description: "Please log in to create sheets.",
          variant: "destructive"
        });
        return null;
      }

      // Get user's default workspace for the sheet, create if none exists
      let { data: workspaces } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      let workspace_id: string | null = workspaces?.workspace_id || null;
      
      // Create default workspace if user doesn't have one
      if (!workspace_id) {
        const { data: newWorkspace } = await supabase
          .from('workspaces')
          .insert({
            name: `${user.email}'s Workspace`,
            owner_id: user.id
          })
          .select()
          .single();
          
        if (newWorkspace) {
          await supabase.from('workspace_members').insert({
            workspace_id: newWorkspace.id,
            user_id: user.id,
            role: 'owner'
          });
          workspace_id = newWorkspace.id;
        }
      }

      const { data, error } = await supabase
        .from('cradle_sheets')
        .insert({
          name,
          user_id: user.id,
          workspace_id: workspace_id,
          data: defaultData
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating sheet:', error);
        toast({
          title: "Error creating sheet",
          description: error.message,
          variant: "destructive"
        });
        return null;
      }

      setSheets(prev => [data, ...prev]);
      
      // Log the action
      await logCradleAction('cradle.sheet_created', { name });
      
      toast({
        title: "Sheet created",
        description: `"${name}" has been created successfully.`
      });

      return data;
    } catch (error: any) {
      console.error('Error creating sheet:', error);
      toast({
        title: "Error creating sheet",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const updateSheet = async (id: string, data: any): Promise<boolean> => {
    try {
      // Check if this is a test account (demo or owner) - never touch database
      if (isDemoMode) {
        const updatedSheets = sheets.map(sheet => 
          sheet.id === id ? { ...sheet, data, updated_at: new Date().toISOString() } : sheet
        );
        setSheets(updatedSheets);
        localStorage.setItem('demo-cradle-sheets', JSON.stringify(updatedSheets));
        return true;
      }

      const { error } = await supabase
        .from('cradle_sheets')
        .update({ data })
        .eq('id', id);

      if (error) {
        console.error('Error updating sheet:', error);
        return false;
      }

      setSheets(prev => prev.map(sheet => 
        sheet.id === id ? { ...sheet, data } : sheet
      ));

      // Log the action
      await logCradleAction('cradle.sheet_updated', { id });

      return true;
    } catch (error: any) {
      console.error('Error updating sheet:', error);
      return false;
    }
  };

  const renameSheet = async (id: string, name: string): Promise<boolean> => {
    try {
      // Check if this is a test account (demo or owner) - never touch database
      if (isDemoMode) {
        const updatedSheets = sheets.map(sheet => 
          sheet.id === id ? { ...sheet, name, updated_at: new Date().toISOString() } : sheet
        );
        setSheets(updatedSheets);
        localStorage.setItem('demo-cradle-sheets', JSON.stringify(updatedSheets));
        
        toast({
          title: "Sheet renamed",
          description: `Sheet renamed to "${name}" successfully.`
        });
        return true;
      }

      const { error } = await supabase
        .from('cradle_sheets')
        .update({ name })
        .eq('id', id);

      if (error) {
        console.error('Error renaming sheet:', error);
        toast({
          title: "Error renaming sheet",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      setSheets(prev => prev.map(sheet => 
        sheet.id === id ? { ...sheet, name } : sheet
      ));

      toast({
        title: "Sheet renamed",
        description: `Sheet renamed to "${name}" successfully.`
      });

      return true;
    } catch (error: any) {
      console.error('Error renaming sheet:', error);
      toast({
        title: "Error renaming sheet",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteSheet = async (id: string): Promise<boolean> => {
    try {
      // Check if this is a test account (demo or owner) - never touch database
      if (isDemoMode) {
        const updatedSheets = sheets.filter(sheet => sheet.id !== id);
        setSheets(updatedSheets);
        localStorage.setItem('demo-cradle-sheets', JSON.stringify(updatedSheets));
        
        toast({
          title: "Sheet deleted",
          description: "Sheet has been deleted successfully."
        });
        return true;
      }

      const sheetToDelete = sheets.find(s => s.id === id);
      
      const { error } = await supabase
        .from('cradle_sheets')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting sheet:', error);
        toast({
          title: "Error deleting sheet",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      setSheets(prev => prev.filter(sheet => sheet.id !== id));
      
      // Log the action
      if (sheetToDelete) {
        await logCradleAction('cradle.sheet_deleted', { 
          id, 
          name: sheetToDelete.name 
        });
      }

      toast({
        title: "Sheet deleted",
        description: "Sheet has been deleted successfully."
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting sheet:', error);
      toast({
        title: "Error deleting sheet", 
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  // Log cradle actions for compliance
  const logCradleAction = async (eventType: string, payload: any) => {
    try {
      // Never log actions for test accounts to prevent database issues
      if (isDemoMode || !user || !isAuthenticated) {
        console.log('Skipping action logging for test account or unauthenticated user');
        return;
      }

      // Get user's workspaces, create if none exists
      let { data: workspaces, error: workspaceError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (workspaceError) {
        console.error('Error fetching user workspaces:', workspaceError);
        return;
      }

      let workspace_id: string | null = workspaces?.workspace_id || null;
      
      // Create default workspace if user doesn't have one
      if (!workspace_id) {
        const { data: newWorkspace } = await supabase
          .from('workspaces')
          .insert({
            name: `${user.email}'s Workspace`,
            owner_id: user.id
          })
          .select()
          .single();
          
        if (newWorkspace) {
          await supabase.from('workspace_members').insert({
            workspace_id: newWorkspace.id,
            user_id: user.id,
            role: 'owner'
          });
          workspace_id = newWorkspace.id;
        } else {
          console.warn('Failed to create workspace for user, skipping action logging');
          return;
        }
      }

      const { error: logError } = await supabase.rpc('recorder_log', {
        p_workspace: workspace_id,
        p_event_type: eventType,
        p_severity: 1,
        p_entity_type: 'cradle_sheet',
        p_entity_id: payload.id || '',
        p_summary: `Cradle action: ${eventType}`,
        p_payload: payload
      });

      if (logError) {
        console.error('Error recording cradle action:', logError);
      }
    } catch (error) {
      console.error('Error logging cradle action:', error);
    }
  };

  return {
    sheets,
    loading,
    createSheet,
    updateSheet,
    renameSheet,
    deleteSheet,
    refreshSheets: loadSheets
  };
}