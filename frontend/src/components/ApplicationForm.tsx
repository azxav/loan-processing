import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Paper, Container } from '@mui/material';
import api from '../api';

const ApplicationForm: React.FC = () => {
    const [formData, setFormData] = useState({
        loan_amount: '',
        loan_purpose: '',
        loan_term_months: '',
        customer_id: '1' // Hardcoded for MVP
    });
    const [message, setMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/loans/', {
                ...formData,
                loan_amount: parseFloat(formData.loan_amount),
                loan_term_months: parseInt(formData.loan_term_months),
                customer_id: parseInt(formData.customer_id)
            });
            setMessage(`Application submitted! ID: ${response.data.id}`);
        } catch (error) {
            setMessage('Error submitting application');
            console.error(error);
        }
    };

    return (
        <Container>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
                <Typography variant="h5" gutterBottom>Apply for a Loan</Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField label="Loan Amount" name="loan_amount" type="number" onChange={handleChange} required />
                    <TextField label="Purpose" name="loan_purpose" onChange={handleChange} required />
                    <TextField label="Term (Months)" name="loan_term_months" type="number" onChange={handleChange} required />
                    <Button type="submit" variant="contained" color="primary">Submit Application</Button>
                </Box>
                {message && <Typography sx={{ mt: 2 }}>{message}</Typography>}
            </Paper>
        </Container>
    );
};

export default ApplicationForm;
