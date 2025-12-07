import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import { executePlannedAction, fetchTaskStatus, planAction, startOrchestration } from '../../api';
import type { AgentTask } from '../../api';
import { sampleApplications } from '../../data/sampleApplications';
import type { SampleApplication } from '../../data/sampleApplications';

type ChatMessage = {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  actions?: { label: string; action: string }[];
};

const summarizeApplication = (data: any): string => {
  if (!data) return 'No application data.';
  const id = data.id || data._id || data.external_application_id || 'unknown id';
  const customer = data.customer_name || data.applicant_name || data.customer_id || 'unknown customer';
  const status = data.status || 'unknown status';
  const loan =
    data.loan_amount ||
    data.loan_application?.requested_amount ||
    data.loan_application?.loan_amount ||
    data.loan_application?.amount;
  const purpose =
    data.loan_purpose || data.loan_application?.loan_purpose || data.loan_application?.purpose;
  const created = data.created_at || data.loan_application?.created_at;
  const docs = Array.isArray(data.documents) ? data.documents.length : 0;
  const docTypes = Array.isArray(data.documents)
    ? Array.from(new Set(data.documents.map((d: any) => d.document_type || 'UNKNOWN'))).join(', ')
    : 'n/a';
  return [
    `Application ${id} (${status}) for ${customer}`,
    loan ? `Amount: ${loan}` : null,
    purpose ? `Purpose: ${purpose}` : null,
    created ? `Created: ${created}` : null,
    `Documents: ${docs}${docTypes ? ` (types: ${docTypes})` : ''}`,
  ]
    .filter(Boolean)
    .join('\n');
};

const summarizeOrchestrator = (data: any): string => {
  if (!data) return 'No orchestration result.';
  const appId = data.application_id || 'unknown application';
  const status = data.processing_status || data.status || 'unknown status';
  const decision = data.final_decision || 'NO_DECISION';
  const method = data.decision_method ? ` via ${data.decision_method}` : '';
  const reason = data.routing_reason || data.reason || '';
  const risk = data.rejection_details?.risk_level || data.risk_level;
  const completeness = data.rejection_details?.completeness_score;
  const fraudIndicators = data.rejection_details?.fraud_indicators || [];
  const consistency = data.rejection_details?.consistency_issues || [];

  const lines: string[] = [];
  lines.push(`Application ${appId}: ${decision} (${status}${method})`);
  if (reason) lines.push(`Reason: ${reason}`);
  if (risk) lines.push(`Risk level: ${risk}`);
  if (typeof completeness === 'number') {
    lines.push(`Completeness score: ${completeness.toFixed(2)}`);
  }
  if (fraudIndicators.length) {
    lines.push(`Fraud indicators: ${fraudIndicators.join(', ')}`);
  }
  if (Array.isArray(consistency) && consistency.length) {
    consistency.forEach((issue: any) => {
      const doc = issue.document || 'document';
      const missing = issue.missing_fields;
      if (Array.isArray(missing) && missing.length) {
        lines.push(`Missing in ${doc}: ${missing.join(', ')}`);
      }
    });
  }
  return lines.join('\n');
};

const formatTaskResult = (task: AgentTask): string => {
  const { action, result } = task;
  if (!result) return 'Result not available yet.';

  if (action === 'chat') {
    return result.reply || JSON.stringify(result, null, 2);
  }

  if (action === 'mongo_get_latest_application' || action === 'mongo_get_application') {
    return summarizeApplication(result);
  }

  if (action === 'run_orchestrator') {
    return summarizeOrchestrator(result);
  }

  if (action === 'mongo_get_documents') {
    return `Documents fetched:\n${JSON.stringify(result, null, 2)}`;
  }

  if (action === 'mongo_search_applications') {
    const count = Array.isArray(result.results) ? result.results.length : 0;
    return `Found ${count} applications (limit ${result.limit ?? 'n/a'}):\n${JSON.stringify(result.results, null, 2)}`;
  }

  if (action === 'analytics_loans_count') {
    return `Loan count from ${result.from} to ${result.to}: ${result.count ?? result.total ?? 'n/a'}`;
  }

  if (action === 'analytics_status_counts') {
    return `Loan status counts ${result.from} → ${result.to}:\n${JSON.stringify(result.counts, null, 2)}`;
  }

  if (action === 'analytics_loans_trend') {
    return `Loan trend ${result.from} → ${result.to}:\n${JSON.stringify(result.series, null, 2)}`;
  }

  return JSON.stringify(result, null, 2);
};

