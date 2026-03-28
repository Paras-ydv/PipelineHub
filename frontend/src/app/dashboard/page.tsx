'use client';
import { useEffect, useState } from 'react';
import { usePipelineStore } from '@/store/pipeline.store';
import { jobsApi, workersApi, queueApi, demoApi } from '@/lib/api';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { JobsTable } from '@/components/dashboard/JobsTable';
import { WorkerGrid } from '@/components/dashboard/WorkerGrid';
import { EventStream } from '@/components/dashboard/EventStream';
import { QueueChart } from '@/components/dashboard/QueueChart';
import { DemoToggle } from '@/components/dashboard/DemoToggle';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { setJobs, setWorkers, setQueueMetrics, setStats } = usePipelineStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [jobs, workers, queueMetrics, stats]: any[] = await Promise.all([
          jobsApi.list({ limit: 20 }),
          workersApi.list(),
          queueApi.metrics(),
          jobsApi.stats(),
        ]);
        setJobs(jobs);
        setWorkers(workers);
        setQueueMetrics(queueMetrics);
        setStats(stats);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [setJobs, setWorkers, setQueueMetrics, setStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time CI/CD pipeline overview</p>
        </div>
        <DemoToggle />
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <JobsTable />
        </div>
        <div className="space-y-6">
          <EventStream />
          <QueueChart />
        </div>
      </div>

      <WorkerGrid />
    </div>
  );
}
