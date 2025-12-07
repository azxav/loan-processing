import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  CircularProgress,
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
import { fetchTaskStatus, sendCopilotChat, startOrchestration } from '../../api';
import type { AgentTask, CopilotToolResult } from '../../api';
import { sampleApplications } from '../../data/sampleApplications';
import type { SampleApplication } from '../../data/sampleApplications';

type ChatMessage = {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  actions?: { label: string; action: string }[];
  toolResults?: CopilotToolResult[];
  usedTools?: { name: string; args: Record<string, any> }[];
};

const formatTaskLogLine = (msg: any): string => {
  const stepLabel = msg.step ? msg.step.replace(/-/g, ' ') : msg.status || 'update';
  const text = msg.text ?? msg.status ?? 'working';
  return `${stepLabel}: ${text}`;
};

type WorkspaceState = {
  messages: ChatMessage[];
  sessionId?: string;
  tasks: Record<string, AgentTask>;
  activeTaskId: string | null;
  notifiedResults: Record<string, boolean>;
  taskMessageCursor: Record<string, number>;
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

const formatToolResult = (tool: CopilotToolResult): string => {
  const { name, result } = tool;
  if (!result) return `${name}: no result`;

  if (name === 'search_loans_with_filters') {
    const items = Array.isArray(result.results) ? result.results.slice(0, 5) : [];
    const header = `Found ${result.count ?? items.length} applications (showing up to ${items.length}).`;
    const list = items
      .map((app: any) => {
        const id = app.id || app._id;
        const status = app.status || 'UNKNOWN';
        const amt = app.loan_amount ? `$${app.loan_amount}` : 'n/a';
        return `- ${id} • ${status} • ${amt}`;
      })
      .join('\n');
    return [header, list].filter(Boolean).join('\n');
  }

  if (name === 'get_application_summary') {
    if (!result.found) return 'Application not found.';
    const s = result.summary || {};
    return [
      `Application ${s.id} (${s.status || 'UNKNOWN'})`,
      s.loan_amount ? `Amount: ${s.loan_amount}` : null,
      s.loan_purpose ? `Purpose: ${s.loan_purpose}` : null,
      s.loan_term_months ? `Term: ${s.loan_term_months} months` : null,
      `Documents: ${s.document_count ?? 0}${s.document_types ? ` (${s.document_types.join(', ')})` : ''}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (name === 'get_analytics_report') {
    const counts = result.status_counts || {};
    const lines = [`Range ${result.range?.from} → ${result.range?.to}`, `Total: ${result.total ?? 'n/a'}`];
    if (counts && Object.keys(counts).length) {
      lines.push(
        'By status:',
        ...Object.entries(counts).map(([k, v]) => `- ${k}: ${v}`),
      );
    }
    const trend = Array.isArray(result.trend) ? result.trend.slice(0, 5) : [];
    if (trend.length) {
      lines.push('Trend (first 5):', ...trend.map((t: any) => `- ${t.bucket ?? t.day}: ${t.count}`));
    }
    return lines.join('\n');
  }

  if (name === 'compare_applications') {
    const items = Array.isArray(result.results) ? result.results : [];
    const lines = items.map((item: any) =>
      item.found
        ? `- ${item.application_id}: ${item.status || 'UNKNOWN'} • $${item.loan_amount ?? 'n/a'} • docs ${item.document_count ?? 0}`
        : `- ${item.application_id}: not found`,
    );
    return `Comparison (${items.length}):\n${lines.join('\n')}`;
  }

  if (name === 'update_application_status') {
    if (!result.updated) return `Status update failed: ${result.reason || 'Unknown reason'}`;
    const app = result.application || {};
    return `Status updated to ${app.status} (application ${app.id || app._id})`;
  }

  if (name === 'add_application_note') {
    if (!result.updated) return `Note not added: ${result.reason || 'Unknown reason'}`;
    return 'Note added successfully.';
  }

  if (name === 'assign_reviewer') {
    if (!result.updated) return `Assignment failed: ${result.reason || 'Unknown reason'}`;
    const app = result.application || {};
    return `Assigned to ${app.assigned_reviewer || 'reviewer'} (priority ${app.review_priority || 'n/a'})`;
  }

  if (name === 'get_document_analysis') {
    const counts = result.document_type_counts || {};
    const lines = Object.entries(counts).map(([k, v]) => `- ${k}: ${v}`);
    return [`Documents fetched (${result.documents?.length ?? 0})`, ...lines].join('\n');
  }

  if (name === 'trigger_re_evaluation') {
    if (!result.ready) return `Re-evaluation not prepared: ${result.reason || 'Unknown reason'}`;
    return 'Payload prepared for re-evaluation. You can run the orchestrator with this payload.';
  }

  return `${name}:\n${JSON.stringify(result, null, 2)}`;
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
    text: 'I’m your staff copilot. I use tools to query MongoDB, run analytics, summarize applications, and kick off orchestrations. Ask for reports or specific applications.',
    actions: [
      { label: 'Run loan orchestration', action: 'run_orchestrator' },
      { label: 'Check task status', action: 'check_status' },
      { label: 'Fetch application data', action: 'mongo_get_application' },
      { label: 'Fetch documents', action: 'mongo_get_documents' },
      { label: 'Search applications', action: 'mongo_search_applications' },
    ],
  },
];

const createWorkspaceState = (): WorkspaceState => ({
  messages: [...initialMessages],
  sessionId: undefined,
  tasks: {},
  activeTaskId: null,
  notifiedResults: {},
  taskMessageCursor: {},
});

const StaffCopilot = () => {
  const [workspaceState, setWorkspaceState] = useState<Record<string, WorkspaceState>>(() => {
    const firstId = sampleApplications[0]?.id;
    return firstId ? { [firstId]: createWorkspaceState() } : {};
  });
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState(sampleApplications[0]?.id ?? '');

  const currentWorkspace = useMemo(
    () => workspaceState[selectedApplicationId] ?? createWorkspaceState(),
    [workspaceState, selectedApplicationId],
  );

  const { messages, sessionId, tasks, activeTaskId, notifiedResults } = currentWorkspace;

  const selectedApplication = useMemo(
    () => sampleApplications.find((app) => app.id === selectedApplicationId) ?? sampleApplications[0],
    [selectedApplicationId],
  );

  const activeTask = activeTaskId ? tasks[activeTaskId] : undefined;

  const openTasks = useMemo(
    () => Object.values(tasks).filter((task) => task.status === 'queued' || task.status === 'running'),
    [tasks],
  );

  const isBusy = isSending || isRunningAction || openTasks.length > 0;

  useEffect(() => {
    if (!selectedApplicationId) return;
    setWorkspaceState((prev) => {
      if (prev[selectedApplicationId]) return prev;
      return { ...prev, [selectedApplicationId]: createWorkspaceState() };
    });
  }, [selectedApplicationId]);

  useEffect(() => {
    if (!openTasks.length) return undefined;
    const interval = setInterval(async () => {
      const updates = await Promise.all(
        openTasks.map(async (task) => {
          const data = await fetchTaskStatus(task.id);
          return [task.id, data] as const;
        }),
      );
      setWorkspaceState((prev) => {
        const ws = prev[selectedApplicationId] ?? createWorkspaceState();
        const updatedTasks = { ...ws.tasks };
        updates.forEach(([id, data]) => {
          updatedTasks[id] = data;
        });
        return { ...prev, [selectedApplicationId]: { ...ws, tasks: updatedTasks } };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [openTasks, selectedApplicationId]);

  const updateWorkspace = (workspaceId: string, updater: (ws: WorkspaceState) => WorkspaceState) => {
    setWorkspaceState((prev) => {
      const ws = prev[workspaceId] ?? createWorkspaceState();
      return { ...prev, [workspaceId]: updater(ws) };
    });
  };

  const appendMessage = (workspaceId: string, msg: ChatMessage) => {
    updateWorkspace(workspaceId, (ws) => ({ ...ws, messages: [...ws.messages, msg] }));
  };

  useEffect(() => {
    const workspaceId = selectedApplicationId || sampleApplications[0]?.id || 'default';
    const unseen = Object.values(tasks).filter(
      (task) => task.status === 'completed' && task.result && !notifiedResults[task.id],
    );
    if (!unseen.length) return;
    setWorkspaceState((prev) => {
      const ws = prev[workspaceId] ?? createWorkspaceState();
      const nextMessages = [...ws.messages];
      const nextNotified = { ...ws.notifiedResults };
      unseen.forEach((task) => {
        nextMessages.push({
          id: `result-${task.id}`,
          sender: 'assistant',
          text: `AI response (${task.description}):\n${formatTaskResult(task)}`,
        });
        nextNotified[task.id] = true;
      });
      return { ...prev, [workspaceId]: { ...ws, messages: nextMessages, notifiedResults: nextNotified } };
    });
  }, [tasks, notifiedResults, selectedApplicationId]);

  useEffect(() => {
    // Surface step-by-step task updates into the chat as they arrive.
    const workspaceId = selectedApplicationId || sampleApplications[0]?.id || 'default';
    const taskEntries = Object.entries(tasks);
    if (!taskEntries.length) return;
    setWorkspaceState((prev) => {
      const ws = prev[workspaceId] ?? createWorkspaceState();
      const nextMessages = [...ws.messages];
      const nextCursor = { ...ws.taskMessageCursor };

      taskEntries.forEach(([id, task]) => {
        const seen = nextCursor[id] ?? 0;
        const all = Array.isArray(task.messages) ? task.messages : [];
        const newOnes = all.slice(seen);
        if (!newOnes.length) return;
        newOnes.forEach((m, idx) => {
          nextMessages.push({
            id: `taskmsg-${id}-${seen + idx}`,
            sender: 'assistant',
            text: `Orchestration update: ${formatTaskLogLine(m)}`,
          });
        });
        nextCursor[id] = all.length;
      });

      // Also surface terminal statuses if not yet included.
      taskEntries.forEach(([id, task]) => {
        if (!task.status || ['queued', 'running'].includes(task.status)) return;
        const alreadyHasStatus = nextMessages.some((m) => m.id === `task-status-${id}-${task.status}`);
        if (!alreadyHasStatus) {
          const errorText = task.error ? ` Error: ${task.error}` : '';
          nextMessages.push({
            id: `task-status-${id}-${task.status}`,
            sender: 'assistant',
            text: `Task ${task.description} is ${task.status}.${errorText}`,
          });
        }
      });

      return { ...prev, [workspaceId]: { ...ws, messages: nextMessages, taskMessageCursor: nextCursor } };
    });
  }, [tasks, selectedApplicationId]);

  const handleSend = async (overrideText?: string) => {
    if (isSending) return;
    const text = (overrideText ?? input).trim();
    if (!text) return;
    const workspaceId = selectedApplicationId || sampleApplications[0]?.id || 'default';
    setInput('');
    appendMessage(workspaceId, { id: `user-${Date.now()}`, sender: 'user', text });
    setIsSending(true);
    try {
      const activeApp = selectedApplication ?? sampleApplications[0];
      const context: Record<string, any> = {
        workspace: 'loan-processing',
        application_id: activeApp?.id,
        applicant_name: activeApp?.applicantName,
        status: activeApp?.statusLabel,
        payload: activeApp ? buildPayload(activeApp) : undefined,
      };

      const resp = await sendCopilotChat(text, context, sessionId);
      const toolSummary =
        resp.tool_results?.length && resp.tool_results.length > 0
          ? `\n\nTool results:\n${resp.tool_results.map((t) => formatToolResult(t)).join('\n\n')}`
          : '';

      updateWorkspace(workspaceId, (ws) => ({
        ...ws,
        sessionId: resp.session_id,
        messages: [
          ...ws.messages,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: `${resp.reply}${toolSummary}`,
            toolResults: resp.tool_results,
            usedTools: resp.used_tools,
          },
        ],
      }));
    } catch (error) {
      appendMessage(workspaceId, {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: 'Copilot is unavailable. Please try again.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const startTask = (workspaceId: string, task: AgentTask) => {
    setWorkspaceState((prev) => {
      const ws = prev[workspaceId] ?? createWorkspaceState();
      return {
        ...prev,
        [workspaceId]: {
          ...ws,
          tasks: { ...ws.tasks, [task.id]: task },
          activeTaskId: task.id,
          messages: [
            ...ws.messages,
            {
              id: `task-${task.id}`,
              sender: 'assistant',
              text: `AI started: ${task.description}`,
            },
          ],
        },
      };
    });
  };

  const handleQuickAction = async (action: string) => {
    const workspaceId = selectedApplicationId || sampleApplications[0]?.id || 'default';
    if (action === 'run_orchestrator') {
      await handleRunOrchestrator();
      return;
    }
    if (action === 'check_status') {
      if (activeTaskId) {
        const data = await fetchTaskStatus(activeTaskId);
        setWorkspaceState((prev) => {
          const ws = prev[workspaceId] ?? createWorkspaceState();
          return {
            ...prev,
            [workspaceId]: { ...ws, tasks: { ...ws.tasks, [activeTaskId]: data } },
          };
        });
        appendMessage(workspaceId, {
          id: `status-${Date.now()}`,
          sender: 'assistant',
          text: `AI response: latest status for ${activeTaskId} is ${data.status}`,
        });
      } else {
        appendMessage(workspaceId, {
          id: `status-${Date.now()}`,
          sender: 'assistant',
          text: 'AI response: no active task to refresh.',
        });
      }
      return;
    }
    const quickPrompts: Record<string, string> = {
      mongo_get_application: `Fetch and summarize application ${selectedApplicationId || 'latest known id'}.`,
      mongo_get_documents: `Fetch documents for application ${selectedApplicationId || 'latest'} and highlight gaps.`,
      mongo_search_applications: 'Search recent applications and surface any high-risk or pending items.',
      analytics_loans_count: 'Provide loan counts for the last 30 days.',
      analytics_status_counts: 'Provide loan status breakdown for the last 30 days.',
      analytics_loans_trend: 'Provide the loan application trend for the last 30 days.',
    };
    await handleSend(quickPrompts[action] || `Handle this request using tools: ${action}`);
  };

  const handleRunOrchestrator = async (app?: SampleApplication) => {
    const targetApp = app ?? selectedApplication ?? sampleApplications[0];
    if (!targetApp) {
      const workspaceId = selectedApplicationId || sampleApplications[0]?.id || 'default';
      appendMessage(workspaceId, {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: 'No application selected to run the orchestrator.',
      });
      return;
    }
    const workspaceId = targetApp.id;
    setSelectedApplicationId(workspaceId);
    setIsRunningAction(true);
    try {
      const payload = buildPayload(targetApp);
      const task = await startOrchestration(targetApp.id, payload);
      startTask(workspaceId, task);
    } catch (error) {
      appendMessage(workspaceId, {
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
          {msg.toolResults && msg.toolResults.length > 0 && (
            <Stack mt={1} gap={1}>
              {msg.toolResults.map((tool) => (
                <Paper
                  key={`${msg.id}-${tool.name}`}
                  variant="outlined"
                  sx={{ p: 1, bgcolor: '#0b162d', borderColor: '#1e293b' }}
                >
                  <Typography variant="caption" color="#a5f3fc" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>
                    Tool • {tool.name}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }} color="#e2e8f0">
                    {formatToolResult(tool)}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
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
          {isBusy && (
            <Stack direction="row" alignItems="center" gap={1} mt={1.5}>
              <LinearProgress
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 999,
                  bgcolor: '#0b162d',
                  '& .MuiLinearProgress-bar': { bgcolor: '#38bdf8' },
                }}
              />
              <Typography variant="caption" color="#94a3b8">
                Copilot is working…
              </Typography>
            </Stack>
          )}
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

        {isSending && (
          <Box sx={{ px: 2, py: 1, borderTop: '1px solid #1e293b', bgcolor: '#0b162d' }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <CircularProgress size={16} sx={{ color: '#38bdf8' }} />
              <Typography variant="body2" color="#94a3b8">
                Copilot is generating a response...
              </Typography>
            </Stack>
          </Box>
        )}

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
            <IconButton color="primary" onClick={() => handleSend()} disabled={isSending}>
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
                      setWorkspaceState((prev) => {
                        const ws = prev[selectedApplicationId] ?? createWorkspaceState();
                        return {
                          ...prev,
                          [selectedApplicationId]: { ...ws, tasks: { ...ws.tasks, [activeTask.id]: data } },
                        };
                      });
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
