import { useCallback, useMemo, useEffect, useState } from 'react';
import { Box, Typography, Chip, Stack, Tooltip, LinearProgress, Divider, Paper, Button, useTheme, useMediaQuery } from '@mui/material';
import {
    ReactFlow,
    Background,
    Controls,
    type Node,
    type Edge,
    type NodeTypes,
    addEdge,
    useNodesState,
    useEdgesState,
    MarkerType,
    Handle,
    Position,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RouteIcon from '@mui/icons-material/Route';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import { type SimulationStatusMap } from './simulation';

type Phase = 'Intake' | 'Verification' | 'Risk' | 'Decision' | 'Funding';
type Role = 'customer' | 'branch' | 'underwriting' | 'automation' | 'external' | 'compliance';
type ViewMode = 'business' | 'technical';

interface ProcessGraphProps {
    onNodeClick: (node: Node) => void;
    statuses: SimulationStatusMap;
    activeStep?: string;
    viewMode: ViewMode;
    isSimulation?: boolean;
    autoFocusActive?: boolean;
}

type NodeMeta = {
    phase: Phase;
    owner: string;
    sla: string;
    description: string;
    role: Role;
};

type NodeDefinition = {
    id: string;
    label: string;
    subtitle?: string;
    type: 'process' | 'gateway' | 'startend';
    meta: NodeMeta;
    aggregateFrom?: string[];
    businessLabel?: string;
    businessSubtitle?: string;
};

const phaseOrder: Phase[] = ['Intake', 'Verification', 'Risk', 'Decision', 'Funding'];

const swimlanes: Array<{ id: Role; label: string; accent: string }> = [
    { id: 'customer', label: 'Customer', accent: '#cbd5e1' },
    { id: 'branch', label: 'Branch / Agent', accent: '#c7d2fe' },
    { id: 'underwriting', label: 'Underwriting / Ops', accent: '#e9d5ff' },
    { id: 'automation', label: 'Automation / Robots', accent: '#dbeafe' },
    { id: 'external', label: 'External Systems', accent: '#d1fae5' },
    { id: 'compliance', label: 'Compliance / Risk', accent: '#fde68a' },
];

const nodeMeta: Record<string, NodeMeta> = {
    start: { phase: 'Intake', owner: 'System', sla: '< 5s', description: 'Process initiated', role: 'automation' },
    'doc-processing': { phase: 'Intake', owner: 'IDP Bot', sla: '2m', description: 'Extracting documents', role: 'automation' },
    'doc-verification': { phase: 'Intake', owner: 'Ops Analyst', sla: '3m', description: 'Cross-checking signals', role: 'branch' },
    'doc-check': { phase: 'Verification', owner: 'Decision Engine', sla: '30s', description: 'Risk gating', role: 'automation' },
    'reject-high-risk': { phase: 'Verification', owner: 'Risk Ops', sla: '1m', description: 'Reject if high risk', role: 'compliance' },
    'credit-scoring': { phase: 'Risk', owner: 'Risk Engine', sla: '2m', description: 'Score calculation', role: 'automation' },
    'parallel-split': { phase: 'Risk', owner: 'Decision Engine', sla: '30s', description: 'Parallel branch setup', role: 'automation' },
    'income-analysis': { phase: 'Risk', owner: 'Data Analyst', sla: '2m', description: 'Cash flow review', role: 'underwriting' },
    'debt-assessment': { phase: 'Risk', owner: 'Risk Analyst', sla: '2m', description: 'DTI calculation', role: 'underwriting' },
    'compliance-check': { phase: 'Risk', owner: 'Compliance', sla: '2m', description: 'KYC/AML', role: 'compliance' },
    'report-generation': { phase: 'Decision', owner: 'Ops Analyst', sla: '2m', description: 'Decision packet', role: 'underwriting' },
    'routing-decision': { phase: 'Decision', owner: 'Decision Engine', sla: '1m', description: 'Routing rule', role: 'automation' },
    'auto-approve': { phase: 'Decision', owner: 'Decision Engine', sla: '1m', description: 'Auto approval', role: 'automation' },
    'manual-review': { phase: 'Decision', owner: 'Underwriter', sla: '5m', description: 'Underwriter review', role: 'underwriting' },
    'auto-reject': { phase: 'Decision', owner: 'Decision Engine', sla: '1m', description: 'Auto reject', role: 'automation' },
    'final-decision': { phase: 'Decision', owner: 'Ops Lead', sla: '1m', description: 'Finalize decision', role: 'underwriting' },
    'update-banking': { phase: 'Funding', owner: 'Core Banking', sla: '2m', description: 'Push to core', role: 'external' },
    'disburse': { phase: 'Funding', owner: 'Treasury', sla: '2m', description: 'Disbursement', role: 'external' },
    'notify': { phase: 'Funding', owner: 'Comms', sla: '1m', description: 'Notify applicant', role: 'external' },
    end: { phase: 'Funding', owner: 'System', sla: '< 5s', description: 'Process completed', role: 'automation' },
};

const businessMeta: Record<string, NodeMeta> = {
    start: { phase: 'Intake', owner: 'System', sla: '< 5s', description: 'Process initiated', role: 'automation' },
    'intake-packet': {
        phase: 'Intake',
        owner: 'Automation',
        sla: '3m',
        description: 'Document intake and verification',
        role: 'automation',
    },
    'risk-screen': {
        phase: 'Risk',
        owner: 'Decision Engine',
        sla: '2m',
        description: 'Risk screening and scoring',
        role: 'automation',
    },
    'analysis-bundle': {
        phase: 'Risk',
        owner: 'Risk / Compliance',
        sla: '5m',
        description: 'Income, debt, and compliance review',
        role: 'underwriting',
    },
    'decision-band': {
        phase: 'Decision',
        owner: 'Decision Engine',
        sla: '3m',
        description: 'Routing, approvals, and overrides',
        role: 'underwriting',
    },
    'funding-band': {
        phase: 'Funding',
        owner: 'Treasury / Comms',
        sla: '4m',
        description: 'Core updates and customer notifications',
        role: 'external',
    },
    end: { phase: 'Funding', owner: 'System', sla: '< 5s', description: 'Process completed', role: 'automation' },
};

const technicalNodeDefs: NodeDefinition[] = [
    { id: 'start', label: 'START', type: 'startend', meta: nodeMeta.start },
    { id: 'doc-processing', label: 'Document Processing', subtitle: 'OCR, Extraction, Classification', type: 'process', meta: nodeMeta['doc-processing'] },
    { id: 'doc-verification', label: 'Document Verification', subtitle: 'Completeness, Consistency, Fraud', type: 'process', meta: nodeMeta['doc-verification'] },
    { id: 'doc-check', label: 'Risk Check', type: 'gateway', meta: nodeMeta['doc-check'] },
    { id: 'reject-high-risk', label: 'Reject Application', subtitle: 'High Risk Detected', type: 'process', meta: nodeMeta['reject-high-risk'] },
    { id: 'credit-scoring', label: 'Credit Scoring', subtitle: 'ML Model (XGBoost)', type: 'process', meta: nodeMeta['credit-scoring'] },
    { id: 'parallel-split', label: 'Parallel Analysis', type: 'gateway', meta: nodeMeta['parallel-split'] },
    { id: 'income-analysis', label: 'Income Analysis', subtitle: 'Bank Statement Analysis', type: 'process', meta: nodeMeta['income-analysis'] },
    { id: 'debt-assessment', label: 'Debt Assessment', subtitle: 'DTI Calculation', type: 'process', meta: nodeMeta['debt-assessment'] },
    { id: 'compliance-check', label: 'Compliance Check', subtitle: 'KYC/AML Verification', type: 'process', meta: nodeMeta['compliance-check'] },
    { id: 'report-generation', label: 'Report Generation', subtitle: 'Synthesize Findings', type: 'process', meta: nodeMeta['report-generation'] },
    { id: 'routing-decision', label: 'Routing Decision', type: 'gateway', meta: nodeMeta['routing-decision'] },
    { id: 'auto-approve', label: 'Auto-Approve', subtitle: 'Score ≥750, Low Risk', type: 'process', meta: nodeMeta['auto-approve'] },
    { id: 'manual-review', label: 'Manual Review', subtitle: 'Underwriter Decision', type: 'process', meta: nodeMeta['manual-review'] },
    { id: 'auto-reject', label: 'Auto-Reject', subtitle: 'Score <600 or Compliance Fail', type: 'process', meta: nodeMeta['auto-reject'] },
    { id: 'final-decision', label: 'Final Decision', type: 'gateway', meta: nodeMeta['final-decision'] },
    { id: 'update-banking', label: 'Update Banking System', subtitle: 'Temenos/Finacle', type: 'process', meta: nodeMeta['update-banking'] },
    { id: 'disburse', label: 'Generate Contract & Disburse', subtitle: 'Final Loan Processing', type: 'process', meta: nodeMeta.disburse },
    { id: 'notify', label: 'Notify Applicant', subtitle: 'Email/SMS/Push', type: 'process', meta: nodeMeta.notify },
    { id: 'end', label: 'END', type: 'startend', meta: nodeMeta.end },
];

const businessNodeDefs: NodeDefinition[] = [
    { id: 'start', label: 'START', type: 'startend', meta: businessMeta.start },
    {
        id: 'intake-packet',
        label: 'Intake & Docs',
        subtitle: 'ID, POI, POA collected',
        type: 'process',
        meta: businessMeta['intake-packet'],
        aggregateFrom: ['doc-processing', 'doc-verification'],
    },
    {
        id: 'risk-screen',
        label: 'Screening & Scoring',
        subtitle: 'Risk gates + score',
        type: 'process',
        meta: businessMeta['risk-screen'],
        aggregateFrom: ['doc-check', 'credit-scoring', 'reject-high-risk'],
    },
    {
        id: 'analysis-bundle',
        label: 'Income & Compliance',
        subtitle: '3 checks in progress',
        type: 'process',
        meta: businessMeta['analysis-bundle'],
        aggregateFrom: ['parallel-split', 'income-analysis', 'debt-assessment', 'compliance-check'],
    },
    {
        id: 'decision-band',
        label: 'Decisioning',
        subtitle: 'Auto / Manual / Reject',
        type: 'process',
        meta: businessMeta['decision-band'],
        aggregateFrom: ['report-generation', 'routing-decision', 'auto-approve', 'manual-review', 'auto-reject', 'final-decision'],
    },
    {
        id: 'funding-band',
        label: 'Funding & Notify',
        subtitle: 'Core push, disburse, comms',
        type: 'process',
        meta: businessMeta['funding-band'],
        aggregateFrom: ['update-banking', 'disburse', 'notify'],
    },
    { id: 'end', label: 'END', type: 'startend', meta: businessMeta.end },
];

const statusStyles = {
    completed: { bg: '#e8f5e9', border: '#16a34a', text: '#14532d', icon: <CheckCircleIcon fontSize="small" htmlColor="#14532d" /> },
    'in-progress': { bg: '#fff7ed', border: '#f59e0b', text: '#b45309', icon: <AccessTimeIcon fontSize="small" htmlColor="#b45309" /> },
    pending: { bg: '#ffffff', border: '#cbd5e1', text: '#475569', icon: <AccessTimeIcon fontSize="small" htmlColor="#64748b" /> },
};

const getStatusColor = (status?: string) => statusStyles[status as keyof typeof statusStyles] ?? statusStyles.pending;

const ProcessNode = ({ data, selected }: { data: any; selected: boolean }) => {
    const statusColors = getStatusColor(data.status);
    const dimmed = data.dimmed;
    const isActive = data.isActive;

    const content = (
        <Box
            sx={{
                minWidth: '170px',
                maxWidth: '200px',
                padding: '12px 14px',
                border: `2px solid ${statusColors.border}`,
                backgroundColor: statusColors.bg,
                borderRadius: '10px',
                textAlign: 'left',
                boxShadow: selected || isActive ? '0 10px 22px rgba(0,0,0,0.16)' : '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.18s ease',
                cursor: 'pointer',
                position: 'relative',
                opacity: dimmed ? 0.35 : 1,
                filter: dimmed ? 'grayscale(0.35)' : 'none',
                transform: isActive ? 'scale(1.03)' : 'scale(1)',
                '&:hover': {
                    boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                    transform: 'translateY(-2px)',
                },
            }}
        >
            <Handle type="target" position={Position.Top} />
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.25 }}>
                {statusColors.icon}
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: statusColors.text }}>
                    {data.label}
                </Typography>
            </Stack>
            {data.subtitle && (
                <Typography sx={{ fontSize: '10px', color: '#475569', mb: 0.5 }}>
                    {data.subtitle}
                </Typography>
            )}
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                <Chip
                    label={data.meta?.owner ?? 'Owner'}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '10px', borderRadius: 999 }}
                />
                <Chip
                    label={`SLA ${data.meta?.sla ?? '—'}`}
                    size="small"
                    sx={{ height: 22, fontSize: '10px', borderRadius: 999, bgcolor: '#eef2ff' }}
                />
            </Stack>
            <Handle type="source" position={Position.Bottom} />
        </Box>
    );

    return (
        <Tooltip
            arrow
            placement="top"
            title={
                <Box>
                    <Typography variant="body2" fontWeight={700}>{data.label}</Typography>
                    {data.meta?.description && (
                        <>
                            <Typography variant="caption">{data.meta.description}</Typography><br />
                        </>
                    )}
                    <Typography variant="caption">Owner: {data.meta?.owner ?? '—'}</Typography><br />
                    <Typography variant="caption">SLA: {data.meta?.sla ?? '—'}</Typography><br />
                    <Typography variant="caption">Phase: {data.meta?.phase ?? '—'}</Typography><br />
                    <Typography variant="caption">Status: {data.status ?? 'pending'}</Typography><br />
                    <Typography variant="caption">Visited: {data.inHistory ? 'Yes' : 'No'}</Typography>
                </Box>
            }
        >
            {content}
        </Tooltip>
    );
};

