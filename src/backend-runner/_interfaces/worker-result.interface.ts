import { BackendResultInterface } from "./backend-result.interface";

export interface WorkerResultInterface {
    jobId: string;
    status: number;
    data: WorkerResultInfoInterface;
}

export interface WorkerResultInfoInterface {
    [backendName: string]: Partial<BackendResultInterface>;
}