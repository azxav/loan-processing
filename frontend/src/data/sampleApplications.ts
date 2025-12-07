export type SampleScenario = 'moderate_review' | 'high_risk_reject' | 'borderline_manual' | 'excellent_auto';

export type SampleApplication = {
    id: string;
    applicantName: string;
    productType: string;
    requestedAmount: number;
    termMonths: number;
    purpose: string;
    channel: string;
    scenario: SampleScenario;
    creditScore: number;
    dti: number;
    incomeNetMonthly: number;
    summary: string;
    statusLabel: string;
    files: {
        application: string;
        id: string;
        bankStatement: string;
        payslip: string;
    };
};

export const sampleApplications: SampleApplication[] = [
    {
        id: 'APP-2025-0001',
        applicantName: 'Alex Johnson',
        productType: 'PERSONAL_LOAN',
        requestedAmount: 15000,
        termMonths: 36,
        purpose: 'Debt consolidation',
        channel: 'WEB_PORTAL',
        scenario: 'moderate_review',
        creditScore: 720,
        dti: 0.28,
        incomeNetMonthly: 4800,
        summary: 'Stable salaried income, moderate existing debts. Expected manual review.',
        statusLabel: 'IN_REVIEW',
        files: {
            application: '/input/loan_application.json',
            id: '/input/id.json',
            bankStatement: '/input/bank_statement.json',
            payslip: '/input/payslip.json',
        },
    },
    {
        id: 'APP-2025-0002',
        applicantName: 'Jordan Miller',
        productType: 'PERSONAL_LOAN',
        requestedAmount: 18000,
        termMonths: 48,
        purpose: 'Small business capital',
        channel: 'WEB_PORTAL',
        scenario: 'high_risk_reject',
        creditScore: 610,
        dti: 0.46,
        incomeNetMonthly: 3600,
        summary: 'Self-employed with volatile income and gambling patterns. Expect auto-reject.',
        statusLabel: 'HIGH_RISK',
        files: {
            application: '/input/loan_application_2.json',
            id: '/input/id_2.json',
            bankStatement: '/input/bank_statement_2.json',
            payslip: '/input/payslip_2.json',
        },
    },
    {
        id: 'APP-2025-0003',
        applicantName: 'Priya Desai',
        productType: 'PERSONAL_LOAN',
        requestedAmount: 22000,
        termMonths: 60,
        purpose: 'Home renovation',
        channel: 'MOBILE_APP',
        scenario: 'borderline_manual',
        creditScore: 680,
        dti: 0.39,
        incomeNetMonthly: 5400,
        summary: 'Strong income but higher obligations; likely manual review.',
        statusLabel: 'MANUAL_REVIEW',
        files: {
            application: '/input/loan_application_3.json',
            id: '/input/id_3.json',
            bankStatement: '/input/bank_statement_3.json',
            payslip: '/input/payslip_3.json',
        },
    },
    {
        id: 'APP-2025-0004',
        applicantName: 'Elena Santiago',
        productType: 'PERSONAL_LOAN',
        requestedAmount: 12000,
        termMonths: 24,
        purpose: 'Home energy upgrades',
        channel: 'WEB_PORTAL',
        scenario: 'excellent_auto',
        creditScore: 790,
        dti: 0.19,
        incomeNetMonthly: 7800,
        summary: 'High score, low DTI, consistent balances. Expect auto-approve.',
        statusLabel: 'READY_TO_APPROVE',
        files: {
            application: '/input/loan_application_4.json',
            id: '/input/id_4.json',
            bankStatement: '/input/bank_statement_4.json',
            payslip: '/input/payslip_4.json',
        },
    },
];

export const sampleApplicationMap = Object.fromEntries(
    sampleApplications.map((app) => [app.id, app]),
);

