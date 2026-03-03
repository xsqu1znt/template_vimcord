import { Loop } from "qznt";

export abstract class _BaseLoopJob {
    protected loop: Loop | null = null;
    private static instances = new Map<any, any>();

    static getInstance<T extends _BaseLoopJob>(this: new (...args: any[]) => T): T {
        let instance = _BaseLoopJob.instances.get(this);
        if (!instance) {
            instance = new this();
        }
        return instance as T;
    }

    constructor(
        private interval: number,
        private immediate?: boolean
    ) {
        _BaseLoopJob.instances.set(this.constructor, this);
        this.start();
    }

    abstract execute(): Promise<any>;

    async start(): Promise<void> {
        if (this.loop) {
            this.loop.start();
            return;
        }

        this.loop = new Loop(() => this.execute(), this.interval, this.immediate ?? false);
    }

    stop(): void {
        this.loop?.stop();
    }
}
