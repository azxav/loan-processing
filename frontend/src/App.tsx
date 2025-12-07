
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import StatusDashboard from './components/StatusDashboard';
import StaffDashboard from './components/StaffDashboard/StaffDashboard';
import StaffCopilot from './components/StaffCopilot/StaffCopilot';

function App() {
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Loan Automation
          </Typography>
          <Button color="inherit" component={Link} to="/staff-copilot">Staff Copilot</Button>
          <Button color="inherit" component={Link} to="/status">Status</Button>
          <Button color="inherit" component={Link} to="/staff-dashboard">Staff Dashboard</Button>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<StaffCopilot />} />
        <Route path="/staff-copilot" element={<StaffCopilot />} />
        <Route path="/status" element={<StatusDashboard />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
