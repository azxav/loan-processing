import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export type TaskMessage = {
  ts?: string;
  step?: string;
  status?: string;
  text?: string;
  progress?: number;
};

export type AgentTask = {
  id: string;
  action: string;
  description: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  messages: TaskMessage[];
  result?: any;
  error?: string;
  status_map?: Record<string, 'pending' | 'in-progress' | 'completed'>;
  active_step?: string | null;
  decision?: string | null;
  created_at: string;
  updated_at: string;
};

export interface ChatResponse {
  reply: string;
  actions: { label: string; action: string }[];
  context_echo?: Record<string, any>;
  prompt: string;
}

export type PlanResult = {
  safe: boolean;
  action: string | null | undefined;
  steps: string[];
  params: Record<string, any>;
  guidance: string;
};

export type ExecuteResult = {
  status: 'blocked' | 'queued' | 'completed';
  plan: PlanResult;
  task?: AgentTask;
  result?: any;
};

export type LoanAnalytics = {
  from: string;
  to: string;
  total: number;
  status_counts: Record<string, number>;
  trend: { day: string; count: number }[];
};

export const sendAgentChat = async (prompt: string, context?: Record<string, any>): Promise<ChatResponse> => {
  const { data } = await api.post('/agent/chat', { prompt, context });
  return data;
};

export const startOrchestration = async (applicationId: string, payload: Record<string, any>): Promise<AgentTask> => {
  const { data } = await api.post('/agent/actions', {
    action: 'run_orchestrator',
    application_id: applicationId,
    payload,
  });
  return data;
};

export const runScript = async (scriptName: string, params?: Record<string, any>): Promise<AgentTask> => {
  const { data } = await api.post('/agent/actions', {
    action: 'run_script',
    script_name: scriptName,
    params: params || {},
  });
  return data;
};

export const fetchTaskStatus = async (taskId: string): Promise<AgentTask> => {
  const { data } = await api.get(`/agent/actions/${taskId}`);
  return data;
};

export const planAction = async (prompt: string, params?: Record<string, any>): Promise<PlanResult> => {
  const { data } = await api.post('/agent/plan', { prompt, params });
  return data;
};

export const executePlannedAction = async (prompt: string, params?: Record<string, any>): Promise<ExecuteResult> => {
  const { data } = await api.post('/agent/execute', { prompt, params });
  return data;
};

export const fetchLoanAnalytics = async (from?: string, to?: string): Promise<LoanAnalytics> => {
  const query = new URLSearchParams();
  if (from) query.set('from_dt', from);
  if (to) query.set('to_dt', to);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const { data } = await api.get(`/analytics/loan-requests${suffix}`);
  return data;
};

export default api;
