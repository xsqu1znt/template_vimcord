import { schedule, ScheduledTask } from "node-cron";

export abstract class _BaseCronJob {
    protected task: ScheduledTask | null = null;
    private static instances = new Map<any, any>();

    static getInstance<T extends _BaseCronJob>(this: new (...args: any[]) => T): T {
        let instance = _BaseCronJob.instances.get(this);

        if (!instance) {
            instance = new this();
        }

        return instance as T;
    }

    constructor(
        private interval: string,
        private immediate?: boolean
    ) {
        _BaseCronJob.instances.set(this.constructor, this);
        this.start();
    }

    abstract execute(): Promise<any>;

    async start(): Promise<void> {
        if (this.task) {
            this.task.start();
            return;
        }

        this.task = schedule(this.interval, () => this.execute(), { noOverlap: true });

        // Run immediately
        if (this.immediate) {
            await this.execute();
        }
    }

    stop(): void {
        this.task?.stop();
    }
}
