/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Worker object responsible for managing FSQ-related tasks
 */
'use strict';

import EventEmitter from "events";

/** Task IDs are unique across all workers */
var nextTaskId = 1;

class FileWorkerTask {
    constructor(task: Function, id: number) {
        this.task = task;
        this.id = id;
    }

    private active: boolean = false;

    private completed: boolean = false;

    private task: Function;

    private id: number;

    isActive() { return this.active === true }

    isComplete() { return this.completed === true }

    async run(): Promise<any> {
        try {
            this.active = true;
            return await this.task();
        }
        catch (err) {

        }
        finally {
            this.completed = true;
            this.active = false;
        }
    }

    get taskId() { return this.id }
}

export class FileWorkerImpl extends EventEmitter {
    constructor(concurrency: number = Number.MAX_SAFE_INTEGER) {
        super();

        this.maxConcurrency = concurrency;
    }

    private readonly activeTasks: FileWorkerTask[] = [];

    private maxConcurrency: number = Number.MAX_SAFE_INTEGER;

    private readonly taskList: FileWorkerTask[] = [];

    enqueue(task: Function): this {
        const newTask: FileWorkerTask = new FileWorkerTask(task, nextTaskId++);
        this.emit('task.created', newTask);
        this.taskList.push(newTask);
        return this.runTasks();
    }

    private runTasks(): this {
        while (this.activeTasks.length < this.maxConcurrency) {
            const task = this.taskList.shift();

            if (!task)
                break;

            const activeCount = this.activeTasks.push(task);
            const taskCallback = async () => {
                this.emit('task.started', task);
                await task.run();
                const index = this.activeTasks.findIndex(t => t === task);
                this.activeTasks.splice(index, 1);

                this.emit('task.completed', task);

                if (this.activeTasks.length === 0)
                    this.emit('worker.done');
                else
                    this.runTasks();
            };

            if (typeof setImmediate === 'function')
                setImmediate(taskCallback);
            else
                setTimeout(taskCallback, 0);
            if (activeCount >= this.maxConcurrency) break;
        }
        return this;
    }

    /** Set a limit on concurrency */
    setMaxConcurrency(concurrency: number = Number.MAX_SAFE_INTEGER): this {
        if (concurrency > 0)
            this.maxConcurrency = concurrency;
        return this;
    }
}

const FileWorker: FileWorkerImpl = new FileWorkerImpl();
export default FileWorker;
