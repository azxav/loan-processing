
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import ApplicationForm from './components/ApplicationForm';
import StatusDashboard from './components/StatusDashboard';
import StaffDashboard from './components/StaffDashboard/StaffDashboard';

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
          <Button color="inherit" component={Link} to="/staff-dashboard">Staff Dashboard</Button>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<ApplicationForm />} />
        <Route path="/status" element={<StatusDashboard />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
