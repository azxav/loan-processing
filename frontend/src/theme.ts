import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#1f4b99' }, // neutral/info
        secondary: { main: '#6c4ad7' }, // simulation/test
        success: { main: '#16a34a' }, // completed
        warning: { main: '#f59e0b' }, // in-progress/at-risk
        error: { main: '#dc2626' }, // failures/exceptions
        info: { main: '#0ea5e9' },
        background: {
            default: '#f8f9fa',
            paper: '#ffffff',
        },
        divider: '#e5e7eb',
    },
    shape: {
        borderRadius: 10,
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h6: { fontWeight: 700, letterSpacing: 0, fontSize: 18 },
        subtitle1: { fontWeight: 700, letterSpacing: 0, fontSize: 15 },
        subtitle2: { fontWeight: 700, letterSpacing: 0, fontSize: 13 },
        body1: { fontSize: 13.5 },
        body2: { fontSize: 12.5 },
        caption: { fontSize: 11, letterSpacing: 0.1 },
        button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderColor: '#e5e7eb',
                    boxShadow: '0 6px 12px rgba(15,23,42,0.05)',
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
                    fontWeight: 700,
                    boxShadow: 'none',
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
                    fontWeight: 700,
                    paddingLeft: 6,
                    paddingRight: 6,
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
                    fontWeight: 700,
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: '#f8f9fa',
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    borderRadius: 8,
                    fontSize: 11.5,
                },
            },
        },
    },
});

export default theme;
