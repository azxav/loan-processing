import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip, Container } from '@mui/material';
import api from '../api';

interface Application {
    id: number;
    status: string;
    loan_amount: number;
    created_at: string;
}

const StatusDashboard: React.FC = () => {
    const [applications, setApplications] = useState<Application[]>([]);

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const response = await api.get('/loans/');
                setApplications(response.data);
            } catch (error) {
                console.error('Error fetching applications', error);
            }
        };
        fetchApplications();
    }, []);

    return (
        <Container>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 4 }}>
                <Typography variant="h5" gutterBottom>Application Status</Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {applications.map((app) => (
                                <TableRow key={app.id}>
                                    <TableCell>{app.id}</TableCell>
                                    <TableCell>${app.loan_amount}</TableCell>
                                    <TableCell>
                                        <Chip label={app.status} color={app.status === 'APPROVED' ? 'success' : 'default'} />
                                    </TableCell>
                                    <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
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