const GatewayNode = ({ data, selected }: { data: any; selected: boolean }) => {
    const content = (
        <Box
            sx={{
                width: '86px',
                height: '86px',
                border: '2px solid #94a3b8',
                backgroundColor: '#ffffff',
                transform: 'rotate(45deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: selected ? '0 8px 18px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.18s ease',
                cursor: 'pointer',
                position: 'relative',
                '&:hover': {
                    boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                },
            }}
        >
            <Handle type="target" position={Position.Top} />
            <Handle type="source" position={Position.Bottom} />
            <Handle type="source" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <Typography
                sx={{
                    transform: 'rotate(-45deg)',
                    fontSize: '10px',
                    fontWeight: 700,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    color: '#334155',
                }}
            >
                {data.label}
            </Typography>
        </Box>
    );

    return (
        <Tooltip
            arrow
            placement="top"
            title={
                <Box>
                    <Typography variant="body2" fontWeight={700}>{data.label}</Typography>
                    {data.meta?.description && (
                        <>
                            <Typography variant="caption">{data.meta.description}</Typography><br />
                        </>
                    )}
                    <Typography variant="caption">Owner: {data.meta?.owner ?? '—'}</Typography><br />
                    <Typography variant="caption">SLA: {data.meta?.sla ?? '—'}</Typography><br />
                    <Typography variant="caption">Phase: {data.meta?.phase ?? '—'}</Typography><br />
                    <Typography variant="caption">Status: {data.status ?? 'pending'}</Typography><br />
                    <Typography variant="caption">Visited: {data.inHistory ? 'Yes' : 'No'}</Typography>
                </Box>
            }
        >
            {content}
        </Tooltip>
    );
};

