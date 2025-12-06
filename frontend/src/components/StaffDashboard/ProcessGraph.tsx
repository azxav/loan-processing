import { useCallback, useMemo, useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
    type NodeTypes,
    type Connection,
    addEdge,
    useNodesState,
    useEdgesState,
    MarkerType,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface ProcessGraphProps {
    onNodeClick: (node: Node) => void;
}

// Custom Node Components
const ProcessNode = ({ data, selected }: { data: any; selected: boolean }) => {
    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'completed': return { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' };
            case 'in-progress': return { bg: '#fff3e0', border: '#ff9800', text: '#f57c00' };
            case 'pending': return { bg: '#fff', border: '#999', text: '#666' };
            default: return { bg: '#fff', border: '#999', text: '#666' };
        }
    };

    const getTypeColor = (type?: string) => {
        switch (type) {
            case 'ROBOT': return { bg: '#e3f2fd', text: '#1976d2' };
            case 'AGENT': return { bg: '#f3e5f5', text: '#7b1fa2' };
            case 'HUMAN': return { bg: '#fff3e0', text: '#f57c00' };
            case 'API': return { bg: '#e8f5e9', text: '#388e3c' };
            default: return { bg: '#f5f5f5', text: '#666' };
        }
    };

    const statusColors = getStatusColor(data.status);
    const typeColors = getTypeColor(data.type);

    return (
        <Box
            sx={{
                minWidth: '160px',
                maxWidth: '200px',
                padding: '12px 16px',
                border: `2px solid ${statusColors.border}`,
                backgroundColor: statusColors.bg,
                borderRadius: '8px',
                textAlign: 'center',
                boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                cursor: 'pointer',
                position: 'relative',
                '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    transform: 'translateY(-2px)',
                },
            }}
        >
            <Handle type="target" position={Position.Top} />
            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: statusColors.text, mb: 0.5 }}>
                {data.label}
            </Typography>
            {data.subtitle && (
                <Typography sx={{ fontSize: '9px', color: '#666', mb: 1 }}>
                    {data.subtitle}
                </Typography>
            )}
            {data.type && (
                <Chip
                    label={data.type}
                    size="small"
                    sx={{
                        height: '20px',
                        fontSize: '9px',
                        backgroundColor: typeColors.bg,
                        color: typeColors.text,
                        fontWeight: 600,
                    }}
                />
            )}
            <Handle type="source" position={Position.Bottom} />
        </Box>
    );
};

const GatewayNode = ({ data, selected }: { data: any; selected: boolean }) => {
    return (
        <Box
            sx={{
                width: '80px',
                height: '80px',
                border: '2px solid #666',
                backgroundColor: '#fff',
                transform: 'rotate(45deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                cursor: 'pointer',
                position: 'relative',
                '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
                    fontWeight: 600,
                    textAlign: 'center',
                    lineHeight: 1.2,
                }}
            >
                {data.label}
            </Typography>
        </Box>
    );
};

const StartEndNode = ({ data, selected }: { data: any; selected: boolean }) => {
    const isEnd = data.isEnd;
    return (
        <Box
            sx={{
                width: isEnd ? '50px' : '60px',
                height: isEnd ? '50px' : '60px',
                borderRadius: '50%',
                border: '3px solid #333',
                backgroundColor: isEnd ? '#e0e0e0' : '#4caf50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                cursor: 'pointer',
                position: 'relative',
                '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
            }}
        >
            {!isEnd && <Handle type="source" position={Position.Right} />}
            {isEnd && <Handle type="target" position={Position.Left} />}
            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: isEnd ? '#333' : '#fff' }}>
                {isEnd ? 'END' : 'START'}
            </Typography>
        </Box>
    );
};

const nodeTypes: NodeTypes = {
    process: ProcessNode,
    gateway: GatewayNode,
    startend: StartEndNode,
};


