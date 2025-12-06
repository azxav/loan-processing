import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import { type Node } from '@xyflow/react';
import { nodeDetails } from './mockData';

interface DetailPanelProps {
    selectedNode: Node | null;
}

const DetailPanel = ({ selectedNode }: DetailPanelProps) => {
    if (!selectedNode) {
        return (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                <Typography>Select a step in the process to view details.</Typography>
            </Box>
        );
    }

    const details = nodeDetails[selectedNode.id] || {
        description: `Details for ${selectedNode.data.label}`,
        details: [],
        logs: [],
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'in-progress': return 'warning';
            case 'pending': return 'default';
            default: return 'default';
        }
    };

    return (
        <Paper elevation={0} sx={{ height: '100%', overflowY: 'auto' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #eee' }}>
                <Typography variant="overline" color="text.secondary">
                    Process Step
                </Typography>
                <Typography variant="h6" gutterBottom>
                    {selectedNode.data.label as string}
                </Typography>
                <Chip
                    label={selectedNode.data.status as string || 'Unknown'}
                    color={getStatusColor(selectedNode.data.status as string)}
                    size="small"
                    sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                    {details.description}
                </Typography>
            </Box>

            {details.details && details.details.length > 0 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Key Metrics
                    </Typography>
                    <List dense>
                        {details.details.map((item: any, index: number) => (
                            <ListItem key={index} disableGutters>
                                <ListItemText primary={item.key} secondary={item.value} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}

            <Divider />

            {details.logs && details.logs.length > 0 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Activity Log
                    </Typography>
                    <List dense sx={{ bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        {details.logs.map((log: string, index: number) => (
                            <ListItem key={index}>
                                <ListItemText primary={log} primaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace' }} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}
        </Paper>
    );
};

export default DetailPanel;
