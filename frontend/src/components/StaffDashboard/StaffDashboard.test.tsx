import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import StaffDashboard from './StaffDashboard';
import theme from '../../theme';
vi.mock('./ProcessGraph', () => ({
    default: ({ onNodeClick }: { onNodeClick: (node: any) => void }) => (
        <button onClick={() => onNodeClick({ id: 'manual-review', data: { label: 'Manual Review' } })}>
            MockGraph
        </button>
    ),
}));

vi.mock('./DetailPanel', () => ({
    default: () => <div data-testid="detail-panel">Detail Panel</div>,
}));

vi.mock('../../api', () => ({
    default: { get: vi.fn().mockResolvedValue({ data: [] }) },
}));

const renderDashboard = () =>
    render(
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <MemoryRouter>
                <StaffDashboard />
            </MemoryRouter>
        </ThemeProvider>
    );

describe('StaffDashboard', () => {
    it('renders workflow tab by default and switches to documents via shortcut', async () => {
        renderDashboard();

        expect(screen.getByText('MockGraph')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'D', ctrlKey: true, shiftKey: true });

        await waitFor(() => {
            expect(screen.getByText(/Documents/i)).toBeInTheDocument();
        });
    });

    it('shows fallback application data when API is unavailable', async () => {
        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText(/Alex Johnson/)).toBeInTheDocument();
        });
    });
});
