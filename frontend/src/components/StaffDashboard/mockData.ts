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
    'doc-processing': {
        description: 'Extracting data from ID, payslip, and bank statement using IDP.',
        details: [
            { key: 'Documents', value: 'ID + Payslip + Bank Statement' },
            { key: 'OCR Confidence', value: '97%' },
            { key: 'Entities', value: 'Name, DOB, Income, Transactions' },
        ],
        logs: ['Files received', 'OCR completed', 'Entities structured'],
    },
    'doc-verification': {
        description: 'Validate completeness, consistency, and fraud patterns across documents.',
        details: [
            { key: 'Cross-checks', value: 'Address, DOB, Employer' },
            { key: 'Fraud Signals', value: 'None detected' },
        ],
        logs: ['Cross-check started', 'No tampering detected'],
    },
    'credit-scoring': {
        description: 'Calculating credit score using bureau-like features and payment history.',
        details: [
            { key: 'Model', value: 'Gradient Boosted Trees' },
            { key: 'Features', value: '36' },
        ],
        logs: ['Feature engineering complete', 'Score persisted'],
    },
    'income-analysis': {
        description: 'Cash-flow analysis on bank statements to extract net income.',
        details: [
            { key: 'Avg Net Monthly', value: '$4.8k' },
            { key: 'Income Stability', value: 'Medium' },
        ],
        logs: ['Detected salary cadence', 'Variance within limits'],
    },
    'debt-assessment': {
        description: 'Debt-to-income (DTI) and leverage calculation.',
        details: [
            { key: 'DTI', value: '35%' },
            { key: 'Obligations', value: 'Rent, loans, cards' },
        ],
        logs: ['DTI computed', 'Exposure within policy band'],
    },
    'compliance-check': {
        description: 'KYC/AML verifications and watchlist screening.',
        details: [
            { key: 'KYC', value: 'Verified' },
            { key: 'Watchlist', value: 'Clear' },
        ],
        logs: ['Document match confirmed', 'Screening passed'],
    },
    'report-generation': {
        description: 'Compile findings into a decision packet for routing.',
        details: [
            { key: 'Sections', value: 'Identity, Income, Risk, Compliance' },
            { key: 'Confidence', value: 'High' },
        ],
        logs: ['Aggregated signals', 'Drafted decision packet'],
    },
    'routing-decision': {
        description: 'Decide the routing path based on thresholds and rules.',
        details: [
            { key: 'Ruleset', value: 'v2.4' },
            { key: 'Overrides', value: 'None' },
        ],
        logs: ['Rules evaluated', 'Path selected'],
    },
    'auto-approve': {
        description: 'Meets auto-approval thresholds (score, DTI, clean history).',
        details: [
            { key: 'Decision', value: 'Auto-Approve' },
            { key: 'Score', value: '≥ 750' },
        ],
        logs: ['Auto-approve criteria met'],
    },
    'manual-review': {
        description: 'Underwriter reviews borderline attributes and provides decision.',
        details: [
            { key: 'Reviewer SLA', value: '< 5 min (simulated)' },
            { key: 'Required Docs', value: 'Existing set' },
        ],
        logs: ['Assigned to underwriter'],
    },
    'auto-reject': {
        description: 'High-risk signals triggered automated rejection.',
        details: [
            { key: 'Risk Reason', value: 'High gambling + low score' },
        ],
        logs: ['Auto-reject executed'],
    },
    'update-banking': {
        description: 'Push approved terms to LOS/core banking.',
        details: [
            { key: 'System', value: 'LOS + Core' },
        ],
        logs: ['Core update queued'],
    },
    'disburse': {
        description: 'Generate contract and disburse funds.',
        details: [
            { key: 'Method', value: 'ACH' },
        ],
        logs: ['Contract generated', 'Funds scheduled'],
    },
    'notify': {
        description: 'Notify applicant of the final outcome.',
        details: [
            { key: 'Channels', value: 'Email + SMS' },
        ],
        logs: ['Notification sent'],
    },
    // Fallbacks handled in component
};
