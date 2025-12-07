import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Paper,
    Drawer,
    IconButton,
    useTheme,
    useMediaQuery,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Button,
    Stack,
    Chip,
    Tabs,
    Tab,
    Divider,
    Grid,
    LinearProgress,
    Snackbar,
    Alert,
    CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ShieldIcon from '@mui/icons-material/Shield';
import DescriptionIcon from '@mui/icons-material/Description';
import StorageIcon from '@mui/icons-material/Storage';
import { type Node } from '@xyflow/react';
import ProcessGraph from './ProcessGraph';
import DetailPanel from './DetailPanel';
import { createSimulation, initialStatuses, type SimulationStatusMap } from './simulation';
import { sampleApplications, type SampleApplication } from '../../data/sampleApplications';
import { useLocation } from 'react-router-dom';
import api from '../../api';

const StaffDashboard = () => {
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [applications, setApplications] = useState<SampleApplication[]>(sampleApplications);
    const [selectedAppId, setSelectedAppId] = useState<string>(sampleApplications[0]?.id ?? '');
    const [statuses, setStatuses] = useState<SimulationStatusMap>(initialStatuses());
    const [logs, setLogs] = useState<string[]>([]);
    const [activeStep, setActiveStep] = useState<string | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<string>('workflow');
    const [elapsedMs, setElapsedMs] = useState<number>(0);
    const [decisionPath, setDecisionPath] = useState<'auto-approve' | 'manual-review' | 'auto-reject' | undefined>(undefined);
    const [loadingApps, setLoadingApps] = useState<boolean>(false);
    const [appError, setAppError] = useState<string | null>(null);
    const [uiToast, setUiToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
        open: false,
        message: '',
        severity: 'info',
    });
    const location = useLocation();
    const cancelRef = useRef<(() => void) | null>(null);
    const timerRef = useRef<number | null>(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const drawerWidth = isMobile ? '100%' : 400;

    const applicationMap = useMemo(() => Object.fromEntries(applications.map((app) => [app.id, app])), [applications]);

    // Pick application from navigation state if present
    useEffect(() => {
        const fromState = (location.state as any)?.applicationId;
        if (fromState && applicationMap[fromState]) {
            setSelectedAppId(fromState);
        }
    }, [location.state, applicationMap]);

    useEffect(() => {
        if (!selectedAppId && applications.length > 0) {
            setSelectedAppId(applications[0].id);
        }
    }, [applications, selectedAppId]);

    useEffect(() => {
        const loadApplications = async () => {
            setLoadingApps(true);
            try {
                const response = await api.get('/loans');
                const fromApi = Array.isArray(response.data) ? response.data : [];
                if (fromApi.length > 0) {
                    const normalized: SampleApplication[] = fromApi.map((loan: any) => ({
                        id: `APP-${loan.id}`,
                        applicantName: loan.customer?.first_name
                            ? `${loan.customer.first_name} ${loan.customer.last_name ?? ''}`.trim()
                            : `Customer ${loan.customer_id ?? loan.id}`,
                        productType: 'PERSONAL_LOAN',
                        requestedAmount: loan.loan_amount ?? 0,
                        termMonths: loan.loan_term_months ?? 0,
                        purpose: loan.loan_purpose ?? 'General purpose',
                        channel: 'BACKEND',
                        scenario: 'moderate_review',
                        creditScore: loan.credit_score?.score ?? 680,
                        dti: loan.credit_score?.details?.dti ?? 0.32,
                        incomeNetMonthly: loan.credit_score?.details?.income ?? 4500,
                        summary: `Backend status: ${loan.status ?? 'IN_REVIEW'} | Created ${loan.created_at ?? ''}`,
                        statusLabel: 'IN_REVIEW',
                        files: {
                            application: loan.documents?.[0]?.file_path ?? '/input/loan_application.json',
                            id: loan.documents?.find((d: any) => d.document_type === 'ID')?.file_path ?? '/input/id.json',
                            bankStatement: loan.documents?.find((d: any) => d.document_type === 'BANK_STATEMENT')?.file_path ?? '/input/bank_statement.json',
                            payslip: loan.documents?.find((d: any) => d.document_type === 'PAYSLIP')?.file_path ?? '/input/payslip.json',
                        },
                    }));
                    setApplications(normalized);
                    setSelectedAppId(normalized[0]?.id ?? '');
                    setAppError(null);
                    setUiToast({ open: true, message: 'Loaded applications from backend', severity: 'success' });
                    return;
                }
            } catch (error) {
                setAppError('Using mock data (API unavailable)');
            } finally {
                setLoadingApps(false);
            }
        };

        loadApplications();
    }, []);

    // Auto start simulation on application change
    const runSimulation = (appId: string) => {
        const app = applicationMap[appId];
        if (!app) return;

        if (cancelRef.current) cancelRef.current();
        if (timerRef.current) window.clearInterval(timerRef.current);
        setSelectedNode(null);
        setStatuses(initialStatuses());
        setLogs([`Application ${app.id} selected (${app.scenario.replace(/_/g, ' ')})`]);
        setActiveStep(undefined);
        setElapsedMs(0);
        setDecisionPath(undefined);

        cancelRef.current = createSimulation(app, (update) => {
            setStatuses(update.statuses);
            setLogs(update.logs);
            setActiveStep(update.activeStep);
            if (update.decision) {
                setDecisionPath(update.decision);
            }
        });

        const start = Date.now();
        timerRef.current = window.setInterval(() => {
            setElapsedMs(Date.now() - start);
        }, 1000);
    };

    useEffect(() => {
        if (selectedAppId) {
            runSimulation(selectedAppId);
        }
        return () => {
            if (cancelRef.current) cancelRef.current();
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [selectedAppId]);

    const handleNodeClick = (node: Node) => {
        setSelectedNode(node);
    };

    const handleClose = () => {
        setSelectedNode(null);
    };

    const isOpen = selectedNode !== null;
    const selectedApp = applicationMap[selectedAppId];

    const restart = () => {
        runSimulation(selectedAppId);
    };

    const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
    const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

    const formattedElapsed = useMemo(() => {
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }, [elapsedMs]);

    const riskScore = useMemo(() => {
        if (!selectedApp) return 0;
        const base = (selectedApp.creditScore / 850) * 70;
        const dtiPenalty = Math.min(25, selectedApp.dti * 100 * 0.4);
        const scenarioAdjust = selectedApp.scenario === 'excellent_auto' ? 8 : selectedApp.scenario === 'high_risk_reject' ? -12 : -3;
        return Math.max(1, Math.min(99, Math.round(base - dtiPenalty + scenarioAdjust + 15)));
    }, [selectedApp]);

    const activeOwner = useMemo(() => {
        if (!activeStep) return 'Unassigned';
        const ownerMap: Record<string, string> = {
            'doc-processing': 'IDP Bot',
            'doc-verification': 'Ops Analyst',
            'doc-check': 'Decision Engine',
            'credit-scoring': 'Risk Engine',
            'parallel-split': 'Decision Engine',
            'income-analysis': 'Data Analyst',
            'debt-assessment': 'Risk Analyst',
            'compliance-check': 'Compliance',
            'report-generation': 'Ops Analyst',
            'routing-decision': 'Decision Engine',
            'auto-approve': 'Decision Engine',
            'manual-review': 'Underwriter',
            'auto-reject': 'Decision Engine',
            'final-decision': 'Ops Lead',
            'update-banking': 'Core Banking',
            'disburse': 'Treasury',
            'notify': 'Communications',
        };
        return ownerMap[activeStep] ?? 'Unassigned';
    }, [activeStep]);

    const stageLabel = useMemo(() => {
        if (!activeStep) return 'Idle';
        const stageMap: Record<string, string> = {
            'doc-processing': 'Intake',
            'doc-verification': 'Intake',
            'doc-check': 'Verification',
            'credit-scoring': 'Risk',
            'parallel-split': 'Risk',
            'income-analysis': 'Risk',
            'debt-assessment': 'Risk',
            'compliance-check': 'Risk',
            'report-generation': 'Decision Prep',
            'routing-decision': 'Decision Prep',
            'auto-approve': 'Decision',
            'manual-review': 'Decision',
            'auto-reject': 'Decision',
            'final-decision': 'Decision',
            'update-banking': 'Funding',
            'disburse': 'Funding',
            'notify': 'Funding',
        };
        return stageMap[activeStep] ?? 'In Progress';
    }, [activeStep]);

    const headerStats = useMemo(() => {
        if (!selectedApp) return [];
        return [
            { label: 'Amount', value: formatCurrency(selectedApp.requestedAmount) },
            { label: 'Term', value: `${selectedApp.termMonths} mo` },
            { label: 'DTI', value: formatPercent(selectedApp.dti) },
            { label: 'Credit Score', value: selectedApp.creditScore },
            { label: 'Owner', value: activeOwner },
            { label: 'Stage', value: stageLabel },
        ];
    }, [selectedApp, activeOwner, stageLabel]);

    const statusColor = (statusLabel?: SampleApplication['statusLabel']) => {
        switch (statusLabel) {
            case 'IN_REVIEW':
                return { label: 'In Review', color: 'info' as const };
            case 'READY_TO_APPROVE':
                return { label: 'Ready to Approve', color: 'success' as const };
            case 'HIGH_RISK':
                return { label: 'High Risk', color: 'error' as const };
            case 'MANUAL_REVIEW':
                return { label: 'Manual Review', color: 'warning' as const };
            default:
                return { label: 'In Progress', color: 'default' as const };
        }
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'w') {
                setActiveTab('workflow');
                setUiToast({ open: true, message: 'Jumped to Workflow', severity: 'info' });
                e.preventDefault();
            }
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                setActiveTab('documents');
                setUiToast({ open: true, message: 'Jumped to Documents', severity: 'info' });
                e.preventDefault();
            }
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
                setUiToast({ open: true, message: 'Assigned to you', severity: 'success' });
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 64px)',
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: theme.palette.grey[50],
        }}>
            <Paper
                elevation={1}
                sx={{
                    p: 2.5,
                    borderRadius: 0,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: theme.palette.background.paper,
                }}
            >
                <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                                label="Sandbox Simulation"
                                color="default"
                                size="small"
                                icon={<StorageIcon fontSize="small" />}
                            />
                            <Chip
                                label={appError ? 'Mock Data' : 'Live Data'}
                                color={appError ? 'warning' : 'success'}
                                size="small"
                            />
                            <Chip
                                label={statusColor(selectedApp?.statusLabel).label}
                                color={statusColor(selectedApp?.statusLabel).color}
                                size="small"
                            />
                            {decisionPath && (
                                <Chip
                                    label={`Path: ${decisionPath.replace('-', ' ')}`}
                                    color={decisionPath === 'auto-approve' ? 'success' : decisionPath === 'auto-reject' ? 'error' : 'warning'}
                                    size="small"
                                />
                            )}
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<RestartAltIcon />}
                                onClick={restart}
                            >
                                Restart Simulation
                            </Button>
                            {loadingApps && <CircularProgress size={18} />}
                        </Stack>
                    </Stack>

                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Stack spacing={1}>
                                <Typography variant="h6">
                                    {selectedApp?.applicantName ?? 'Applicant'} — {selectedApp?.productType?.replace(/_/g, ' ') ?? 'Product'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {selectedApp?.summary ?? 'Case details will appear once loaded.'}
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Chip
                                        color="primary"
                                        size="small"
                                        icon={<AccessTimeIcon fontSize="small" />}
                                        label={`Elapsed ${formattedElapsed}`}
                                    />
                                    <Chip
                                        color="secondary"
                                        size="small"
                                        icon={<ShieldIcon fontSize="small" />}
                                        label={`Risk Score ${riskScore}`}
                                    />
                                </Stack>
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Grid container spacing={2}>
                                {headerStats.map((stat) => (
                                    <Grid size={{ xs: 6, sm: 4, md: 4, lg: 2 }} key={stat.label}>
                                        <Stack spacing={0.5}>
                                            <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                                            <Typography variant="subtitle1" fontWeight={700}>{stat.value}</Typography>
                                        </Stack>
                                    </Grid>
                                ))}
                                <Grid size={{ xs: 12, sm: 4, md: 4, lg: 2 }}>
                                    <Stack spacing={0.5}>
                                        <Typography variant="caption" color="text.secondary">SLA Target</Typography>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <DescriptionIcon fontSize="small" color="action" />
                                            <Typography variant="subtitle1" fontWeight={700}>15:00</Typography>
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min(100, (elapsedMs / (15 * 60 * 1000)) * 100)}
                                            sx={{ height: 6, borderRadius: 999 }}
                                        />
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>

                    <Divider />

                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <FormControl size="small" sx={{ minWidth: 240 }}>
                            <InputLabel id="app-select-label">Select Application</InputLabel>
                            <Select
                                labelId="app-select-label"
                                value={selectedAppId}
                                label="Select Application"
                                onChange={(e) => setSelectedAppId(e.target.value as string)}
                                disabled={loadingApps}
                            >
                                {applications.map((app) => (
                                    <MenuItem key={app.id} value={app.id}>{app.id} — {app.applicantName}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Chip label={`Channel: ${selectedApp?.channel ?? 'N/A'}`} size="small" />
                        <Chip label={`Purpose: ${selectedApp?.purpose ?? 'N/A'}`} size="small" />
                    </Stack>
                </Stack>
            </Paper>

            <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                <Box
                    sx={{
                        flexGrow: 1,
                        height: '100%',
                        transition: theme.transitions.create(['margin', 'width'], {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        marginRight: isOpen && !isMobile ? `${drawerWidth}px` : 0,
                        width: isOpen && !isMobile ? `calc(100% - ${drawerWidth}px)` : '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    <Paper elevation={0} sx={{ borderRadius: 0, borderBottom: '1px solid', borderColor: 'divider', px: 2.5, bgcolor: 'transparent' }}>
                        <Tabs
                            value={activeTab}
                            onChange={(_e, value) => setActiveTab(value)}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            <Tab value="overview" label="Overview" />
                            <Tab value="workflow" label="Workflow" />
                            <Tab value="documents" label="Documents" />
                            <Tab value="risk" label="Risk & Scoring" />
                            <Tab value="notes" label="Notes" />
                            <Tab value="audit" label="Audit Log" />
                            <Tab value="settings" label="Settings" />
                        </Tabs>
                    </Paper>

                    <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2.5 }}>
                        {activeTab === 'overview' && (
                            <Stack spacing={2}>
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="subtitle1" fontWeight={700}>Case Summary</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {selectedApp?.summary}
                                    </Typography>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
                                        <Chip label={`Risk Score ${riskScore}`} color="secondary" size="small" />
                                        <Chip label={`Decision Path ${decisionPath ?? 'TBD'}`} size="small" />
                                        <Chip label={`Stage ${stageLabel}`} size="small" />
                                    </Stack>
                                </Paper>
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="subtitle1" fontWeight={700}>Recent Events</Typography>
                                    <Stack spacing={1.25} sx={{ mt: 1 }}>
                                        {logs.slice(-5).reverse().map((log, idx) => (
                                            <Stack key={log + idx} direction="row" spacing={1} alignItems="center">
                                                <AccessTimeIcon fontSize="small" color="action" />
                                                <Typography variant="body2">{log}</Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                </Paper>
                            </Stack>
                        )}

                        {activeTab === 'workflow' && (
                            <Paper sx={{ height: '100%', p: 1, minHeight: 560, display: 'flex', flexDirection: 'column' }}>
                                <ProcessGraph onNodeClick={handleNodeClick} statuses={statuses} activeStep={activeStep} />
                            </Paper>
                        )}

                        {activeTab === 'documents' && (
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle1" fontWeight={700}>Documents</Typography>
                                <Stack spacing={1.5} sx={{ mt: 1 }}>
                                    {selectedApp && Object.entries(selectedApp.files).map(([key, path]) => (
                                        <Stack key={key} direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                                            <Stack spacing={0.25}>
                                                <Typography variant="body2" fontWeight={700}>{key.toUpperCase()}</Typography>
                                                <Typography variant="caption" color="text.secondary">{path}</Typography>
                                            </Stack>
                                            <Button size="small" variant="outlined">Open</Button>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Paper>
                        )}

                        {activeTab === 'risk' && (
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle1" fontWeight={700}>Risk & Scoring</Typography>
                                <Grid container spacing={2} sx={{ mt: 1 }}>
                                    <Grid size={{ xs: 6, md: 3 }}>
                                        <Typography variant="caption" color="text.secondary">Credit Score</Typography>
                                        <Typography variant="h6">{selectedApp?.creditScore}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6, md: 3 }}>
                                        <Typography variant="caption" color="text.secondary">DTI</Typography>
                                        <Typography variant="h6">{selectedApp ? formatPercent(selectedApp.dti) : '—'}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6, md: 3 }}>
                                        <Typography variant="caption" color="text.secondary">Income (Net Monthly)</Typography>
                                        <Typography variant="h6">{selectedApp ? formatCurrency(selectedApp.incomeNetMonthly) : '—'}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6, md: 3 }}>
                                        <Typography variant="caption" color="text.secondary">Decision Path</Typography>
                                        <Typography variant="h6">{decisionPath ?? 'In Progress'}</Typography>
                                    </Grid>
                                </Grid>
                            </Paper>
                        )}

                        {activeTab === 'notes' && (
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle1" fontWeight={700}>Notes</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Add collaboration notes once the action panel is available.
                                </Typography>
                            </Paper>
                        )}

                        {activeTab === 'audit' && (
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle1" fontWeight={700}>Audit Log</Typography>
                                <Stack spacing={1} sx={{ mt: 1 }}>
                                    {logs.slice(-20).reverse().map((log, idx) => (
                                        <Typography key={log + idx} variant="body2">{log}</Typography>
                                    ))}
                                </Stack>
                            </Paper>
                        )}

                        {activeTab === 'settings' && (
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle1" fontWeight={700}>Settings</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Environment toggles and role-based preferences will live here.
                                </Typography>
                            </Paper>
                        )}
                    </Box>
                </Box>

                {/* Right side panel */}
                <Drawer
                    anchor="right"
                    open={isOpen}
                    onClose={handleClose}
                    variant={isMobile ? 'temporary' : 'persistent'}
                    PaperProps={{
                        sx: {
                            width: drawerWidth,
                            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
                        }
                    }}
                    ModalProps={{
                        keepMounted: true, // Better mobile performance
                    }}
                >
                    <Box sx={{ position: 'relative', height: '100%' }}>
                        <IconButton
                            aria-label="close"
                            onClick={handleClose}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                zIndex: 1,
                                color: 'text.secondary',
                                backgroundColor: 'background.paper',
                                '&:hover': {
                                    backgroundColor: 'action.hover',
                                },
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                        <DetailPanel selectedNode={selectedNode} application={selectedApp} logs={logs} activeStep={activeStep} />
                    </Box>
                </Drawer>
            </Box>

            <Snackbar
                open={uiToast.open}
                autoHideDuration={2500}
                onClose={() => setUiToast((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setUiToast((prev) => ({ ...prev, open: false }))}
                    severity={uiToast.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {uiToast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default StaffDashboard;
