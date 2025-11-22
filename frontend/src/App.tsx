
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import ApplicationForm from './components/ApplicationForm';
import StatusDashboard from './components/StatusDashboard';

function App() {
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Loan Automation
          </Typography>
          <Button color="inherit" component={Link} to="/">Apply</Button>
          <Button color="inherit" component={Link} to="/status">Status</Button>
        </Toolbar>
      </AppBar>
      <Container>
        <Box sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={<ApplicationForm />} />
            <Route path="/status" element={<StatusDashboard />} />
          </Routes>
        </Box>
      </Container>
    </Router>
  );
}

export default App;