const StartEndNode = ({ data, selected }: { data: any; selected: boolean }) => {
    const isEnd = data.isEnd;
    const content = (
        <Box
            sx={{
                width: isEnd ? '54px' : '64px',
                height: isEnd ? '54px' : '64px',
                borderRadius: '50%',
                border: `3px solid ${isEnd ? '#94a3b8' : '#1f6feb'}`,
                backgroundColor: isEnd ? '#e2e8f0' : '#1f6feb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: selected ? '0 8px 18px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.18s ease',
                cursor: 'pointer',
                position: 'relative',
                '&:hover': {
                    boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                },
            }}
        >
            {!isEnd && <Handle type="source" position={Position.Right} />}
            {isEnd && <Handle type="target" position={Position.Left} />}
            <Typography sx={{ fontSize: '10px', fontWeight: 800, color: isEnd ? '#334155' : '#fff' }}>
                {isEnd ? 'END' : 'START'}
            </Typography>
        </Box>
    );

    return (
        <Tooltip
            arrow
            placement="top"
            title={
                <Box>
                    <Typography variant="body2" fontWeight={700}>{data.label ?? (isEnd ? 'End' : 'Start')}</Typography>
                    {data.meta?.description && (
                        <>
                            <Typography variant="caption">{data.meta.description}</Typography><br />
                        </>
                    )}
                    <Typography variant="caption">Owner: {data.meta?.owner ?? '—'}</Typography><br />
                    <Typography variant="caption">SLA: {data.meta?.sla ?? '—'}</Typography><br />
                    <Typography variant="caption">Phase: {data.meta?.phase ?? '—'}</Typography><br />
                    <Typography variant="caption">Status: {data.status ?? 'pending'}</Typography><br />
                    <Typography variant="caption">Visited: {data.inHistory ? 'Yes' : 'No'}</Typography>
                </Box>
            }
        >
            {content}
        </Tooltip>
    );
};

