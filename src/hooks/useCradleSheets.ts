import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  // Load user's sheets
  useEffect(() => {
    loadSheets();
  }, []);

  const loadSheets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        return;
      }

      setSheets(data || []);
      
      // Create default sheet if none exist
      if (!data || data.length === 0) {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create sheets.",
          variant: "destructive"
        });
        return null;
      }

      const defaultData = {
        cells: {},
        rows: 100,
        cols: 26,
        activeCell: 'A1',
        sheets: [{ id: 'sheet1', name: 'Sheet1', active: true }]
      };

      const { data, error } = await supabase
        .from('cradle_sheets')
        .insert({
          name,
          user_id: user.id,
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's default workspace (simplified - you may want to get this differently)
      const { data: workspaces } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1);

      if (workspaces && workspaces.length > 0) {
        await supabase.rpc('recorder_log', {
          p_workspace: workspaces[0].workspace_id,
          p_event_type: eventType,
          p_severity: 1,
          p_entity_type: 'cradle_sheet',
          p_entity_id: payload.id || '',
          p_summary: `Cradle action: ${eventType}`,
          p_payload: payload
        });
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