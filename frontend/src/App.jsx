import { lightTheme } from './theme/theme';
import { Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import ExpensesTable from './components/ExpensesTable';
import AccountsPage from './components/AccountsPage';
import AddExpenseForm from './components/AddExpenseForm';
import FavoriteMovementsCard from './components/FavoriteMovementsCard';
import BudgetPage from './components/BudgetPage';
import RealVsBudgetPage from './components/RealVsBudgetPage';
import DashboardPage from './components/DashboardPage';
import AuthPage from './components/AuthPage';
import UsersPage from './components/UsersPage';
import ActivityPage from './components/ActivityPage';
import { useEffect, useState } from 'react';
import { authFetch, clearAuth, getUser, isAuthenticated } from './utils/auth';
import { API_BASE_URL } from './utils/api';
import { formatCurrencyMXN } from './utils/formatters';
import { typography } from './styles/typography';


function Expenses({ refreshExpenses, onExpenseCreated }) {
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [favoriteMode, setFavoriteMode] = useState(false);
  const [favoritePrefill, setFavoritePrefill] = useState(null);
  const [favoriteRefreshKey, setFavoriteRefreshKey] = useState(0);

  const getTodayInputValue = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().slice(0, 10);
  };

  const handleCancelEdit = () => {
    setSelectedExpense(null);
  };

  const handleExpenseSaved = () => {
    setSelectedExpense(null);
    setFavoriteMode(false);
    setFavoritePrefill(null);
    onExpenseCreated();
  };

  const handleCreateFavorite = () => {
    setSelectedExpense(null);
    setFavoritePrefill(null);
    setFavoriteMode(true);
  };

  const handleEditExpense = (expense) => {
    setFavoriteMode(false);
    setFavoritePrefill(null);
    setSelectedExpense(expense);
  };

  const handleFavoriteSaved = () => {
    setFavoriteRefreshKey((prev) => prev + 1);
  };

  const handleApplyFavorite = (favorite) => {
    setSelectedExpense(null);
    setFavoriteMode(false);
    setFavoritePrefill({
      alias: favorite.alias,
      date: getTodayInputValue(),
      type: favorite.type,
      category_id: favorite.category_id,
      concept_id: favorite.concept_id,
      description: favorite.description,
      account_id: favorite.account_id,
    });
  };

  const handleRequestDeleteExpense = (expense) => {
    setExpenseToDelete(expense);
  };

  const handleCancelDelete = () => {
    setExpenseToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;

    await authFetch(`${API_BASE_URL}/api/expenses/${expenseToDelete.id}`, {
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
        favoriteMode={favoriteMode}
        favoritePrefill={favoritePrefill}
        onFavoriteModeChange={setFavoriteMode}
        onFavoriteSaved={handleFavoriteSaved}
        onFavoritePrefillClear={() => setFavoritePrefill(null)}
      />

      <FavoriteMovementsCard
        refreshKey={favoriteRefreshKey}
        onApplyFavorite={handleApplyFavorite}
        onCreateFavorite={handleCreateFavorite}
      />

      <ExpensesTable
        refreshExpenses={refreshExpenses}
        onEditExpense={handleEditExpense}
        selectedExpense={selectedExpense}
      />

      {expenseToDelete && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const navItems = [
    { to: '/dashboard', icon: 'bx bx-grid-alt', label: 'Resumen' },
    { to: '/gastos', icon: 'bx bx-receipt', label: 'Movimientos' },
    { to: '/presupuesto', icon: 'bx bx-wallet', label: 'Presupuesto' },
    { to: '/real-vs-presupuesto', icon: 'bx bx-bar-chart-alt-2', label: 'Variaciones' },
    { to: '/cuentas', icon: 'bx bx-credit-card', label: 'Cuentas' },
    { to: '/actividad', icon: 'bx bx-history', label: 'Actividad' },
    ...(currentUser?.role === 'admin'
      ? [{ to: '/usuarios', icon: 'bx bxs-user-account', label: 'Usuarios' }]
      : []),
  ];

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
    setIsMobileMenuOpen(false);
    navigate('/auth');
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const renderNavigation = ({ onNavigate } = {}) => (
    <ul
      className="app-nav-list"
      style={{
        listStyle: 'none',
        padding: 0,
        margin: '16px 0 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}
    >
      {navItems.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} style={getSidebarLinkStyle} onClick={onNavigate}>
            <i className={item.icon}></i>
            {item.label}
          </NavLink>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() => {
            if (onNavigate) onNavigate();
            setIsLogoutModalOpen(true);
          }}
          style={getSidebarButtonStyle()}
        >
          <i className='bx bx-log-out'></i>
          Cerrar sesión
        </button>
      </li>
    </ul>
  );

  const todayLabel = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const mobileTodayLabel = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="app-root"
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        background: theme.background,
      }}
    >
      {showSidebar ? (
        <>
        <div className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={isMobileMenuOpen}
          >
            <i className="bx bx-menu"></i>
          </button>
          <div className="mobile-topbar-center">
            <div className="mobile-topbar-title">Control de Gastos</div>
            {currentUser && (
              <div className="mobile-topbar-meta">
                <span>Hola <strong>{currentUser.name}</strong>!</span>
                <span>{mobileTodayLabel}</span>
              </div>
            )}
          </div>
          <div className="mobile-topbar-version">v1.0</div>
        </div>

        {isMobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              className="mobile-menu-panel"
              onClick={(event) => event.stopPropagation()}
              style={{
                background: theme.sidebarBackground,
                color: theme.sidebarText,
              }}
            >
              <div className="mobile-menu-header">
                <h2 style={{ margin: 0, color: theme.sidebarText, fontSize: 20, fontWeight: 600 }}>Control de Gastos</h2>
                <button
                  type="button"
                  className="mobile-menu-close"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Cerrar menú"
                >
                  <i className="bx bx-x"></i>
                </button>
              </div>
              {renderNavigation({ onNavigate: () => setIsMobileMenuOpen(false) })}
            </div>
          </div>
        )}

        <div
          className="app-shell"
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
            className="desktop-sidebar"
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
            {renderNavigation()}
          </div>

          <div
            className="app-content"
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
              className="app-content-inner"
              style={{
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
              }}
            >
              {currentUser && (
                <div
                  className="user-meta"
                  style={{
                    marginBottom: 16,
                    color: theme.textBody,
                  }}
                >
                  <div className="user-meta-row" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      ¡Hola, {currentUser.name}!
                    </div>
                    <div style={{ color: theme.textSecondary, fontSize: 12 }}>
                      {todayLabel}
                    </div>
                    <div className="user-meta-version" style={{ color: theme.textPrimary, fontSize: 12, fontWeight: 600 }}>v1.0</div>
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
        </>
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
          className="modal-overlay"
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
            className="modal-content"
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
