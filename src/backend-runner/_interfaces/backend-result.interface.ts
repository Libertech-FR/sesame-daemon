export interface BackendResultInterface {
  backend: string;
  status: number;
  message?: string;
  output?: BackendResultInfoInterface;
  error?: BackendResultInfoInterface;
}

export interface BackendResultInfoInterface {
  status: number;
  message?: string;
  data?: object;
}
