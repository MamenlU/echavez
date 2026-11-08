import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { ProjectOverview } from './pages/ProjectOverview';
import { PromosRewards } from './pages/PromosRewards';
import { CustomerRegister } from './pages/CustomerRegister';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { CashierWorkspace } from './pages/CashierWorkspace';
import { CashierAccountsPage } from './pages/CashierAccountsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PaymentReturn } from './pages/PaymentReturn';
import { ScrollManager } from './components/ScrollManager';

import {
  getDashboardPath,
  getStoredSession,
} from './utils/authSession';

function ConditionalFooter() {
  const { pathname } = useLocation();

  // Admin and Customer dashboards use their own page layout.
  if (pathname.includes('/dashboard') || pathname === '/admin/cashiers') {
    return null;
  }

  // Adviser revision: keep the simplified footer on every public page,
  // including Login and Customer Registration.
  return <Footer showNavigationSections={false} />;
}

function RootRoute() {
  const session = getStoredSession();

  if (session) {
    return (
      <Navigate
        to={getDashboardPath(session.user.role)}
        replace
      />
    );
  }

  return <Home />;
}

function LoginRoute() {
  const session = getStoredSession();

  if (session) {
    return (
      <Navigate
        to={getDashboardPath(session.user.role)}
        replace
      />
    );
  }

  return <Login />;
}

function CustomerRegisterRoute() {
  const session = getStoredSession();

  if (session) {
    return (
      <Navigate
        to={getDashboardPath(session.user.role)}
        replace
      />
    );
  }

  return <CustomerRegister />;
}

function ForgotPasswordRoute() {
  const session = getStoredSession();

  if (session) {
    return (
      <Navigate
        to={getDashboardPath(session.user.role)}
        replace
      />
    );
  }

  return <ForgotPassword />;
}

function HeaderForRole() {
  const { pathname } = useLocation();
  // Cashier Console owns its accessible header and navigation.
  return pathname.startsWith('/cashier/dashboard') || pathname === '/admin/cashiers' ? null : <Navbar />;
}

function App() {
  return (
    <Router>
      <ScrollManager />
      <Routes>
        {/* Standalone pages */}
        <Route path="/payment/success" element={<PaymentReturn />} />
        <Route path="/payment/failed" element={<PaymentReturn />} />
        <Route path="/project" element={<ProjectOverview />} />

        {/* Main storefront / customer / admin layout */}
        <Route
          path="/*"
          element={
            <div id="top" className="min-h-screen bg-steel-50 flex flex-col">
              <HeaderForRole />

              <div className="flex-grow">
                <Routes>
                  {/* Role-aware main URL */}
                  <Route path="/" element={<RootRoute />} />

                  {/* Public Customer registration only */}
                  <Route
                    path="/register/customer"
                    element={<CustomerRegisterRoute />}
                  />

                  {/* No public Admin registration */}
                  <Route
                    path="/register/admin"
                    element={<Navigate to="/login" replace />}
                  />

                  {/* Logged-in users should not see Login again */}
                  <Route
                    path="/login"
                    element={<LoginRoute />}
                  />

                  <Route
                  path="/forgot-password"
                  element={<ForgotPasswordRoute />}
                  />

                  <Route
                    path="/reset-password"
                    element={<ResetPassword />}
                  />

                  {/* Capstone presentation route; uses the dedicated Rayjin project presentation shell. */}
                  <Route
                    path="/promos-rewards"
                    element={<PromosRewards />}
                  />

                  {/* Customer */}
                  <Route
                    path="/customer/dashboard"
                    element={
                      <ProtectedRoute allowedRole="customer">
                        <CustomerDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute allowedRole="admin">
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Narrowly scoped Cashier operations; Admin page remains separate. */}
                  <Route path="/cashier/dashboard" element={
                    <ProtectedRoute allowedRole="cashier"><CashierWorkspace /></ProtectedRoute>
                  } />
                  <Route path="/admin/cashiers" element={
                    <ProtectedRoute allowedRole="super_admin"><CashierAccountsPage /></ProtectedRoute>
                  } />

                  {/* Unknown URLs return to the correct entry point */}
                  <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                  />
                </Routes>
              </div>

              <ConditionalFooter />
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;