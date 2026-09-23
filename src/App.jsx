import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { ROLE_RANK } from './lib/constants.js';
import AppShell from './components/layout/AppShell.jsx';
import { Spinner } from './components/ui/index.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MyQueue from './pages/MyQueue.jsx';
import Leads from './pages/Leads.jsx';
import LeadDetail from './pages/LeadDetail.jsx';
import Team from './pages/Team.jsx';
import Branches from './pages/Branches.jsx';
import Courses from './pages/Courses.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import Platforms from './pages/Platforms.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * Gate a subtree behind sign-in and, optionally, a role test.
 *
 * `minRole` is a rank floor; `roles` is an exact list. The platforms page needs
 * the exact form because a team leader outranks a media buyer but is refused by
 * the API there — a rank floor would render the page and then 403 on every
 * request inside it.
 */
function Protected({ minRole, roles, children }) {
  const { user, booting } = useAuth();

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (minRole && ROLE_RANK[user.role] < ROLE_RANK[minRole]) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}

export default function App() {
  const { user, booting } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={booting ? null : user ? <Navigate to="/" replace /> : <Login />} />

      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="queue" element={<MyQueue />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route
          path="platforms"
          element={
            <Protected roles={['media_buyer', 'admin']}>
              <Platforms />
            </Protected>
          }
        />
        <Route
          path="team"
          element={
            <Protected minRole="team_leader">
              <Team />
            </Protected>
          }
        />
        <Route
          path="branches"
          element={
            <Protected minRole="admin">
              <Branches />
            </Protected>
          }
        />
        <Route path="courses" element={<Courses />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