const buildPayload = (app: SampleApplication) => ({
  loan_application: {
    id: app.id,
    applicant_name: app.applicantName,
    requested_amount: app.requestedAmount,
    product_type: app.productType,
    term_months: app.termMonths,
    purpose: app.purpose,
    channel: app.channel,
    financial_profile: {
      other_monthly_debt_payments: Math.round(app.requestedAmount * 0.02),
    },
    employment_details: {
      stated_gross_monthly_income: app.incomeNetMonthly,
    },
  },
  id_document: {
    id_number: app.id,
    name: app.applicantName,
  },
  bank_statement: {
    summary: app.summary,
    credit_score: app.creditScore,
    dti: app.dti,
  },
  payslip: {
    monthly_income: app.incomeNetMonthly,
  },
  credit_score: app.creditScore,
});

const statusColor: Record<AgentTask['status'], 'default' | 'success' | 'error' | 'warning'> = {
  queued: 'warning',
  running: 'warning',
  completed: 'success',
  failed: 'error',
};

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    sender: 'assistant',
    text: 'I’m your staff copilot. I can orchestrate AI-agent processes, fetch loan data from MongoDB (read-only), and keep you updated.',
    actions: [
      { label: 'Run loan orchestration', action: 'run_orchestrator' },
      { label: 'Check task status', action: 'check_status' },
      { label: 'Fetch application data', action: 'mongo_get_application' },
      { label: 'Fetch documents', action: 'mongo_get_documents' },
      { label: 'Search applications', action: 'mongo_search_applications' },
    ],
  },
];

