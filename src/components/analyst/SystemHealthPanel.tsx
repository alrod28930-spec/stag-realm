import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SystemHealthPanel() {
  const [events, setEvents] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get recent repository events
      const { data: eventsData } = await supabase
        .from("repository_events")
        .select("*")
        .order("ts", { ascending: false })
        .limit(100);

      // Get learning jobs
      const { data: jobsData } = await supabase
        .from("learning_jobs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);

      setEvents(eventsData || []);
      setJobs(jobsData || []);
    } catch (err) {
      console.error("Health data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getJobStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      queued: "secondary",
      running: "default",
      done: "default",
      error: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const sourceColors: Record<string, string> = {
    analyst: "text-blue-500",
    oracle: "text-purple-500",
    bid: "text-green-500",
    broker: "text-orange-500",
    edge_error: "text-red-500",
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Learning Jobs</CardTitle>
          <CardDescription>Background learning and optimization tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <div>
                    <div className="font-medium text-sm">{job.job_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(job.started_at || job.created_at).toLocaleString()}
                    </div>
                  </div>
                  {getJobStatusBadge(job.status)}
                </div>
              ))}
              {jobs.length === 0 && <div className="text-sm text-muted-foreground">No jobs yet</div>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Events</CardTitle>
          <CardDescription>Recent repository events (last 100)</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="p-2 bg-muted rounded">
                  <div className="flex justify-between items-start">
                    <span className={`font-medium text-sm ${sourceColors[event.source] || ""}`}>
                      {event.source}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.ts).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {JSON.stringify(event.payload).substring(0, 60)}...
                  </div>
                </div>
              ))}
              {events.length === 0 && <div className="text-sm text-muted-foreground">No events yet</div>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
