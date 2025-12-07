import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import DetailPanel from './DetailPanel';
import theme from '../../theme';

const application = {
    id: 'APP-123',
    applicantName: 'Test User',
    productType: 'PERSONAL_LOAN',
    requestedAmount: 10000,
    termMonths: 24,
    purpose: 'Test',
    channel: 'WEB',
    scenario: 'moderate_review',
    creditScore: 700,
    dti: 0.3,
    incomeNetMonthly: 4000,
    summary: 'Test summary',
    statusLabel: 'IN_REVIEW',
    files: {
        application: '/input/loan_application.json',
        id: '/input/id.json',
        bankStatement: '/input/bank_statement.json',
        payslip: '/input/payslip.json',
    },
} as const;

const selectedNode = {
    id: 'manual-review',
    data: { label: 'Manual Review', status: 'in-progress' },
} as any;

const renderPanel = () =>
    render(
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <DetailPanel selectedNode={selectedNode} application={application as any} logs={[]} activeStep="manual-review" />
        </ThemeProvider>
    );

describe('DetailPanel action panel', () => {
    it('shows next action and tasks for the selected node', () => {
        renderPanel();
        expect(screen.getByText(/Complete manual review/i)).toBeInTheDocument();
        expect(screen.getByText(/Assign reviewer/i)).toBeInTheDocument();
    });

    it('confirms reject action and shows feedback', async () => {
        renderPanel();
        fireEvent.click(screen.getByText('Reject'));
        expect(screen.getByText(/Confirm Reject/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Confirm'));

        await waitFor(() => {
            expect(screen.getByText(/Rejected step/i)).toBeInTheDocument();
        });
    });
});
