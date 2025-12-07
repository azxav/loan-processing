import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#1f6feb' },
        secondary: { main: '#7c3aed' },
        success: { main: '#16a34a' },
        warning: { main: '#f59e0b' },
        error: { main: '#dc2626' },
        info: { main: '#2563eb' },
        background: {
            default: '#f6f7fb',
            paper: '#ffffff',
        },
    },
    shape: {
        borderRadius: 10,
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h6: { fontWeight: 700 },
        subtitle1: { fontWeight: 700 },
        subtitle2: { fontWeight: 700 },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderColor: '#e5e7eb',
                },
            },
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 10,
                },
                sizeSmall: {
                    padding: '6px 12px',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    minHeight: 48,
                },
                indicator: {
                    height: 3,
                    borderRadius: 999,
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    minHeight: 48,
                    textTransform: 'none',
                    fontWeight: 600,
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: '#f6f7fb',
                },
            },
        },
    },
});

export default theme;
