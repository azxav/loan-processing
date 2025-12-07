import { useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Divider,
    Chip,
    Stack,
    Button,
    Checkbox,
    FormControlLabel,
    TextField,
    Avatar,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CommentIcon from '@mui/icons-material/Comment';
import { type Node } from '@xyflow/react';
import { nodeDetails } from './mockData';
import { type SampleApplication } from '../../data/sampleApplications';

interface DetailPanelProps {
    selectedNode: Node | null;
    application?: SampleApplication;
    logs: string[];
    activeStep?: string;
}

const DetailPanel = ({ selectedNode, application, logs, activeStep }: DetailPanelProps) => {
    const [localActions, setLocalActions] = useState<string[]>([]);
    const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<Array<{ author: string; role: string; text: string; time: string }>>([
        { author: 'Casey Quinn', role: 'Underwriter', text: 'Income variance looks acceptable. Proceed if compliance clears.', time: '5m ago' },
        { author: 'Morgan Lee', role: 'Compliance', text: 'KYC match confirmed. No watchlist hits.', time: '3m ago' },
    ]);
    const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [confirmAction, setConfirmAction] = useState<'reject' | 'hold' | null>(null);

    const details = selectedNode ? (nodeDetails[selectedNode.id] || {
        description: `Details for ${selectedNode.data.label}`,
        details: [],
        logs: [],
    }) : null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'in-progress': return 'warning';
            case 'pending': return 'default';
            default: return 'default';
        }
    };

    const tasksForNode: Record<string, string[]> = {
        'doc-processing': ['Validate OCR fields', 'Confirm document types detected', 'Flag low confidence fields'],
        'doc-verification': ['Cross-check name/address', 'Review fraud patterns', 'Confirm completeness'],
        'credit-scoring': ['Review score inputs', 'Check adverse signals', 'Validate bureau pull'],
        'income-analysis': ['Verify income cadence', 'Spot anomalies in deposits', 'Attach income summary'],
        'debt-assessment': ['Recompute DTI', 'Confirm obligations list', 'Add mitigation notes'],
        'compliance-check': ['Verify KYC proof', 'Check sanctions/PEP', 'Approve AML results'],
        'manual-review': ['Assign reviewer', 'Capture decision rationale', 'Update outcome in LOS'],
        default: ['Confirm ownership', 'Add note for next step', 'Share update with team'],
    };

    const activeTasks = useMemo(() => {
        if (!selectedNode) return tasksForNode.default;
        return tasksForNode[selectedNode.id] || tasksForNode.default;
    }, [selectedNode]);

    const nextAction = useMemo<{ title: string; eta: string; detail: string }>(() => {
        const labelCandidate = selectedNode?.data?.label;
        const safeLabel = typeof labelCandidate === 'string' || typeof labelCandidate === 'number'
            ? String(labelCandidate)
            : 'Monitor progress';
        if (selectedNode?.id === 'income-analysis') {
            return { title: 'Review income documents', eta: '≈3 min', detail: 'Verify cash-flow extraction before routing decision.' };
        }
        if (selectedNode?.id === 'manual-review') {
            return { title: 'Complete manual review', eta: '≈5 min', detail: 'Provide decision rationale and sign off.' };
        }
        if (selectedNode?.id === 'compliance-check') {
            return { title: 'Finish compliance checks', eta: '≈2 min', detail: 'Approve AML/KYC results to continue.' };
        }
        return { title: safeLabel, eta: 'Live', detail: 'Stay aligned with SLA and update notes as needed.' };
    }, [selectedNode]);

    const handleToggleTask = (task: string) => {
        setCompletedTasks((prev) => ({ ...prev, [task]: !prev[task] }));
    };

    const addLocalAction = (action: string) => {
        setLocalActions((prev) => [...prev, `Action: ${action}`]);
        setToast({ open: true, message: `${action} recorded`, severity: 'success' });
    };

    const handleAddComment = () => {
        if (!commentText.trim()) return;
        setComments((prev) => [...prev, { author: 'You', role: 'Underwriter', text: commentText.trim(), time: 'Just now' }]);
        setCommentText('');
        setToast({ open: true, message: 'Comment posted', severity: 'info' });
    };

    const handleConfirmAction = () => {
        if (!confirmAction) return;
        const actionLabel = confirmAction === 'reject' ? 'Rejected step' : 'Placed on hold';
        setLocalActions((prev) => [...prev, `Action: ${actionLabel}`]);
        setToast({
            open: true,
            message: actionLabel,
            severity: confirmAction === 'reject' ? 'error' : 'warning',
        });
        setConfirmAction(null);
    };

    const combinedLogs = [...logs, ...localActions].slice(-25).reverse();

    return (
        <Paper elevation={0} sx={{ height: '100%', overflowY: 'auto' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #eee', bgcolor: '#f7f9fc' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <PendingActionsIcon fontSize="small" color="action" />
                    <Typography variant="overline" color="text.secondary">
                        Next action
                    </Typography>
                </Stack>
                <Typography variant="h6" gutterBottom>
                    {nextAction.title}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                    <Chip label={nextAction.eta} size="small" color="primary" />
                    {selectedNode && (
                        (() => {
                            const status = selectedNode.data?.status;
                            const statusLabel = typeof status === 'string' || typeof status === 'number'
                                ? String(status)
                                : 'pending';
                            return (
                                <Chip
                                    label={statusLabel}
                                    size="small"
                                    color={getStatusColor(statusLabel)}
                                />
                            );
                        })()
                    )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    {nextAction.detail}
                </Typography>
            </Box>

            <Divider />

            <Box sx={{ p: 3, borderBottom: '1px solid #eee' }}>
                <Typography variant="overline" color="text.secondary">
                    Application
                </Typography>
                {application ? (
                    <>
                        <Typography variant="h6" gutterBottom>
                            {application.id} — {application.applicantName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            ${application.requestedAmount.toLocaleString()} • {application.termMonths} mo • {application.purpose}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Scenario: {application.scenario.replace(/_/g, ' ')} | Credit Score {application.creditScore} | DTI {(application.dti * 100).toFixed(1)}%
                        </Typography>
                    </>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Select an application to view details.
                    </Typography>
                )}
            </Box>

            <Divider />

            {selectedNode && details && (
                <>
                    <Box sx={{ p: 3, borderBottom: '1px solid #eee' }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <Typography variant="overline" color="text.secondary">
                                Process Step
                            </Typography>
                            {activeStep === selectedNode.id && (
                                <Chip label="Active" color="warning" size="small" />
                            )}
                        </Stack>
                        <Typography variant="h6" gutterBottom>
                            {selectedNode.data.label as string}
                        </Typography>
                        <Chip
                            label={selectedNode.data.status as string || 'Unknown'}
                            color={getStatusColor(selectedNode.data.status as string)}
                            size="small"
                            sx={{ mb: 2 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            {details.description}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                            <Button variant="contained" color="success" size="small" onClick={() => addLocalAction('Approve step')}>
                                Approve
                            </Button>
                            <Button variant="outlined" color="error" size="small" onClick={() => setConfirmAction('reject')}>
                                Reject
                            </Button>
                            <Button variant="outlined" color="warning" size="small" onClick={() => setConfirmAction('hold')}>
                                Hold
                            </Button>
                            <Button variant="outlined" size="small" onClick={() => addLocalAction('Request document')}>
                                Request Doc
                            </Button>
                        </Stack>
                    </Box>

                    {details.details && details.details.length > 0 && (
                        <Box sx={{ p: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Key Metrics
                            </Typography>
                            <List dense>
                                {details.details.map((item: any, index: number) => (
                                    <ListItem key={index} disableGutters>
                                        <ListItemText primary={item.key} secondary={item.value} />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </>
            )}

            <Divider />

            <Box sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <TaskAltIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">
                        Task Checklist
                    </Typography>
                </Stack>
                <Stack spacing={0.5} sx={{ mb: 2 }}>
                    {activeTasks.map((task) => (
                        <FormControlLabel
                            key={task}
                            control={<Checkbox size="small" checked={Boolean(completedTasks[task])} onChange={() => handleToggleTask(task)} />}
                            label={<Typography variant="body2">{task}</Typography>}
                        />
                    ))}
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Activity Timeline
                </Typography>
                <List dense sx={{ bgcolor: '#f5f5f5', borderRadius: 1, maxHeight: 260, overflowY: 'auto' }}>
                    {combinedLogs.length === 0 && (
                        <ListItem>
                            <ListItemText primary="No activity yet" primaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace' }} />
                        </ListItem>
                    )}
                    {combinedLogs.map((log: string, index: number) => (
                        <ListItem key={index}>
                            <ListItemText primary={log} primaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace' }} />
                        </ListItem>
                    ))}
                </List>
            </Box>

            <Divider />

            <Box sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <CommentIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">Comments</Typography>
                </Stack>
                <Stack spacing={1.5} sx={{ maxHeight: 240, overflowY: 'auto', mb: 2 }}>
                    {comments.map((comment, idx) => (
                        <Stack key={comment.author + idx} direction="row" spacing={1} alignItems="flex-start">
                            <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{comment.author[0]}</Avatar>
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" fontWeight={700}>{comment.author}</Typography>
                                    <Chip label={comment.role} size="small" variant="outlined" />
                                    <Typography variant="caption" color="text.secondary">{comment.time}</Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary">{comment.text}</Typography>
                            </Box>
                        </Stack>
                    ))}
                </Stack>
                <Stack spacing={1}>
                    <TextField
                        size="small"
                        fullWidth
                        label="Add comment"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        multiline
                        minRows={2}
                    />
                    <Button variant="contained" onClick={handleAddComment} disabled={!commentText.trim()}>
                        Post Comment
                    </Button>
                </Stack>
            </Box>

            <Dialog open={Boolean(confirmAction)} onClose={() => setConfirmAction(null)}>
                <DialogTitle>{confirmAction === 'reject' ? 'Confirm Reject' : 'Confirm Hold'}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {confirmAction === 'reject'
                            ? 'Rejecting will move this case out of the queue. Continue?'
                            : 'Place this case on hold and pause the workflow?'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmAction(null)} variant="text">Cancel</Button>
                    <Button
                        onClick={handleConfirmAction}
                        color={confirmAction === 'reject' ? 'error' : 'warning'}
                        variant="contained"
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={toast.severity}
                    onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </Paper>
    );
};

export default DetailPanel;