const StaffCopilot = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [tasks, setTasks] = useState<Record<string, AgentTask>>({});
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [notifiedResults, setNotifiedResults] = useState<Record<string, boolean>>({});
  const [selectedApplicationId, setSelectedApplicationId] = useState(sampleApplications[0]?.id ?? '');

  const selectedApplication = useMemo(
    () => sampleApplications.find((app) => app.id === selectedApplicationId) ?? sampleApplications[0],
    [selectedApplicationId],
  );

  const activeTask = activeTaskId ? tasks[activeTaskId] : undefined;

  const openTasks = useMemo(
    () => Object.values(tasks).filter((task) => task.status === 'queued' || task.status === 'running'),
    [tasks],
  );

  useEffect(() => {
    if (!openTasks.length) return undefined;
    const interval = setInterval(async () => {
      const updates = await Promise.all(
        openTasks.map(async (task) => {
          const data = await fetchTaskStatus(task.id);
          return [task.id, data] as const;
        }),
      );
      setTasks((prev) => {
        const next = { ...prev };
        updates.forEach(([id, data]) => {
          next[id] = data;
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [openTasks]);

  const appendMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  };

  useEffect(() => {
    // Surface completed task results into the chat once.
    Object.values(tasks).forEach((task) => {
      if (task.status === 'completed' && task.result && !notifiedResults[task.id]) {
        appendMessage({
          id: `result-${task.id}`,
          sender: 'assistant',
          text: `AI response (${task.description}):\n${formatTaskResult(task)}`,
        });
        setNotifiedResults((prev) => ({ ...prev, [task.id]: true }));
      }
    });
  }, [tasks, notifiedResults]);

  const handleSend = async () => {
    if (isSending) return;
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    appendMessage({ id: `user-${Date.now()}`, sender: 'user', text });
    setIsSending(true);
    try {
      const activeApp = selectedApplication ?? sampleApplications[0];
      const sharedParams: Record<string, any> = {
        application_id: activeApp?.id,
        payload: activeApp ? buildPayload(activeApp) : undefined,
        context: {
          workspace: 'loan-processing',
          application_id: activeApp?.id,
          applicant_name: activeApp?.applicantName,
        },
      };

      const plan = await planAction(text, {
        ...sharedParams,
      } as any);

      if (!plan.safe || !plan.action) {
        appendMessage({
          id: `plan-${Date.now()}`,
          sender: 'assistant',
          text: `AI response: cannot run this request.\n${plan.guidance}\nSteps:\n- ${plan.steps.join('\n- ')}`,
        });
        return;
      }

      const actionAck: Record<string, string> = {
        mongo_get_latest_application: 'Fetching the latest application and summarizing it for you...',
        mongo_get_application: 'Fetching that application and summarizing it for you...',
        mongo_get_documents: 'Fetching the documents you asked for...',
        mongo_search_applications: 'Searching applications with your filters...',
        analytics_loans_count: 'Running loan count analytics...',
        analytics_status_counts: 'Aggregating loans by status...',
        analytics_loans_trend: 'Building the loan trend...',
        run_orchestrator: 'Starting the orchestrator...',
        chat: 'Generating a response...',
      };

      appendMessage({
        id: `ack-${Date.now()}`,
        sender: 'assistant',
        text: actionAck[plan.action] || 'Working on it...',
      });

      const exec = await executePlannedAction(text, {
        ...sharedParams,
      } as any);

      const execTask = exec.task;

      if (execTask) {
        if (execTask.status === 'completed' && execTask.result) {
          // Instant result (e.g., chat) – present immediately.
          setTasks((prev) => ({ ...prev, [execTask.id]: execTask }));
          setNotifiedResults((prev) => ({ ...prev, [execTask.id]: true }));
          appendMessage({
            id: `result-${execTask.id}`,
            sender: 'assistant',
            text: `AI response (${execTask.description}):\n${formatTaskResult(execTask)}`,
          });
          return;
        }
        startTask(execTask);
        return;
      }

      if (exec.status === 'blocked') {
        appendMessage({
          id: `blocked-${Date.now()}`,
          sender: 'assistant',
          text: 'Request was blocked by safety rules.',
        });
        return;
      }

      // Fallback for direct results without task wrapper
      if ((exec as any).result) {
        appendMessage({
          id: `result-${Date.now()}`,
          sender: 'assistant',
          text: `AI response:\n${JSON.stringify((exec as any).result, null, 2)}`,
        });
      }
    } catch (error) {
      appendMessage({
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: 'Chat service unavailable. Please try again.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const startTask = (task: AgentTask) => {
    setTasks((prev) => ({ ...prev, [task.id]: task }));
    setActiveTaskId(task.id);
    appendMessage({
      id: `task-${task.id}`,
      sender: 'assistant',
      text: `AI started: ${task.description}`,
    });
  };

  const handleQuickAction = async (action: string) => {
    if (action === 'run_orchestrator') {
      await handleRunOrchestrator();
      return;
    }
    if (action === 'check_status') {
      if (activeTaskId) {
        const data = await fetchTaskStatus(activeTaskId);
        setTasks((prev) => ({ ...prev, [activeTaskId]: data }));
        appendMessage({
          id: `status-${Date.now()}`,
          sender: 'assistant',
          text: `AI response: latest status for ${activeTaskId} is ${data.status}`,
        });
      } else {
        appendMessage({
          id: `status-${Date.now()}`,
          sender: 'assistant',
          text: 'AI response: no active task to refresh.',
        });
      }
      return;
    }
    appendMessage({
      id: `action-${Date.now()}`,
      sender: 'assistant',
      text: 'AI response: this quick action is not yet wired. Use the chat box to request it.',
    });
  };

  const handleRunOrchestrator = async (app?: SampleApplication) => {
    const targetApp = app ?? selectedApplication ?? sampleApplications[0];
    if (!targetApp) {
      appendMessage({
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: 'No application selected to run the orchestrator.',
      });
      return;
    }
    setSelectedApplicationId(targetApp.id);
    setIsRunningAction(true);
    try {
      const payload = buildPayload(targetApp);
      const task = await startOrchestration(targetApp.id, payload);
      startTask(task);
    } catch (error) {
      appendMessage({
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: 'Could not start orchestrator. Please check backend connectivity.',
      });
    } finally {
      setIsRunningAction(false);
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.sender === 'user';
    return (
      <Stack
        key={msg.id}
        direction="row"
        gap={1}
        alignItems="flex-start"
        sx={{ maxWidth: '100%' }}
        justifyContent={isUser ? 'flex-end' : 'flex-start'}
      >
        {!isUser && (
          <Avatar sx={{ bgcolor: '#0f172a', width: 28, height: 28, fontSize: 13 }}>
            AI
          </Avatar>
        )}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            bgcolor: isUser ? '#dbeafe' : '#0f172a',
            color: isUser ? '#0f172a' : '#e2e8f0',
            border: '1px solid',
            borderColor: isUser ? '#bfdbfe' : '#1e293b',
            maxWidth: '82%',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {msg.text}
          </Typography>
          {msg.actions && (
            <Stack direction="row" gap={1} mt={1} flexWrap="wrap">
              {msg.actions.map((action) => (
                <Chip
                  key={action.label}
                  label={action.label}
                  size="small"
                  color="primary"
                  clickable
                  onClick={() => handleQuickAction(action.action)}
                  disabled={isRunningAction || isSending}
                />
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>
    );
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, p: 2, height: 'calc(100vh - 64px)', bgcolor: '#0b1021' }}>
      <Paper sx={{ width: 320, p: 2, bgcolor: '#0f172a', color: '#e2e8f0', borderColor: '#1f2937' }}>
        <Typography variant="h6" mb={1}>
          Staff Copilot
        </Typography>
        <Typography variant="body2" color="#9ca3af" mb={2}>
          System-aware assistant for AI-agent processes and task tracking.
        </Typography>
        <Stack direction="column" gap={1}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PlayArrowIcon />}
            onClick={() => handleRunOrchestrator()}
            disabled={isRunningAction}
            fullWidth
          >
            Run demo orchestration
          </Button>
        </Stack>

        <Divider sx={{ my: 2, borderColor: '#1e293b' }} />

        <Typography variant="subtitle2" gutterBottom color="#cbd5e1">
          Sample applications
        </Typography>
        <List dense sx={{ bgcolor: 'transparent', color: '#e2e8f0' }}>
          {sampleApplications.map((app) => (
            <ListItem
              key={app.id}
              onClick={() => setSelectedApplicationId(app.id)}
              secondaryAction={
                <Tooltip title="Run orchestrator">
                  <span>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunOrchestrator(app);
                      }}
                      disabled={isRunningAction}
                      size="small"
                      sx={{ color: '#c084fc' }}
                    >
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              }
              sx={{
                border: '1px solid',
                borderColor: app.id === selectedApplicationId ? '#334155' : '#1e293b',
                mb: 1,
                borderRadius: 1.5,
                bgcolor: app.id === selectedApplicationId ? '#0b162d' : 'transparent',
                cursor: 'pointer',
                '&:hover': { borderColor: '#334155', bgcolor: '#0b162d' },
                transition: 'all 0.15s ease',
              }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor: '#111827',
                    color: '#e2e8f0',
                    fontSize: 12,
                    border: app.id === selectedApplicationId ? '1px solid #c084fc' : '1px solid #111827',
                  }}
                >
                  {app.applicantName[0]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primaryTypographyProps={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}
                secondaryTypographyProps={{ color: '#94a3b8', fontSize: 12 }}
                primary={app.applicantName}
                secondary={`${app.id} • ${app.statusLabel}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#0f172a',
          color: '#e2e8f0',
          borderColor: '#1f2937',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #1e293b' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" color="#e2e8f0">
                Agent workspace
              </Typography>
              <Typography variant="body2" color="#94a3b8">
                {selectedApplication
                  ? `Working on ${selectedApplication.applicantName} (${selectedApplication.id})`
                  : 'Chat with the AI copilot to execute agent processes and fetch Mongo-backed data.'}
              </Typography>
            </Box>
            <Stack direction="row" gap={1}>
              {selectedApplication && (
                <>
                  <Chip
                    label={selectedApplication.statusLabel}
                    size="small"
                    color="secondary"
                    sx={{ bgcolor: '#1e293b', color: '#e2e8f0', borderColor: '#334155', borderStyle: 'solid' }}
                    variant="outlined"
                  />
                  <Chip
                    label={selectedApplication.id}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ bgcolor: '#111827', color: '#e2e8f0', borderColor: '#334155' }}
                  />
                </>
              )}
              <Chip label="System context" size="small" color="primary" />
              <Chip label="Processes" size="small" color="secondary" />
              <Chip label="Agents" size="small" color="info" />
            </Stack>
          </Stack>
        </Box>

        {selectedApplication && (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: '1px solid #1e293b',
              bgcolor: '#0b162d',
            }}
          >
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
              <Chip label={`Product: ${selectedApplication.productType}`} size="small" sx={{ bgcolor: '#111827', color: '#e2e8f0' }} />
              <Chip
                label={`Amount: $${selectedApplication.requestedAmount.toLocaleString()}`}
                size="small"
                sx={{ bgcolor: '#111827', color: '#e2e8f0' }}
              />
              <Chip label={`Term: ${selectedApplication.termMonths}m`} size="small" sx={{ bgcolor: '#111827', color: '#e2e8f0' }} />
              <Chip label={`Purpose: ${selectedApplication.purpose}`} size="small" sx={{ bgcolor: '#111827', color: '#e2e8f0' }} />
            </Stack>
            <Typography variant="body2" color="#94a3b8" mt={1}>
              {selectedApplication.summary}
            </Typography>
          </Box>
        )}

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {messages.map(renderMessage)}
        </Box>

        <Divider sx={{ borderColor: '#1e293b' }} />

        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <TextField
              variant="outlined"
              placeholder="Ask about processes or request an action..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              fullWidth
              size="small"
              InputProps={{
                sx: {
                  bgcolor: '#111827',
                  color: '#e2e8f0',
                  borderColor: '#1e293b',
                  '& fieldset': { borderColor: '#1e293b' },
                  '&:hover fieldset': { borderColor: '#334155' },
                },
              }}
            />
            <IconButton color="primary" onClick={handleSend} disabled={isSending}>
              <SendIcon />
            </IconButton>
          </Stack>
        </Box>

        {activeTask && (
          <>
            <Divider sx={{ borderColor: '#1e293b' }} />
            <Box sx={{ p: 2, bgcolor: '#0b162d' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" color="#cbd5e1">
                  Active task • {activeTask.description}
                </Typography>
                <Chip
                  label={activeTask.status}
                  size="small"
                  color={statusColor[activeTask.status]}
                  variant="filled"
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.round((activeTask.progress || 0) * 100)}
                sx={{ height: 8, borderRadius: 8, bgcolor: '#0f172a', '& .MuiLinearProgress-bar': { bgcolor: '#38bdf8' } }}
              />
              <Stack direction="row" gap={1} alignItems="center" mt={1}>
                <Typography variant="body2" color="#94a3b8">
                  Updated: {new Date(activeTask.updated_at).toLocaleTimeString()}
                </Typography>
                <Tooltip title="Refresh status">
                  <IconButton
                    size="small"
                    onClick={async () => {
                      const data = await fetchTaskStatus(activeTask.id);
                      setTasks((prev) => ({ ...prev, [activeTask.id]: data }));
                    }}
                    sx={{ color: '#c084fc' }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              {activeTask.error && (
                <Typography variant="body2" color="#fca5a5" mt={1}>
                  Error: {activeTask.error}
                </Typography>
              )}
              {activeTask.result && (
                <Typography variant="body2" color="#a5f3fc" mt={1}>
                  Result ready – check details in agent logs.
                </Typography>
              )}
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default StaffCopilot;