const ProcessGraph = ({ onNodeClick }: ProcessGraphProps) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Define initial nodes
    const initialNodes: Node[] = useMemo(() => [
        {
            id: 'start',
            type: 'startend',
            data: { label: 'START', isEnd: false },
            position: { x: 50, y: 200 },
        },
        {
            id: 'doc-processing',
            type: 'process',
            data: {
                label: 'Document Processing',
                subtitle: 'OCR, Extraction, Classification',
                status: 'completed',
                type: 'ROBOT',
            },
            position: { x: 200, y: 200 },
        },
        {
            id: 'doc-verification',
            type: 'process',
            data: {
                label: 'Document Verification',
                subtitle: 'Completeness, Consistency, Fraud',
                status: 'completed',
                type: 'AGENT',
            },
            position: { x: 400, y: 200 },
        },
        {
            id: 'doc-check',
            type: 'gateway',
            data: { label: 'Risk\nCheck' },
            position: { x: 600, y: 190 },
        },
        {
            id: 'reject-high-risk',
            type: 'process',
            data: {
                label: 'Reject Application',
                subtitle: 'High Risk Detected',
                status: 'pending',
                type: 'API',
            },
            position: { x: 400, y: 320 },
        },
        {
            id: 'credit-scoring',
            type: 'process',
            data: {
                label: 'Credit Scoring',
                subtitle: 'ML Model (XGBoost)',
                status: 'completed',
                type: 'ROBOT',
            },
            position: { x: 800, y: 200 },
        },
        {
            id: 'parallel-split',
            type: 'gateway',
            data: { label: 'Parallel\nAnalysis' },
            position: { x: 1000, y: 190 },
        },
        {
            id: 'income-analysis',
            type: 'process',
            data: {
                label: 'Income Analysis',
                subtitle: 'Bank Statement Analysis',
                status: 'completed',
                type: 'AGENT',
            },
            position: { x: 1200, y: 100 },
        },
        {
            id: 'debt-assessment',
            type: 'process',
            data: {
                label: 'Debt Assessment',
                subtitle: 'DTI Calculation',
                status: 'completed',
                type: 'AGENT',
            },
            position: { x: 1200, y: 200 },
        },
        {
            id: 'compliance-check',
            type: 'process',
            data: {
                label: 'Compliance Check',
                subtitle: 'KYC/AML Verification',
                status: 'completed',
                type: 'AGENT',
            },
            position: { x: 1200, y: 300 },
        },
        {
            id: 'report-generation',
            type: 'process',
            data: {
                label: 'Report Generation',
                subtitle: 'Synthesize Findings',
                status: 'in-progress',
                type: 'AGENT',
            },
            position: { x: 1400, y: 200 },
        },
        {
            id: 'routing-decision',
            type: 'gateway',
            data: { label: 'Routing\nDecision' },
            position: { x: 1600, y: 190 },
        },
        {
            id: 'auto-approve',
            type: 'process',
            data: {
                label: 'Auto-Approve',
                subtitle: 'Score ≥750, Low Risk',
                status: 'pending',
                type: 'ROBOT',
            },
            position: { x: 1800, y: 100 },
        },
        {
            id: 'manual-review',
            type: 'process',
            data: {
                label: 'Manual Review',
                subtitle: 'Underwriter Decision',
                status: 'pending',
                type: 'HUMAN',
            },
            position: { x: 1800, y: 200 },
        },
        {
            id: 'auto-reject',
            type: 'process',
            data: {
                label: 'Auto-Reject',
                subtitle: 'Score <600 or Compliance Fail',
                status: 'pending',
                type: 'ROBOT',
            },
            position: { x: 1800, y: 300 },
        },
        {
            id: 'final-decision',
            type: 'gateway',
            data: { label: 'Final\nDecision' },
            position: { x: 2000, y: 190 },
        },
        {
            id: 'update-banking',
            type: 'process',
            data: {
                label: 'Update Banking System',
                subtitle: 'Temenos/Finacle',
                status: 'pending',
                type: 'API',
            },
            position: { x: 2200, y: 200 },
        },
        {
            id: 'disburse',
            type: 'process',
            data: {
                label: 'Generate Contract & Disburse',
                subtitle: 'Final Loan Processing',
                status: 'pending',
                type: 'ROBOT',
            },
            position: { x: 2400, y: 200 },
        },
        {
            id: 'notify',
            type: 'process',
            data: {
                label: 'Notify Applicant',
                subtitle: 'Email/SMS/Push',
                status: 'pending',
                type: 'API',
            },
            position: { x: 2200, y: 320 },
        },
        {
            id: 'end',
            type: 'startend',
            data: { label: 'END', isEnd: true },
            position: { x: 2600, y: 205 },
        },
    ], []);

    // Define initial edges
    const initialEdges: Edge[] = useMemo(() => [
        { id: 'e1', source: 'start', target: 'doc-processing', type: 'smoothstep' },
        { id: 'e2', source: 'doc-processing', target: 'doc-verification', type: 'smoothstep' },
        { id: 'e3', source: 'doc-verification', target: 'doc-check', type: 'smoothstep' },
        {
            id: 'e4-reject',
            source: 'doc-check',
            target: 'reject-high-risk',
            label: 'High Risk',
            type: 'smoothstep',
            style: { stroke: '#d32f2f' },
            labelStyle: { fill: '#d32f2f', fontWeight: 600 },
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
            style: { stroke: '#1976d2' },
            labelStyle: { fill: '#1976d2', fontWeight: 600 },
        },
        {
            id: 'e11-review',
            source: 'routing-decision',
            target: 'manual-review',
            label: 'Manual Review',
            type: 'smoothstep',
            style: { stroke: '#f57c00' },
            labelStyle: { fill: '#f57c00', fontWeight: 600 },
        },
        {
            id: 'e12-reject',
            source: 'routing-decision',
            target: 'auto-reject',
            label: 'Auto-Reject',
            type: 'smoothstep',
            style: { stroke: '#d32f2f' },
            labelStyle: { fill: '#d32f2f', fontWeight: 600 },
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
            style: { stroke: '#d32f2f' },
        },
        { id: 'e18', source: 'notify', target: 'end', type: 'smoothstep' },
    ], []);

    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onNodeClickHandler = useCallback((_event: React.MouseEvent, node: Node) => {
        onNodeClick(node);
    }, [onNodeClick]);

    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge(params, eds));
    }, [setEdges]);

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
                minHeight: '500px',
            }}
        >
            <ReactFlow
                key="workflow-diagram"
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClickHandler}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={1.5}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: true,
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                    },
                }}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#aaa" gap={16} />
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        if (node.data?.status === 'completed') return '#4caf50';
                        if (node.data?.status === 'in-progress') return '#ff9800';
                        return '#999';
                    }}
                    maskColor="rgba(0, 0, 0, 0.1)"
                />
            </ReactFlow>
        </Box>
    );
};

export default ProcessGraph;
