/**
 * In-Memory Job Queue
 *
 * Tracks processing jobs with status, progress, and auto-cleanup.
 * For Phase 1, this is a simple in-memory implementation.
 * Can be replaced with BullMQ + Redis in production.
 */

import { generateId } from '@uft/shared';
import type { Job, JobStatus, FileInfo } from '@uft/shared';

const DEFAULT_JOB_TTL = 60 * 60 * 1000; // 1 hour

export class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private listeners: Map<string, Set<(job: Job) => void>> = new Map();

  createJob(toolId: string, inputFiles: FileInfo[], parameters: Record<string, unknown> = {}): Job {
    const job: Job = {
      id: generateId(),
      toolId,
      status: 'pending',
      progress: 0,
      message: 'Waiting to start...',
      createdAt: Date.now(),
      inputFiles,
      outputFiles: [],
      parameters,
    };

    this.jobs.set(job.id, job);
    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<Job>): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    Object.assign(job, updates);
    this.notifyListeners(id, job);
    return job;
  }

  startJob(id: string): Job | undefined {
    return this.updateJob(id, {
      status: 'processing',
      startedAt: Date.now(),
      progress: 0,
      message: 'Processing...',
    });
  }

  completeJob(id: string, outputFiles: FileInfo[], metadata?: Record<string, unknown>): Job | undefined {
    return this.updateJob(id, {
      status: 'completed',
      completedAt: Date.now(),
      progress: 100,
      message: 'Completed successfully',
      outputFiles,
    });
  }

  failJob(id: string, error: string): Job | undefined {
    return this.updateJob(id, {
      status: 'failed',
      completedAt: Date.now(),
      error,
      message: `Failed: ${error}`,
    });
  }

  cancelJob(id: string): Job | undefined {
    return this.updateJob(id, {
      status: 'cancelled',
      completedAt: Date.now(),
      message: 'Cancelled by user',
    });
  }

  updateProgress(id: string, progress: number, message: string): void {
    this.updateJob(id, { progress, message });
  }

  subscribe(jobId: string, listener: (job: Job) => void): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(listener);

    return () => {
      this.listeners.get(jobId)?.delete(listener);
    };
  }

  private notifyListeners(jobId: string, job: Job): void {
    this.listeners.get(jobId)?.forEach(listener => {
      try {
        listener(job);
      } catch {
        // Ignore listener errors
      }
    });
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getRecentJobs(limit: number = 50): Job[] {
    return this.getAllJobs().slice(0, limit);
  }

  cleanup(maxAge: number = DEFAULT_JOB_TTL): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, job] of this.jobs) {
      if (now - job.createdAt > maxAge && (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')) {
        this.jobs.delete(id);
        this.listeners.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}
