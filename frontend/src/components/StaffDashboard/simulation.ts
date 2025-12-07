import type { SampleApplication } from '../../data/sampleApplications';

export type NodeStatus = 'pending' | 'in-progress' | 'completed';

export type SimulationStatusMap = Record<string, NodeStatus>;

export type SimulationUpdate = {
    statuses: SimulationStatusMap;
    logs: string[];
    activeStep?: string;
    decision?: 'auto-approve' | 'manual-review' | 'auto-reject';
    completed?: boolean;
};

type Step = {
    id: string;
    durationRange: [number, number];
    logStart: string;
    logDone: string;
};

const allNodeIds = [
    'start',
    'doc-processing',
    'doc-verification',
    'doc-check',
    'reject-high-risk',
    'credit-scoring',
    'parallel-split',
    'income-analysis',
    'debt-assessment',
    'compliance-check',
    'report-generation',
    'routing-decision',
    'auto-approve',
    'manual-review',
    'auto-reject',
    'final-decision',
    'update-banking',
    'disburse',
    'notify',
    'end',
];

export const initialStatuses = (): SimulationStatusMap =>
    allNodeIds.reduce<SimulationStatusMap>((acc, id) => {
        acc[id] = id === 'start' ? 'completed' : 'pending';
        return acc;
    }, {});

const randomMs = (range: [number, number]) => {
    const [min, max] = range;
    return Math.round(min + Math.random() * (max - min));
};

const baseSteps: Step[] = [
    { id: 'doc-processing', durationRange: [1200, 2200], logStart: 'Starting IDP extraction', logDone: 'IDP completed' },
    { id: 'doc-verification', durationRange: [1500, 2500], logStart: 'Verifying completeness & fraud signals', logDone: 'Verification completed' },
    { id: 'doc-check', durationRange: [600, 1000], logStart: 'Routing risk check', logDone: 'Risk check passed' },
    { id: 'credit-scoring', durationRange: [1200, 2200], logStart: 'Calculating credit score & features', logDone: 'Credit score calculated' },
    { id: 'parallel-split', durationRange: [300, 600], logStart: 'Starting parallel analysis', logDone: 'Parallel threads running' },
    { id: 'income-analysis', durationRange: [1800, 2600], logStart: 'Analyzing income from bank statements', logDone: 'Income signals extracted' },
    { id: 'debt-assessment', durationRange: [1800, 2600], logStart: 'Assessing debt & obligations', logDone: 'Debt assessment finished' },
    { id: 'compliance-check', durationRange: [1800, 2600], logStart: 'Running KYC/AML checks', logDone: 'Compliance checks passed' },
    { id: 'report-generation', durationRange: [1200, 1800], logStart: 'Generating decision report', logDone: 'Report compiled' },
    { id: 'routing-decision', durationRange: [800, 1400], logStart: 'Choosing routing path', logDone: 'Routing decided' },
];

const finalSteps: Record<'auto-approve' | 'manual-review' | 'auto-reject', Step[]> = {
    'auto-approve': [
        { id: 'auto-approve', durationRange: [800, 1400], logStart: 'Auto-approve rules triggered', logDone: 'Auto-approval confirmed' },
        { id: 'final-decision', durationRange: [600, 1000], logStart: 'Finalizing decision', logDone: 'Final decision complete' },
        { id: 'update-banking', durationRange: [1000, 1500], logStart: 'Pushing to core banking', logDone: 'Banking system updated' },
        { id: 'disburse', durationRange: [1000, 1500], logStart: 'Generating contract & disbursing', logDone: 'Funds scheduled' },
        { id: 'notify', durationRange: [600, 900], logStart: 'Notifying applicant', logDone: 'Applicant notified' },
        { id: 'end', durationRange: [100, 200], logStart: 'Wrapping up', logDone: 'Process finished' },
    ],
    'manual-review': [
        { id: 'manual-review', durationRange: [2000, 3200], logStart: 'Underwriter reviewing case', logDone: 'Manual review completed' },
        { id: 'final-decision', durationRange: [800, 1200], logStart: 'Applying reviewer decision', logDone: 'Decision recorded' },
        { id: 'update-banking', durationRange: [1000, 1500], logStart: 'Pushing to core banking', logDone: 'Banking system updated' },
        { id: 'disburse', durationRange: [1000, 1500], logStart: 'Generating contract & disbursing', logDone: 'Funds scheduled' },
        { id: 'notify', durationRange: [600, 900], logStart: 'Notifying applicant', logDone: 'Applicant notified' },
        { id: 'end', durationRange: [100, 200], logStart: 'Wrapping up', logDone: 'Process finished' },
    ],
    'auto-reject': [
        { id: 'auto-reject', durationRange: [800, 1400], logStart: 'High risk detected - auto reject', logDone: 'Auto rejection confirmed' },
        { id: 'notify', durationRange: [800, 1200], logStart: 'Sending decline notice', logDone: 'Applicant notified' },
        { id: 'end', durationRange: [100, 200], logStart: 'Wrapping up', logDone: 'Process finished' },
    ],
};

const scenarioDecision = (scenario: SampleApplication['scenario']): 'auto-approve' | 'manual-review' | 'auto-reject' => {
    switch (scenario) {
        case 'excellent_auto':
            return 'auto-approve';
        case 'high_risk_reject':
            return 'auto-reject';
        case 'borderline_manual':
            return 'manual-review';
        default:
            return 'manual-review';
    }
};

export const createSimulation = (
    application: SampleApplication,
    onUpdate: (update: SimulationUpdate) => void,
) => {
    const statuses = initialStatuses();
    const logs: string[] = ['Application received via ' + application.channel];
    let cancelled = false;
    const timers: number[] = [];

    const emit = (update: Partial<SimulationUpdate>) => {
        if (cancelled) return;
        onUpdate({
            statuses: { ...statuses },
            logs: [...logs],
            ...update,
        });
    };

    // Immediately emit initial state
    emit({ activeStep: undefined });

    const decisionPath = scenarioDecision(application.scenario);
    const steps: Step[] = [...baseSteps];

    // Override doc-check completion log if risk triggers auto reject
    const docCheckIdx = steps.findIndex((s) => s.id === 'doc-check');
    if (decisionPath === 'auto-reject' && docCheckIdx >= 0) {
        steps[docCheckIdx] = {
            ...steps[docCheckIdx],
            logDone: 'Risk check flagged high risk',
        };
    }

    steps.push(...finalSteps[decisionPath]);

    let delay = 400; // small initial delay after receive

    steps.forEach((step) => {
        const duration = randomMs(step.durationRange);

        const startTimer = window.setTimeout(() => {
            if (cancelled) return;
            statuses[step.id] = 'in-progress';
            logs.push(`[${step.id}] ${step.logStart}`);
            emit({ activeStep: step.id, decision: decisionPath as SimulationUpdate['decision'] });
        }, delay);

        const endTimer = window.setTimeout(() => {
            if (cancelled) return;
            statuses[step.id] = 'completed';
            logs.push(`[${step.id}] ${step.logDone}`);
            emit({ activeStep: step.id, decision: decisionPath as SimulationUpdate['decision'] });
        }, delay + duration);

        timers.push(startTimer, endTimer);
        delay += duration;
    });

    const finishTimer = window.setTimeout(() => {
        if (cancelled) return;
        statuses.end = 'completed';
        logs.push('Processing complete');
        emit({ activeStep: undefined, decision: decisionPath as SimulationUpdate['decision'], completed: true });
    }, delay + 200);

    timers.push(finishTimer);

    return () => {
        cancelled = true;
        timers.forEach((t) => window.clearTimeout(t));
    };
};