const nodeTypes: NodeTypes = {
    process: ProcessNode,
    gateway: GatewayNode,
    startend: StartEndNode,
};

type Layout = {
    columnWidth: number;
    laneHeight: number;
    stackOffset: number;
    topOffset: number;
    leftOffset: number;
};

const mapStepToBusiness = (step?: string) => {
    if (!step) return undefined;
    const businessMap: Record<string, string> = {
        'doc-processing': 'intake-packet',
        'doc-verification': 'intake-packet',
        'doc-check': 'risk-screen',
        'credit-scoring': 'risk-screen',
        'reject-high-risk': 'risk-screen',
        'parallel-split': 'analysis-bundle',
        'income-analysis': 'analysis-bundle',
        'debt-assessment': 'analysis-bundle',
        'compliance-check': 'analysis-bundle',
        'report-generation': 'decision-band',
        'routing-decision': 'decision-band',
        'auto-approve': 'decision-band',
        'manual-review': 'decision-band',
        'auto-reject': 'decision-band',
        'final-decision': 'decision-band',
        'update-banking': 'funding-band',
        'disburse': 'funding-band',
        'notify': 'funding-band',
    };
    return businessMap[step] ?? step;
};

const isExceptionStep = (id: string) => {
    return id.includes('reject') || id.includes('exception') || id.includes('manual-review') || id.includes('compliance');
};

const getPosition = (
    phase: Phase,
    role: Role,
    index: number,
    lanes: Array<{ id: Role; label: string; accent: string }>,
    layout: Layout
) => {
    const { columnWidth, laneHeight, stackOffset, topOffset, leftOffset } = layout;
    const phaseIdx = phaseOrder.indexOf(phase);
    const laneIdx = lanes.findIndex((l) => l.id === role);
    if (laneIdx === -1) return null;
    const baseY = topOffset + laneIdx * laneHeight;
    return {
        x: leftOffset + phaseIdx * columnWidth,
        y: baseY + 24 + index * stackOffset,
    };
};

