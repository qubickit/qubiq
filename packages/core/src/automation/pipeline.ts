import type { AutomationLogger, AutomationPipelineOptions, AutomationTaskConfig } from "./types";
import { createAutomationLogger } from "./types";

interface TaskState {
  config: AutomationTaskConfig;
  timer?: ReturnType<typeof setInterval>;
  running: boolean;
}

export class AutomationPipeline {
  private readonly logger: AutomationLogger;
  private readonly tasks: TaskState[] = [];
  private abortController: AbortController | null = null;
  private started = false;

  constructor(options: AutomationPipelineOptions = {}) {
    this.logger = createAutomationLogger(options.logger);
  }

  addTask(config: AutomationTaskConfig) {
    this.tasks.push({
      config,
      running: false,
    });
  }

  async start() {
    if (this.started) {
      return;
    }
    this.started = true;
    this.abortController = new AbortController();

    for (const task of this.tasks) {
      if (task.config.runOnStart) {
        void this.executeTask(task);
      }
      task.timer = setInterval(() => {
        void this.executeTask(task);
      }, task.config.intervalMs);
    }
  }

  async stop() {
    if (!this.started) {
      return;
    }
    this.started = false;
    this.abortController?.abort();
    for (const task of this.tasks) {
      if (task.timer) {
        clearInterval(task.timer);
        task.timer = undefined;
      }
    }
  }

  private async executeTask(task: TaskState) {
    if (task.running || !this.abortController) {
      return;
    }
    task.running = true;
    const context = {
      signal: this.abortController.signal,
      logger: this.logger,
      metadata: task.config.metadata,
    };

    try {
      await task.config.job(context);
    } catch (error) {
      this.logger.error(`automation task "${task.config.name}" failed`, error);
    } finally {
      task.running = false;
    }
  }
}
