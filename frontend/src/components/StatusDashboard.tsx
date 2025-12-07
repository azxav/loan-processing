import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip, Container, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { sampleApplications } from '../data/sampleApplications';

const statusColor = (status: string) => {
    switch (status) {
        case 'READY_TO_APPROVE':
        case 'APPROVED':
            return 'success';
        case 'MANUAL_REVIEW':
        case 'IN_REVIEW':
            return 'warning';
        case 'HIGH_RISK':
        case 'REJECTED':
            return 'error';
        default:
            return 'default';
    }
};

const StatusDashboard: React.FC = () => {
    const navigate = useNavigate();

    const handleOpen = (id: string) => {
        navigate('/staff-dashboard', { state: { applicationId: id } });
    };

    return (
        <Container>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 900, mx: 'auto', mt: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h5" gutterBottom>Application Status</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Simulated data for frontend demo
                    </Typography>
                </Stack>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Applicant</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Scenario</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sampleApplications.map((app) => (
                                <TableRow key={app.id} hover>
                                    <TableCell>{app.id}</TableCell>
                                    <TableCell>{app.applicantName}</TableCell>
                                    <TableCell>${app.requestedAmount.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Chip label={app.statusLabel} color={statusColor(app.statusLabel) as any} size="small" />
                                    </TableCell>
                                    <TableCell>{app.scenario.replace(/_/g, ' ')}</TableCell>
                                    <TableCell align="right">
                                        <Button variant="outlined" size="small" onClick={() => handleOpen(app.id)}>
                                            Open in Staff Dashboard
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
};

export default StatusDashboard;
