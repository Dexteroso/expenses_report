import { lightTheme } from './theme/theme';
import { Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import ExpensesTable from './components/ExpensesTable';
import AccountsPage from './components/AccountsPage';
import AddExpenseForm from './components/AddExpenseForm';
import BudgetPage from './components/BudgetPage';
import RealVsBudgetPage from './components/RealVsBudgetPage';
import DashboardPage from './components/DashboardPage';
import AuthPage from './components/AuthPage';
import UsersPage from './components/UsersPage';
import ActivityPage from './components/ActivityPage';
import { useState } from 'react';
import { authFetch, clearAuth, getUser, isAuthenticated } from './utils/auth';
import { formatCurrencyMXN } from './utils/formatters';
import { typography } from './styles/typography';


function Expenses({ refreshExpenses, onExpenseCreated }) {
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const handleCancelEdit = () => {
    setSelectedExpense(null);
  };

  const handleExpenseSaved = () => {
    setSelectedExpense(null);
    onExpenseCreated();
  };

  const handleRequestDeleteExpense = (expense) => {
    setExpenseToDelete(expense);
  };

  const handleCancelDelete = () => {
    setExpenseToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;

    await authFetch(`http://localhost:3000/api/expenses/${expenseToDelete.id}`, {
      method: 'DELETE',
    });

    setExpenseToDelete(null);
    setSelectedExpense(null);
    onExpenseCreated();
  };

  return (
    <>
      <AddExpenseForm
        selectedExpense={selectedExpense}
        onExpenseCreated={handleExpenseSaved}
        onCancelEdit={handleCancelEdit}
        onDeleteExpense={handleRequestDeleteExpense}
      />

      <ExpensesTable
        refreshExpenses={refreshExpenses}
        onEditExpense={setSelectedExpense}
        selectedExpense={selectedExpense}
      />

      {expenseToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: 24,
            borderRadius: 12,
            width: 330
          }}>
            <h2 style={{ ...typography.sectionTitle, marginTop: 10, marginBottom: 0 }}>
              Estas por eliminar este movimiento
            </h2>
            <p style={{ fontSize: 11, fontWeight: 'bold', marginTop: -8, color: '#e84a4a' }}>
              Este cambio no se puede deshacer.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, fontSize: 11, marginTop: 12, marginBottom: 20 }}>
              <div style={{ lineHeight: 1.2 }}>ID: {expenseToDelete.expense_code}</div>
              <div style={{ lineHeight: 1.2 }}>Fecha: {expenseToDelete.date}</div>
              <div style={{ lineHeight: 1.2 }}>Concepto: {expenseToDelete.concept}</div>
              <div style={{ lineHeight: 1.2 }}>Descripción: {expenseToDelete.description}</div>
              <div style={{ lineHeight: 1.2 }}>Monto: {formatCurrencyMXN(expenseToDelete.amount)}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={{ ...typography.buttonStyle }} onClick={handleCancelDelete}>Cancelar</button>
              <button style={{ ...typography.buttonStyle }} onClick={handleConfirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function App() {
  const [refreshExpenses, setRefreshExpenses] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const theme = lightTheme;
  const sidebarWidth = 170;
  const contentMinWidth = 840;
  const appShellMaxWidth = 1380;
  const location = useLocation();
  const navigate = useNavigate();
  const authenticated = isAuthenticated();
  const currentUser = getUser();
  const isAuthRoute = location.pathname === '/auth';
  const showSidebar = !isAuthRoute && authenticated;

  const getSidebarLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    boxSizing: 'border-box',
    padding: '0px 12px',
    borderRadius: 8,
    color: theme.sidebarText,
    textDecoration: 'none',
    background: isActive ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
    fontWeight: isActive ? 700 : 500,
    fontSize: 12,
    lineHeight: 1.35,
  });

  const getSidebarButtonStyle = () => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    boxSizing: 'border-box',
    padding: '0px 12px',
    borderRadius: 8,
    color: theme.sidebarText,
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.35,
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  const handleLogout = () => {
    clearAuth();
    navigate('/auth');
  };

  const todayLabel = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        background: theme.background,
      }}
    >
      {showSidebar ? (
        <div
          style={{
            minHeight: '100vh',
            minWidth: 0,
            maxWidth: `${appShellMaxWidth}px`,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: `${sidebarWidth}px minmax(${contentMinWidth}px, 1fr)`,
            alignItems: 'start',
            gap: 20,
            padding: '0 20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              height: '100vh',
              overflowY: 'auto',
              width: '100%',
              boxSizing: 'border-box',
              background: theme.sidebarBackground,
              color: theme.sidebarText,
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h2 style={{ marginTop: 20, color: theme.sidebarText, fontSize: 25, fontWeight: 600 }}>Control de Gastos</h2>

            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '16px 0 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <li>
                <NavLink to="/dashboard" style={getSidebarLinkStyle}>
                  <i className='bx bx-grid-alt'></i>
                  Resumen
                </NavLink>
              </li>
              <li>
                <NavLink to="/gastos" style={getSidebarLinkStyle}>
                  <i className='bx bx-receipt'></i>
                  Movimientos
                </NavLink>
              </li>
              <li>
                <NavLink to="/presupuesto" style={getSidebarLinkStyle}>
                  <i className='bx bx-wallet'></i>
                  Presupuesto
                </NavLink>
              </li>
              <li>
                <NavLink to="/real-vs-presupuesto" style={getSidebarLinkStyle}>
                  <i className='bx bx-bar-chart-alt-2'></i>
                  Variaciones
                </NavLink>
              </li>
              <li>
                <NavLink to="/cuentas" style={getSidebarLinkStyle}>
                  <i className='bx bx-credit-card'></i>
                  Cuentas
                </NavLink>
              </li>
              <li>
                <NavLink to="/actividad" style={getSidebarLinkStyle}>
                  <i className='bx bx-history'></i>
                  Actividad
                </NavLink>
              </li>
              {currentUser?.role === 'admin' && (
                <li>
                  <NavLink to="/usuarios" style={getSidebarLinkStyle}>
                    <i className='bx bxs-user-account'></i>
                    Usuarios
                  </NavLink>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  style={getSidebarButtonStyle()}
                >
                  <i className='bx bx-log-out'></i>
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </div>

          <div
            style={{
              minWidth: 0,
              width: '100%',
              background: theme.background,
              padding: '20px 0',
              boxSizing: 'border-box',
              overflowX: 'hidden',
            }}
          >
            <div
              style={{
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
              }}
            >
              {currentUser && (
                <div
                  style={{
                    marginBottom: 16,
                    color: theme.textBody,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      ¡Hola, {currentUser.name}!
                    </div>
                    <div style={{ color: theme.textSecondary, fontSize: 12 }}>
                      {todayLabel}
                    </div>
                    <div style={{ color: theme.textPrimary, fontSize: 12, fontWeight: 600 }}>v1.0</div>
                  </div>
                </div>
              )}
              <Routes>
                <Route
                  path="/auth"
                  element={authenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />}
                />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route
                  path="/gastos"
                  element={
                    <ProtectedRoute>
                      <Expenses
                        onExpenseCreated={() => setRefreshExpenses(prev => !prev)}
                        refreshExpenses={refreshExpenses}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route path="/cuentas" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
                <Route path="/actividad" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
                <Route path="/presupuesto" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
                <Route path="/real-vs-presupuesto" element={<ProtectedRoute><RealVsBudgetPage /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to={authenticated ? '/dashboard' : '/auth'} replace />} />
              </Routes>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            background: theme.background,
            boxSizing: 'border-box',
            overflowX: 'hidden',
          }}
        >
          <Routes>
            <Route
              path="/auth"
              element={authenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />}
            />
            <Route path="*" element={<Navigate to={authenticated ? '/dashboard' : '/auth'} replace />} />
          </Routes>
        </div>
      )}
      {isLogoutModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: theme.overlaySurface,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: 24,
              boxShadow: theme.shadow,
              boxSizing: 'border-box',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 12, color: theme.textPrimary, fontSize: 14 }}>
              ¿Cerrar sesión?
            </h2>

            <p style={{ marginBottom: 10, color: theme.textBody, fontSize: 12, lineHeight: 1.5 }}>
              Se cerrará tu sesión actual. Asegúrate de haber guardado tus cambios antes de salir.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  background: theme.inputDisabledBackground,
                  color: theme.textPrimary,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  handleLogout();
                }}
                style={{
                  padding: '5px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: theme.textPrimary,
                  color: theme.sidebarText,
                  fontSize: 12,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