const ProcessGraph = ({ onNodeClick, statuses, activeStep, viewMode, isSimulation, autoFocusActive }: ProcessGraphProps) => {
    const [isMounted, setIsMounted] = useState(false);
    const [pathHistory, setPathHistory] = useState<string[]>([]);
    const [hiddenLanes, setHiddenLanes] = useState<Set<Role>>(new Set());
    const [showPathOnly, setShowPathOnly] = useState<boolean>(true);
    const [fadeFuture, setFadeFuture] = useState<boolean>(true);
    const [manualOnly, setManualOnly] = useState<boolean>(false);
    const [exceptionsOnly, setExceptionsOnly] = useState<boolean>(false);
    const [focusedPhase, setFocusedPhase] = useState<Phase | 'all'>('all');
    const theme = useTheme();
    const isLgDown = useMediaQuery(theme.breakpoints.down('lg'));
    const isMdDown = useMediaQuery(theme.breakpoints.down('md'));
    const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));
    const reactFlowInstance = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const preferenceKey = 'workflow-preferences-underwriting';

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = window.localStorage.getItem(preferenceKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                setHiddenLanes(new Set((parsed.hiddenLanes ?? []) as Role[]));
                setShowPathOnly(parsed.showPathOnly ?? true);
                setFadeFuture(parsed.fadeFuture ?? true);
                setManualOnly(parsed.manualOnly ?? false);
                setExceptionsOnly(parsed.exceptionsOnly ?? false);
            }
        } catch {
            // ignore malformed prefs
        }
    }, [preferenceKey]);

    useEffect(() => {
        if (!isMounted || typeof window === 'undefined') return;
        window.localStorage.setItem(
            preferenceKey,
            JSON.stringify({
                hiddenLanes: Array.from(hiddenLanes),
                showPathOnly,
                fadeFuture,
                manualOnly,
                exceptionsOnly,
            })
        );
    }, [fadeFuture, hiddenLanes, isMounted, manualOnly, preferenceKey, showPathOnly, exceptionsOnly]);

    useEffect(() => {
        if (activeStep) {
            setPathHistory((prev) => (prev.includes(activeStep) ? prev : [...prev, activeStep]));
        }
    }, [activeStep]);

    const visibleLanes = useMemo(() => swimlanes.filter((lane) => !hiddenLanes.has(lane.id)), [hiddenLanes]);

    const lanesForLayout = useMemo(() => (visibleLanes.length > 0 ? visibleLanes : swimlanes), [visibleLanes]);

    const maxStackPerCell = useMemo(() => {
        const defs = viewMode === 'business' ? businessNodeDefs : technicalNodeDefs;
        const allowedRoles = new Set(lanesForLayout.map((lane) => lane.id));
        const counts: Record<string, number> = {};

        defs.forEach((def) => {
            if (!allowedRoles.has(def.meta.role)) return;
            const key = `${def.meta.phase}-${def.meta.role}`;
            counts[key] = (counts[key] ?? 0) + 1;
        });

        return Object.values(counts).reduce((max, count) => Math.max(max, count), 1);
    }, [lanesForLayout, viewMode]);

    const layout = useMemo<Layout>(() => {
        const columnWidth = isSmDown ? 180 : isMdDown ? 220 : isLgDown ? 260 : 300;
        const stackOffset = isSmDown ? 72 : isMdDown ? 88 : 100;
        const baseLaneHeight = viewMode === 'business' ? (isSmDown ? 200 : isMdDown ? 220 : 260) : (isSmDown ? 260 : isMdDown ? 300 : 340);
        const estimatedNodeHeight = viewMode === 'business' ? 120 : 170;
        const dynamicLaneHeight = 48 + estimatedNodeHeight + (maxStackPerCell - 1) * stackOffset;
        const laneHeight = Math.max(baseLaneHeight, dynamicLaneHeight);
        const topOffset = isSmDown ? 96 : isMdDown ? 110 : 130;
        const leftOffset = isSmDown ? 40 : isMdDown ? 60 : 80;

        return {
            columnWidth,
            laneHeight,
            stackOffset,
            topOffset,
            leftOffset,
        };
    }, [isLgDown, isMdDown, maxStackPerCell, viewMode]);

    const onNodeClickHandler = useCallback((_event: React.MouseEvent, node: Node) => {
        onNodeClick(node);
    }, [onNodeClick]);

    const onConnect = useCallback((params: any) => {
        setEdges((eds) => addEdge(params, eds));
    }, [setEdges]);

    const toggleLane = useCallback((laneId: Role) => {
        setHiddenLanes((prev) => {
            const next = new Set(prev);
            if (next.has(laneId)) {
                next.delete(laneId);
            } else {
                next.add(laneId);
            }
            return next;
        });
    }, []);

    const derivedEdges: Edge[] = useMemo(() => {
        if (viewMode === 'business') {
            return [
                { id: 'b1', source: 'start', target: 'intake-packet', type: 'smoothstep' },
                { id: 'b2', source: 'intake-packet', target: 'risk-screen', type: 'smoothstep', label: 'Docs validated' },
                { id: 'b3', source: 'risk-screen', target: 'analysis-bundle', type: 'smoothstep', label: 'Pass risk gates' },
                { id: 'b4', source: 'analysis-bundle', target: 'decision-band', type: 'smoothstep', label: 'Checks complete' },
                {
                    id: 'b5',
                    source: 'decision-band',
                    target: 'funding-band',
                    type: 'smoothstep',
                    label: 'Approve / Override / Reject',
                    style: { stroke: '#1f6feb' },
                    labelStyle: { fill: '#1f6feb', fontWeight: 700 },
                },
                { id: 'b6', source: 'funding-band', target: 'end', type: 'smoothstep' },
            ];
        }
        return [
            { id: 'e1', source: 'start', target: 'doc-processing', type: 'smoothstep' },
            { id: 'e2', source: 'doc-processing', target: 'doc-verification', type: 'smoothstep' },
            { id: 'e3', source: 'doc-verification', target: 'doc-check', type: 'smoothstep' },
            {
                id: 'e4-reject',
                source: 'doc-check',
                target: 'reject-high-risk',
                label: 'High Risk',
                type: 'smoothstep',
                style: { stroke: '#dc2626' },
                labelStyle: { fill: '#dc2626', fontWeight: 600 },
            },
            {
                id: 'e5',
                source: 'doc-check',
                target: 'credit-scoring',
                label: 'Pass',
                type: 'smoothstep',
            },
            { id: 'e6', source: 'credit-scoring', target: 'parallel-split', type: 'smoothstep' },
            { id: 'e7-1', source: 'parallel-split', target: 'income-analysis', type: 'smoothstep' },
            { id: 'e7-2', source: 'parallel-split', target: 'debt-assessment', type: 'smoothstep' },
            { id: 'e7-3', source: 'parallel-split', target: 'compliance-check', type: 'smoothstep' },
            { id: 'e8-1', source: 'income-analysis', target: 'report-generation', type: 'smoothstep' },
            { id: 'e8-2', source: 'debt-assessment', target: 'report-generation', type: 'smoothstep' },
            { id: 'e8-3', source: 'compliance-check', target: 'report-generation', type: 'smoothstep' },
            { id: 'e9', source: 'report-generation', target: 'routing-decision', type: 'smoothstep' },
            {
                id: 'e10-approve',
                source: 'routing-decision',
                target: 'auto-approve',
                label: 'Auto-Approve',
                type: 'smoothstep',
                style: { stroke: '#1f6feb' },
                labelStyle: { fill: '#1f6feb', fontWeight: 600 },
            },
            {
                id: 'e11-review',
                source: 'routing-decision',
                target: 'manual-review',
                label: 'Manual Review',
                type: 'smoothstep',
                style: { stroke: '#f59e0b' },
                labelStyle: { fill: '#b45309', fontWeight: 600 },
            },
            {
                id: 'e12-reject',
                source: 'routing-decision',
                target: 'auto-reject',
                label: 'Auto-Reject',
                type: 'smoothstep',
                style: { stroke: '#dc2626' },
                labelStyle: { fill: '#dc2626', fontWeight: 600 },
            },
            { id: 'e13-1', source: 'auto-approve', target: 'final-decision', type: 'smoothstep' },
            { id: 'e13-2', source: 'manual-review', target: 'final-decision', type: 'smoothstep' },
            { id: 'e14', source: 'final-decision', target: 'update-banking', type: 'smoothstep' },
            { id: 'e15', source: 'update-banking', target: 'disburse', type: 'smoothstep' },
            { id: 'e16', source: 'disburse', target: 'end', type: 'smoothstep' },
            {
                id: 'e17-notify',
                source: 'auto-reject',
                target: 'notify',
                type: 'smoothstep',
                style: { stroke: '#dc2626' },
            },
            { id: 'e18', source: 'notify', target: 'end', type: 'smoothstep' },
        ];
    }, [viewMode]);

    const technicalLabelMap = useMemo(() => {
        const map: Record<string, string> = {};
        technicalNodeDefs.forEach((d) => {
            map[d.id] = d.label;
        });
        return map;
    }, []);

    const businessLabelMap = useMemo(() => {
        const map: Record<string, string> = {};
        businessNodeDefs.forEach((d) => {
            map[d.id] = d.label;
        });
        return map;
    }, []);

    const getAggregatedStatus = useCallback((ids: string[]) => {
        if (ids.length === 0) return 'pending';
        const states = ids.map((id) => statuses[id]);
        const allCompleted = states.every((s) => s === 'completed');
        const anyInProgress = states.some((s) => s === 'in-progress');
        const anyCompleted = states.some((s) => s === 'completed');
        if (allCompleted) return 'completed';
        if (anyInProgress || anyCompleted) return 'in-progress';
        return 'pending';
    }, [hiddenLanes, statuses]);

    const derivedNodes: Node[] = useMemo(() => {
        const defs = viewMode === 'business' ? businessNodeDefs : technicalNodeDefs;
        const stackCounter: Record<string, number> = {};
        const activeId = viewMode === 'business' ? mapStepToBusiness(activeStep) : activeStep;
        const displayHistory = viewMode === 'business' ? pathHistory.map(mapStepToBusiness).filter(Boolean) as string[] : pathHistory;
        const lanesList = lanesForLayout;

        return defs
            .map((def) => {
                if (!lanesList.some((lane) => lane.id === def.meta.role)) return null;
                const cellKey = `${def.meta.phase}-${def.meta.role}`;
                const stackIndex = stackCounter[cellKey] ?? 0;
                stackCounter[cellKey] = stackIndex + 1;

                const status = def.aggregateFrom ? getAggregatedStatus(def.aggregateFrom) : (statuses[def.id] ?? 'pending');
                const isActive = activeId === def.id;
                const inHistory = displayHistory.includes(def.id);
                const matchesManual = !manualOnly || def.meta.role !== 'automation';
                const matchesException = !exceptionsOnly || isExceptionStep(def.id);
                const matchesPhase = focusedPhase === 'all' || def.meta.phase === focusedPhase;
                const pathDim = showPathOnly && activeId ? (!isActive && !inHistory) : false;
                const futureDim = fadeFuture && !inHistory && !isActive;
                const shouldDim = pathDim || futureDim || !matchesManual || !matchesException || !matchesPhase;

                const position = getPosition(def.meta.phase, def.meta.role, stackIndex, lanesList, layout);
                if (!position) return null;

                return {
                    id: def.id,
                    type: def.type,
                    position,
                    draggable: false,
                    data: {
                        label: viewMode === 'business' ? (def.businessLabel ?? def.label) : def.label,
                        subtitle: viewMode === 'business' ? (def.businessSubtitle ?? def.subtitle) : def.subtitle,
                        status,
                        meta: def.meta,
                        phase: def.meta.phase,
                        role: def.meta.role,
                        isEnd: def.id === 'end',
                        dimmed: shouldDim,
                        inHistory,
                        isActive,
                    },
                };
            })
            .filter(Boolean) as Node[];
    }, [activeStep, exceptionsOnly, fadeFuture, focusedPhase, getAggregatedStatus, lanesForLayout, layout, manualOnly, pathHistory, showPathOnly, statuses, viewMode]);

    useEffect(() => {
        setNodes(derivedNodes);
    }, [derivedNodes, setNodes]);

    useEffect(() => {
        const visibleSet = new Set(derivedNodes.map((n) => n.id));
        const filteredEdges = derivedEdges.filter((edge) => visibleSet.has(edge.source) && visibleSet.has(edge.target));
        setEdges(filteredEdges);
    }, [derivedEdges, derivedNodes, setEdges]);

    const centerOnActive = useCallback(() => {
        if (!activeStep) return;
        const targetId = viewMode === 'business' ? mapStepToBusiness(activeStep) : activeStep;
        const node = derivedNodes.find((n) => n.id === targetId);
        if (node) {
            reactFlowInstance.fitView({ nodes: [node], padding: isSmDown ? 0.35 : 0.6, duration: 400 });
        }
    }, [activeStep, derivedNodes, reactFlowInstance, viewMode, isSmDown]);

    useEffect(() => {
        if (!autoFocusActive) return;
        centerOnActive();
    }, [autoFocusActive, centerOnActive, activeStep]);

    useEffect(() => {
        if (!derivedNodes.length) return;
        reactFlowInstance.fitView({
            padding: isSmDown ? 0.25 : 0.4,
            duration: 300,
        });
    }, [reactFlowInstance, viewMode, layout.columnWidth, layout.laneHeight, lanesForLayout.length, isSmDown, derivedNodes.length]);

    useEffect(() => {
        if (focusedPhase === 'all') return;
        const phaseNodes = derivedNodes.filter((n) => n.data?.phase === focusedPhase);
        if (phaseNodes.length > 0) {
            reactFlowInstance.fitView({ nodes: phaseNodes, padding: 0.45, duration: 400 });
        }
    }, [derivedNodes, focusedPhase, reactFlowInstance]);

    const historyLabels = useMemo(() => {
        if (viewMode === 'business') return businessLabelMap;
        return technicalLabelMap;
    }, [businessLabelMap, technicalLabelMap, viewMode]);

    const displayHistory = useMemo(() => {
        const mapped = viewMode === 'business' ? pathHistory.map(mapStepToBusiness).filter(Boolean) as string[] : pathHistory;
        return Array.from(new Set(mapped));
    }, [pathHistory, viewMode]);

    const activePhase = useMemo(() => {
        if (!activeStep) return null;
        const def = technicalNodeDefs.find((d) => d.id === activeStep);
        return def?.meta.phase ?? null;
    }, [activeStep]);

    const phaseSummaries = useMemo(() => {
        const summaries = phaseOrder.map((phase) => ({
            phase,
            totalSteps: 0,
            completedSteps: 0,
            inProgressSteps: 0,
            pendingSteps: 0,
            exceptions: 0,
        }));

        technicalNodeDefs.forEach((def) => {
            if (def.id === 'start' || def.id === 'end') return;
            if (hiddenLanes.has(def.meta.role)) return;
            const summary = summaries.find((s) => s.phase === def.meta.phase);
            if (!summary) return;
            summary.totalSteps += 1;
            const status = statuses[def.id] ?? 'pending';
            if (status === 'completed') summary.completedSteps += 1;
            if (status === 'in-progress') summary.inProgressSteps += 1;
            if (status === 'pending') summary.pendingSteps += 1;
            if (def.id.includes('reject') && status === 'completed') summary.exceptions += 1;
            if (def.id === 'compliance-check' && status === 'in-progress') summary.exceptions += 1;
        });

        return summaries.map((s) => {
            const progress = s.totalSteps === 0 ? 0 : Math.round((s.completedSteps / s.totalSteps) * 100);
            const status: 'completed' | 'in-progress' | 'pending' =
                s.completedSteps === s.totalSteps ? 'completed' : s.completedSteps > 0 || s.inProgressSteps > 0 ? 'in-progress' : 'pending';
            const estimatedTimeRemaining = s.pendingSteps > 0 ? `~${Math.max(1, s.pendingSteps * 2)}m` : '—';
            return { ...s, progress, status, estimatedTimeRemaining };
        });
    }, [statuses]);

    const handlePhaseClick = useCallback((phase: Phase) => {
        setFocusedPhase((prev) => (prev === phase ? 'all' : phase));
        setShowPathOnly(false);
        setFadeFuture(false);
    }, []);

    if (!isMounted) {
        return (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '500px',
                }}
            >
                <Typography>Loading workflow diagram...</Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                position: 'relative',
                minHeight: '640px',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Main graph container - always visible and fills space */}
            <Box
                sx={{
                    position: 'relative',
                    flexGrow: 1,
                    minHeight: 520,
                    borderRadius: 2,
                    overflow: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: '#f8fafc',
                }}
            >
                {/* Scrollable info panel - can be scrolled away */}
                <Box
                    sx={{
                        position: 'relative',
                        zIndex: 100,
                        backgroundColor: 'rgba(248, 250, 252, 0.98)',
                        backdropFilter: 'blur(8px)',
                        borderBottom: '2px solid',
                        borderColor: 'divider',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                >
                    <Stack spacing={1} sx={{ p: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="caption" color="text.secondary">Path history:</Typography>
                            {displayHistory.map((nodeId) => (
                                <Chip key={nodeId} label={historyLabels[nodeId] ?? nodeId} size="small" variant="outlined" />
                            ))}
                            {displayHistory.length === 0 && (
                                <Chip label="No steps yet" size="small" variant="outlined" />
                            )}
                        </Stack>

                        <Stack direction="row" spacing={0.75} flexWrap="wrap" alignItems="center">
                            <Chip
                                icon={<RouteIcon fontSize="small" />}
                                label={showPathOnly ? 'Path: actual' : 'Path: full'}
                                color={showPathOnly ? 'primary' : 'default'}
                                variant={showPathOnly ? 'filled' : 'outlined'}
                                clickable
                                onClick={() => setShowPathOnly((prev) => !prev)}
                            />
                            <Chip
                                icon={fadeFuture ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                label={fadeFuture ? 'Fade future branches' : 'Show future branches'}
                                color={fadeFuture ? 'warning' : 'default'}
                                variant={fadeFuture ? 'filled' : 'outlined'}
                                clickable
                                onClick={() => setFadeFuture((prev) => !prev)}
                            />
                            <Chip
                                icon={<FilterAltIcon fontSize="small" />}
                                label="Manual only"
                                color={manualOnly ? 'warning' : 'default'}
                                variant={manualOnly ? 'filled' : 'outlined'}
                                clickable
                                onClick={() => setManualOnly((prev) => !prev)}
                            />
                            <Chip
                                icon={<ErrorOutlineIcon fontSize="small" />}
                                label="Exceptions"
                                color={exceptionsOnly ? 'error' : 'default'}
                                variant={exceptionsOnly ? 'filled' : 'outlined'}
                                clickable
                                onClick={() => setExceptionsOnly((prev) => !prev)}
                            />
                            <Button
                                size="small"
                                startIcon={<CenterFocusStrongIcon fontSize="small" />}
                                onClick={centerOnActive}
                                variant="outlined"
                            >
                                Center on active
                            </Button>
                            {isSimulation && <Chip label="Simulation Mode" size="small" color="secondary" variant="outlined" />}
                        </Stack>

                        <Divider />

                        <Stack direction="row" spacing={0.75} flexWrap="wrap" alignItems="center">
                            <Typography variant="caption" color="text.secondary">Lanes:</Typography>
                            {swimlanes.map((lane) => (
                                <Chip
                                    key={lane.id}
                                    label={lane.label}
                                    icon={hiddenLanes.has(lane.id) ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                    color={hiddenLanes.has(lane.id) ? 'default' : 'primary'}
                                    variant={hiddenLanes.has(lane.id) ? 'outlined' : 'filled'}
                                    clickable
                                    onClick={() => toggleLane(lane.id)}
                                />
                            ))}
                        </Stack>

                        {/* Phase summary cards removed to avoid duplicate row above the graph */}
                    </Stack>
                </Box>

                {/* Phase headers - sticky at top */}
                <Box
                    sx={{
                        position: 'sticky',
                        top: 0,
                        left: layout.leftOffset - 60,
                        right: 0,
                        height: layout.topOffset - 16,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${phaseOrder.length}, minmax(${isSmDown ? 160 : 200}px, ${layout.columnWidth}px))`,
                        pointerEvents: 'none',
                        zIndex: 10,
                        gap: 8,
                        px: 1,
                        backgroundColor: '#f8fafc',
                        paddingLeft: `${layout.leftOffset - 60}px`,
                        overflowX: 'auto',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 transparent',
                        overscrollBehaviorX: 'contain',
                    }}
                >
                    {phaseSummaries.map((summary) => {
                        const isFocused = focusedPhase === summary.phase;
                        const isActivePhase = activePhase === summary.phase;
                        const color = summary.status === 'completed' ? '#28a745' : summary.status === 'in-progress' ? '#f59e0b' : '#94a3b8';
                        const scale = isActivePhase ? 1.03 : summary.status === 'in-progress' ? 1.015 : 1;
                        return (
                            <Paper
                                key={summary.phase}
                                variant="outlined"
                                sx={{
                                    p: 1.25,
                                    backgroundColor: '#ffffff',
                                    borderStyle: 'solid',
                                    borderColor: isActivePhase ? theme.palette.primary.main : isSimulation ? '#a78bfa' : 'divider',
                                    boxShadow: isActivePhase
                                        ? '0 10px 24px rgba(0,0,0,0.12)'
                                        : '0 4px 12px rgba(0,0,0,0.04)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.18s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                                    outline: isFocused ? `2px solid ${theme.palette.primary.light}` : 'none',
                                    pointerEvents: 'auto',
                                    transform: `scale(${scale})`,
                                    '&:hover': {
                                        boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
                                        transform: `scale(${Math.max(scale, 1.03)})`,
                                    },
                                }}
                                role="button"
                                tabIndex={0}
                                onClick={() => handlePhaseClick(summary.phase)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handlePhaseClick(summary.phase);
                                    }
                                }}
                            >
                                <Stack spacing={0.5}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="subtitle2" fontWeight={700}>{summary.phase}</Typography>
                                        <Chip
                                            label={`${summary.completedSteps}/${summary.totalSteps}`}
                                            size="small"
                                            sx={{ height: 22, fontSize: '10px', borderRadius: 999, bgcolor: '#f8fafc' }}
                                        />
                                    </Stack>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                        <Chip
                                            label={summary.status}
                                            size="small"
                                            sx={{ height: 22, fontSize: '10px', borderRadius: 999, color, borderColor: color }}
                                            variant="outlined"
                                        />
                                        {summary.exceptions > 0 && (
                                            <Chip
                                                label={`${summary.exceptions} exception${summary.exceptions > 1 ? 's' : ''}`}
                                                size="small"
                                                color="error"
                                                sx={{ height: 22, fontSize: '10px', borderRadius: 999 }}
                                            />
                                        )}
                                        <Chip
                                            label={`ETA ${summary.estimatedTimeRemaining}`}
                                            size="small"
                                            variant="outlined"
                                            sx={{ height: 22, fontSize: '10px', borderRadius: 999 }}
                                        />
                                    </Stack>
                                    <LinearProgress
                                        variant="determinate"
                                        value={summary.progress}
                                        sx={{
                                            height: 6,
                                            borderRadius: 999,
                                            bgcolor: '#e2e8f0',
                                            transition: 'transform 0.18s ease',
                                            transform: isActivePhase ? 'scaleX(1.02)' : 'scaleX(1)',
                                        }}
                                    />
                                </Stack>
                            </Paper>
                        );
                    })}
                </Box>

                <Box
                    sx={{
                        position: 'absolute',
                        top: layout.topOffset - 6,
                        left: layout.leftOffset - 60,
                        right: 0,
                        bottom: 0,
                        display: 'grid',
                        gridTemplateRows: `repeat(${lanesForLayout.length}, ${layout.laneHeight}px)`,
                        pointerEvents: 'none',
                        zIndex: 0,
                    }}
                >
                    {lanesForLayout.map((lane, idx) => (
                        <Box
                            key={lane.id}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: `60px repeat(${phaseOrder.length}, ${layout.columnWidth}px)`,
                                borderTop: idx === 0 ? '1px solid #e2e8f0' : 'none',
                                borderBottom: '1px solid #e2e8f0',
                                background: idx % 2 === 0 ? '#f8fafc' : '#ffffff',
                                alignItems: 'stretch',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    pl: 1,
                                    pr: 1,
                                    borderRight: '1px solid #e2e8f0',
                                    bgcolor: '#f1f5f9',
                                    color: '#334155',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 2,
                                }}
                            >
                                {lane.label}
                            </Box>
                            {phaseOrder.map((phase) => (
                                <Box
                                    key={`${lane.id}-${phase}`}
                                    sx={{
                                        borderRight: '1px solid #f1f5f9',
                                        borderLeft: '1px solid #f8fafc',
                                        background: 'transparent',
                                    }}
                                />
                            ))}
                        </Box>
                    ))}
                </Box>

                <Box
                    sx={{
                        position: 'relative',
                        zIndex: 5,
                        height: '100%',
                        minWidth: '100%',
                        maxWidth: '100%',
                        minHeight: lanesForLayout.length * layout.laneHeight + layout.topOffset + 120,
                    }}
                >
                    <ReactFlow
                        key={viewMode}
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClickHandler}
                        nodeTypes={nodeTypes}
                        minZoom={isMdDown ? 0.75 : 0.8}
                        maxZoom={isMdDown ? 1.05 : 1.2}
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: true,
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                            },
                        }}
                        proOptions={{ hideAttribution: true }}
                        nodesDraggable={false}
                        panOnDrag={false}
                        panOnScroll={false}
                        zoomOnScroll={false}
                        zoomOnPinch={false}
                        zoomOnDoubleClick={false}
                        preventScrolling={false}
                    >
                        <Background color="#e2e8f0" gap={20} />
                        <Controls showInteractive={false} />
                    </ReactFlow>
                </Box>
            </Box>
        </Box>
    );
};

export default ProcessGraph;
