import { useState } from 'react';
import { Box, Paper, Drawer, IconButton, useTheme, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { type Node } from '@xyflow/react';
import ProcessGraph from './ProcessGraph';
import DetailPanel from './DetailPanel';

const StaffDashboard = () => {
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const drawerWidth = isMobile ? '100%' : 400;

    const handleNodeClick = (node: Node) => {
        setSelectedNode(node);
    };

    const handleClose = () => {
        setSelectedNode(null);
    };

    const isOpen = selectedNode !== null;

    return (
        <Box sx={{
            display: 'flex',
            height: 'calc(100vh - 64px)', // Subtract AppBar height
            width: '100%',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Main content area */}
            <Box
                sx={{
                    flexGrow: 1,
                    height: '100%',
                    transition: theme.transitions.create(['margin', 'width'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    marginRight: isOpen && !isMobile ? `${drawerWidth}px` : 0,
                    width: isOpen && !isMobile ? `calc(100% - ${drawerWidth}px)` : '100%',
                }}
            >
                <Paper elevation={2} sx={{ height: '100%', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <ProcessGraph onNodeClick={handleNodeClick} />
                </Paper>
            </Box>

            {/* Right side panel */}
            <Drawer
                anchor="right"
                open={isOpen}
                onClose={handleClose}
                variant={isMobile ? 'temporary' : 'persistent'}
                PaperProps={{
                    sx: {
                        width: drawerWidth,
                        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
                    }
                }}
                ModalProps={{
                    keepMounted: true, // Better mobile performance
                }}
            >
                <Box sx={{ position: 'relative', height: '100%' }}>
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            zIndex: 1,
                            color: 'text.secondary',
                            backgroundColor: 'background.paper',
                            '&:hover': {
                                backgroundColor: 'action.hover',
                            },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <DetailPanel selectedNode={selectedNode} />
                </Box>
            </Drawer>
        </Box>
    );
};

export default StaffDashboard;
