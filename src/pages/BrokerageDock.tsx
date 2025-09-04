import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, ExternalLink, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DockedSite {
  id: string;
  label: string;
  url: string;
  created_at: string;
}

export default function BrokerageDock() {
  const [dockedSites, setDockedSites] = useState<DockedSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSite, setNewSite] = useState({ label: '', url: '' });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Default workspace ID - this should be updated to use proper workspace context
  const workspaceId = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    loadDockedSites();
  }, []);

  const loadDockedSites = async () => {
    try {
      const { data, error } = await supabase
        .from('brokerage_dock_sites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDockedSites(data || []);
      if (data && data.length > 0 && !selectedSiteId) {
        setSelectedSiteId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading docked sites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load docked sites',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addDockedSite = async () => {
    if (!newSite.label || !newSite.url) {
      toast({
        title: 'Error',
        description: 'Please provide both label and URL',
        variant: 'destructive',
      });
      return;
    }

    // Add https:// if no protocol specified
    let formattedUrl = newSite.url;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      const { data, error } = await supabase
        .from('brokerage_dock_sites')
        .insert([{ 
          label: newSite.label, 
          url: formattedUrl,
        }])
        .select()
        .single();

      if (error) throw error;

      // Log dock site creation event
      await supabase.from('rec_events').insert([{
        workspace_id: workspaceId,
        event_type: 'dock.site_added',
        severity: 1,
        entity_type: 'dock_site',
        entity_id: data.id,
        summary: `Docked site added: ${newSite.label}`,
        payload_json: { label: newSite.label, url: formattedUrl }
      }]);

      setDockedSites(prev => [data, ...prev]);
      if (!selectedSiteId) {
        setSelectedSiteId(data.id);
      }
      setNewSite({ label: '', url: '' });
      setIsAddModalOpen(false);

      toast({
        title: 'Success',
        description: 'Docked site added successfully',
      });
    } catch (error) {
      console.error('Error adding docked site:', error);
      toast({
        title: 'Error',
        description: 'Failed to add docked site',
        variant: 'destructive',
      });
    }
  };

  const removeDockedSite = async (id: string, label: string) => {
    try {
      const { error } = await supabase
        .from('brokerage_dock_sites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log dock site removal event
      await supabase.from('rec_events').insert([{
        workspace_id: workspaceId,
        event_type: 'dock.site_removed',
        severity: 1,
        entity_type: 'dock_site',
        entity_id: id,
        summary: `Docked site removed: ${label}`,
        payload_json: { label }
      }]);

      setDockedSites(prev => prev.filter(site => site.id !== id));
      if (selectedSiteId === id) {
        const remainingSites = dockedSites.filter(site => site.id !== id);
        setSelectedSiteId(remainingSites.length > 0 ? remainingSites[0].id : '');
      }

      toast({
        title: 'Success',
        description: 'Docked site removed successfully',
      });
    } catch (error) {
      console.error('Error removing docked site:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove docked site',
        variant: 'destructive',
      });
    }
  };

  const openSelectedSite = async (siteId: string) => {
    const site = dockedSites.find(s => s.id === siteId);
    if (site) {
      // Log dock site open event
      await supabase.from('rec_events').insert([{
        workspace_id: workspaceId,
        event_type: 'dock.open',
        severity: 1,
        entity_type: 'dock_site',
        entity_id: site.id,
        summary: `Opened docked site: ${site.label}`,
        payload_json: { label: site.label, url: site.url }
      }]);
    }
    setSelectedSiteId(siteId);
  };

  const selectedSite = dockedSites.find(site => site.id === selectedSiteId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">Loading docked sites...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brokerage Dock</h1>
          <p className="text-muted-foreground">
            Access your external brokerage accounts and trading platforms
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Docked Site
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Docked Site</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="label">Site Label</Label>
                <Input
                  id="label"
                  placeholder="e.g., Alpaca Account"
                  value={newSite.label}
                  onChange={(e) => setNewSite(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="url">Site URL</Label>
                <Input
                  id="url"
                  placeholder="e.g., app.alpaca.markets"
                  value={newSite.url}
                  onChange={(e) => setNewSite(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addDockedSite}>
                  Add Site
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Compliance Banner */}
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Compliance Notice:</strong> Brokerage Dock is for convenience only. 
          StagAlgo does not hold, custody, or manage your funds. You are viewing your external brokerage account.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      {dockedSites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <ExternalLink className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No Docked Sites Yet</h3>
                <p className="text-muted-foreground">
                  Add your first brokerage or trading platform to get started
                </p>
              </div>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Docked Site
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Docked Sites List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Your Docked Sites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dockedSites.map((site) => (
                  <div
                    key={site.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedSiteId === site.id ? 'bg-muted border-primary' : 'border-border'
                    }`}
                    onClick={() => openSelectedSite(site.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{site.label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {new URL(site.url).hostname}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDockedSite(site.id, site.label);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Panel - Selected Site */}
          <div className="lg:col-span-3">
            <Card className="h-[800px]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Select value={selectedSiteId} onValueChange={openSelectedSite}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select a docked site" />
                      </SelectTrigger>
                      <SelectContent>
                        {dockedSites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSite && (
                      <Badge variant="outline" className="text-xs">
                        {new URL(selectedSite.url).hostname}
                      </Badge>
                    )}
                  </div>
                  {selectedSite && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedSite.url, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open in New Tab
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {selectedSite ? (
                  <div className="relative h-[700px] w-full">
                    <iframe
                      src={selectedSite.url}
                      className="w-full h-full border-0 rounded-b-lg"
                      title={selectedSite.label}
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[700px] text-muted-foreground">
                    Select a docked site to view
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}