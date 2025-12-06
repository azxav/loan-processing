import { type Node, type Edge } from '@xyflow/react';

export const initialNodes: Node[] = [
    {
        id: 'start',
        type: 'input',
        data: { label: 'Starts from Portal' },
        position: { x: 50, y: 150 },
        style: { background: '#fff', border: '1px solid #777', width: 100 },
    },
    {
        id: 'read-docs',
        data: { label: 'Read Application Documents (IDP)', status: 'completed', type: 'ROBOT' },
        position: { x: 250, y: 150 },
        style: { background: '#e6ffe6', border: '1px solid #009900', width: 150 },
    },
    {
        id: 'req-info',
        data: { label: 'Request Additional Information', status: 'pending', type: 'ROBOT' },
        position: { x: 250, y: 300 },
        style: { background: '#fff', border: '1px solid #777', width: 150 },
    },
    {
        id: 'validate-completeness',
        data: { label: 'Validate Application Completeness', status: 'completed', type: 'ROBOT' },
        position: { x: 500, y: 150 },
        style: { background: '#e6ffe6', border: '1px solid #009900', width: 150 },
    },
    {
        id: 'check-completeness',
        data: { label: 'Check Application Completeness', status: 'completed', type: 'GATEWAY' },
        position: { x: 700, y: 150 },
        style: { background: '#fff', border: '1px solid #777', width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    },
    {
        id: 'update-los',
        data: { label: 'Update LOS System', status: 'completed', type: 'ROBOT' },
        position: { x: 900, y: 150 },
        style: { background: '#e6ffe6', border: '1px solid #009900', width: 150 },
    },
    {
        id: 'parallel-validation',
        data: { label: 'Parallel Validation checks', status: 'completed', type: 'ROBOT' },
        position: { x: 1100, y: 150 },
        style: { background: '#e6ffe6', border: '1px solid #009900', width: 150 },
    },
    {
        id: 'risk-calc',
        data: { label: 'Risk Calculations: DTI, LTV, Affordability', status: 'completed', type: 'ROBOT' },
        position: { x: 1300, y: 150 },
        style: { background: '#e6ffe6', border: '1px solid #009900', width: 150 },
    },
    {
        id: 'eligibility',
        data: { label: 'Eligibility Analysis', status: 'in-progress', type: 'AGENT' },
        position: { x: 1500, y: 150 },
        style: { background: '#fff3cd', border: '2px solid #ffc107', width: 150 },
    },
    {
        id: 'review-gateway',
        data: { label: 'Review', status: 'pending', type: 'GATEWAY' },
        position: { x: 1700, y: 150 },
        style: { background: '#fff', border: '1px solid #777', width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    },
    {
        id: 'escalation',
        data: { label: 'Escalation Review', status: 'pending', type: 'HUMAN' },
        position: { x: 1700, y: 300 },
        style: { background: '#fff', border: '1px solid #777', width: 150 },
    },
    {
        id: 'update-los-contract',
        data: { label: 'Update LOS, Generate Contract', status: 'pending', type: 'ROBOT' },
        position: { x: 1900, y: 150 },
        style: { background: '#fff', border: '1px solid #777', width: 150 },
    },
    {
        id: 'reject-request',
        data: { label: 'Reject Loan Request', status: 'pending', type: 'API' },
        position: { x: 1900, y: 300 },
        style: { background: '#fff', border: '1px solid #777', width: 150 },
    },
    {
        id: 'notify-applicant',
        data: { label: 'Notify Applicant', status: 'pending', type: 'API' },
        position: { x: 2100, y: 150 },
        style: { background: '#fff', border: '1px solid #777', width: 150 },
    },
    {
        id: 'end',
        type: 'output',
        data: { label: 'End' },
        position: { x: 2300, y: 175 },
        style: { background: '#eee', border: '1px solid #777', width: 50 },
    },
];

export const initialEdges: Edge[] = [
    { id: 'e1-2', source: 'start', target: 'read-docs' },
    { id: 'e2-3', source: 'read-docs', target: 'validate-completeness' },
    { id: 'e3-4', source: 'validate-completeness', target: 'check-completeness' },
    { id: 'e4-5-incomplete', source: 'check-completeness', target: 'req-info', label: 'Incomplete' },
    { id: 'e5-2', source: 'req-info', target: 'read-docs' },
    { id: 'e4-6-complete', source: 'check-completeness', target: 'update-los', label: 'Complete' },
    { id: 'e6-7', source: 'update-los', target: 'parallel-validation' },
    { id: 'e7-8', source: 'parallel-validation', target: 'risk-calc' },
    { id: 'e8-9', source: 'risk-calc', target: 'eligibility' },
    { id: 'e9-10', source: 'eligibility', target: 'review-gateway' },
    { id: 'e10-11', source: 'review-gateway', target: 'escalation', label: 'Review' },
    { id: 'e10-12', source: 'review-gateway', target: 'update-los-contract', label: 'Pass' },
    { id: 'e11-13', source: 'escalation', target: 'reject-request', label: 'Reject' },
    { id: 'e11-12', source: 'escalation', target: 'update-los-contract', label: 'Approved' },
    { id: 'e12-14', source: 'update-los-contract', target: 'notify-applicant' },
    { id: 'e13-14', source: 'reject-request', target: 'notify-applicant' },
    { id: 'e14-15', source: 'notify-applicant', target: 'end' },
];

export const nodeDetails: Record<string, any> = {
    'read-docs': {
        description: 'Extracting data from complex docs using Intelligent Document Processing (IDP).',
        details: [
            { key: 'Documents Processed', value: '3' },
            { key: 'Confidence Score', value: '98%' },
            { key: 'Extraction Time', value: '1.2s' },
        ],
        logs: ['Received PDF', 'OCR Completed', 'Entities Extracted'],
    },
    'eligibility': {
        description: 'Reasoning policy information against data.',
        details: [
            { key: 'Policy Version', value: 'v2.4' },
            { key: 'Credit Score', value: '750' },
            { key: 'DTI Ratio', value: '24%' },
        ],
        logs: ['Fetching Policy Rules', 'Comparing Parameters', 'Decision: PROCEED'],
    },
    // Add defaults for others
};
