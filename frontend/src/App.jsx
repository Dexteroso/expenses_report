/* eslint-disable react-hooks/set-state-in-effect -- Existing onboarding/menu effects intentionally synchronize local UI state. */
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
import HelpPage from './components/HelpPage';
import PortfolioPage from './pages/PortfolioPage';
import { useEffect, useState } from 'react';
import { authFetch, clearAuth, getUser, isAuthenticated, markOnboardingCompleted } from './utils/auth';
import { API_BASE_URL } from './utils/api';
import { formatCurrencyMXN } from './utils/formatters';
import { typography } from './styles/typography';
import dexforgeIcon from './assets/brand/dexforge-icon-transparent.png';
import transactionIllustration from './assets/Transaction.png';
import PrimaryButton from './components/ui/PrimaryButton';


function Expenses({ refreshExpenses, onExpenseCreated, onboardingStart = false, onOnboardingDashboard }) {
  const hasCompletedOnboarding = Boolean(getUser()?.onboarding_completed);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [favoriteMode, setFavoriteMode] = useState(false);
  const [selectedFavoriteSlotIndex, setSelectedFavoriteSlotIndex] = useState(null);
  const [favoritePrefill, setFavoritePrefill] = useState(null);
  const [favoriteRefreshKey, setFavoriteRefreshKey] = useState(0);
  const [isMovementOnboardingActive, setIsMovementOnboardingActive] = useState(
    Boolean(onboardingStart && !hasCompletedOnboarding)
  );
  const [isMovementOnboardingReady, setIsMovementOnboardingReady] = useState(false);
  const [isMovementOnboardingComplete, setIsMovementOnboardingComplete] = useState(false);

  useEffect(() => {
    if (hasCompletedOnboarding) {
      setIsMovementOnboardingActive(false);
      setIsMovementOnboardingReady(false);
      return;
    }

    if (onboardingStart) {
      setIsMovementOnboardingActive(true);
      setIsMovementOnboardingReady(false);
      setIsMovementOnboardingComplete(false);
      return;
    }

    const checkExistingExpenses = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/expenses`);
        const data = await response.json();

        if (response.ok && Array.isArray(data) && data.length === 0) {
          setIsMovementOnboardingActive(true);
          setIsMovementOnboardingReady(false);
        }
      } catch (error) {
        console.error('Error checking onboarding expenses:', error);
      }
    };

    checkExistingExpenses();
  }, [onboardingStart, hasCompletedOnboarding]);

  const handleCancelEdit = () => {
    setSelectedExpense(null);
  };

  const handleExpenseSaved = () => {
    if (isMovementOnboardingActive || isMovementOnboardingReady) {
      markOnboardingCompleted();
      setIsMovementOnboardingActive(false);
      setIsMovementOnboardingReady(false);
      setIsMovementOnboardingComplete(true);
    }

    setSelectedExpense(null);
    setFavoriteMode(false);
    setSelectedFavoriteSlotIndex(null);
    setFavoritePrefill(null);
    onExpenseCreated();
  };

  const handleStartMovementOnboarding = () => {
    setIsMovementOnboardingActive(false);
    setIsMovementOnboardingReady(true);
  };

  const handleFavoriteModeChange = (nextFavoriteMode) => {
    setFavoriteMode(nextFavoriteMode);

    if (!nextFavoriteMode) {
      setSelectedFavoriteSlotIndex(null);
    }
  };

  const handleCreateFavorite = (slotIndex) => {
    setSelectedExpense(null);
    setFavoritePrefill(null);
    setFavoriteMode(true);
    setSelectedFavoriteSlotIndex(slotIndex);
  };

  const handleEditExpense = (expense) => {
    setFavoriteMode(false);
    setSelectedFavoriteSlotIndex(null);
    setFavoritePrefill(null);
    setSelectedExpense(expense);
  };

  const handleFavoriteSaved = () => {
    setFavoriteRefreshKey((prev) => prev + 1);
    setSelectedFavoriteSlotIndex(null);
  };

  const handleApplyFavorite = (favorite) => {
    setSelectedExpense(null);
    setFavoriteMode(false);
    setSelectedFavoriteSlotIndex(null);
    setFavoritePrefill({
      id: favorite.id,
      alias: favorite.alias,
      date: '',
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
    <div className="movements-page">
      {isMovementOnboardingActive && !isMovementOnboardingComplete && (
        <div className="onboarding-modal-overlay" role="dialog" aria-modal="true">
          <div className="onboarding-modal-content-area">
            <div className="onboarding-card movement-onboarding-card">
              <img className="onboarding-illustration" src={transactionIllustration} alt="" aria-hidden="true" />
              <h2>Registra tu primer movimiento</h2>
              <p>Agrega ingresos y egresos para comenzar a visualizar tus finanzas.</p>
              <PrimaryButton type="button" className="onboarding-primary-button" onClick={handleStartMovementOnboarding}>
                + Nuevo movimiento
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {isMovementOnboardingComplete && (
        <div className="onboarding-modal-overlay" role="dialog" aria-modal="true">
          <div className="onboarding-modal-content-area">
            <div className="onboarding-card movement-onboarding-card movement-onboarding-complete">
              <img className="onboarding-illustration" src={transactionIllustration} alt="" aria-hidden="true" />
              <h2>Primer movimiento registrado 🎉</h2>
              <p>Ya puedes consultar tu resumen financiero.</p>
              <PrimaryButton type="button" className="onboarding-primary-button" onClick={onOnboardingDashboard}>
                Ir al dashboard
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <header className="movements-page-header">
        <h1>Movimientos</h1>
        <p>Registra y administra tus ingresos y egresos.</p>
      </header>

      <div className="movements-top-grid">
        <AddExpenseForm
          selectedExpense={selectedExpense}
          onExpenseCreated={handleExpenseSaved}
          onCancelEdit={handleCancelEdit}
          onDeleteExpense={handleRequestDeleteExpense}
          favoriteMode={favoriteMode}
          favoritePrefill={favoritePrefill}
          onFavoriteModeChange={handleFavoriteModeChange}
          onFavoriteSaved={handleFavoriteSaved}
          onFavoritePrefillClear={() => setFavoritePrefill(null)}
          onboardingActive={isMovementOnboardingReady}
        />

        <FavoriteMovementsCard
          refreshKey={favoriteRefreshKey}
          onApplyFavorite={handleApplyFavorite}
          onCreateFavorite={handleCreateFavorite}
          selectedSlotIndex={selectedFavoriteSlotIndex}
        />
      </div>

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
          <div className="modal-content expense-delete-modal" style={{
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
            <div className="expense-delete-details" style={{ display: 'flex', flexDirection: 'column', gap: 0, fontSize: 11, marginTop: 12, marginBottom: 20 }}>
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
    </div>
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
  const [accountOnboardingChecked, setAccountOnboardingChecked] = useState(false);
  const [hasOnboardingAccounts, setHasOnboardingAccounts] = useState(null);
  const [showDashboardOnboardingSuccess, setShowDashboardOnboardingSuccess] = useState(false);
  const theme = lightTheme;
  const sidebarWidth = 150;
  const contentMinWidth = 0;
  const appShellMaxWidth = 1140;
  const location = useLocation();
  const navigate = useNavigate();
  const authenticated = isAuthenticated();
  const currentUser = getUser();
  const hasCompletedOnboarding = Boolean(currentUser?.onboarding_completed);
  const isAuthRoute = location.pathname === '/auth';
  const isPortfolioRoute = location.pathname === '/portfolio' || location.pathname === '/portfolio/';
  const isDashboardRoute = location.pathname === '/dashboard';
  const showSidebar = !isAuthRoute && !isPortfolioRoute && authenticated;
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
      { to: '/ayuda', icon: 'bx bx-help-circle', label: 'Ayuda' },
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

  useEffect(() => {
    if (!authenticated) {
      setAccountOnboardingChecked(false);
      setHasOnboardingAccounts(null);
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated || isAuthRoute || isPortfolioRoute || accountOnboardingChecked) {
      return;
    }

    if (hasCompletedOnboarding) {
      setHasOnboardingAccounts(null);
      setAccountOnboardingChecked(true);
      return;
    }

    const checkAccountsForOnboarding = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/accounts`);
        const data = await response.json();

        if (response.ok && Array.isArray(data)) {
          const hasAccounts = data.length > 0;
          setHasOnboardingAccounts(hasAccounts);

          if (!hasAccounts && location.pathname !== '/cuentas') {
            navigate('/cuentas', { replace: true, state: { onboarding: 'first-account' } });
          }
        }
      } catch (error) {
        console.error('Error checking onboarding accounts:', error);
      } finally {
        setAccountOnboardingChecked(true);
      }
    };

    checkAccountsForOnboarding();
  }, [authenticated, isAuthRoute, isPortfolioRoute, accountOnboardingChecked, hasCompletedOnboarding, location.pathname, navigate]);

  useEffect(() => {
    if (
      authenticated &&
      !hasCompletedOnboarding &&
      hasOnboardingAccounts === false &&
      !isAuthRoute &&
      !isPortfolioRoute &&
      location.pathname !== '/cuentas'
    ) {
      navigate('/cuentas', { replace: true, state: { onboarding: 'first-account' } });
    }
  }, [authenticated, hasCompletedOnboarding, hasOnboardingAccounts, isAuthRoute, isPortfolioRoute, location.pathname, navigate]);

  const handleFirstAccountCreated = () => {
    setAccountOnboardingChecked(true);
    setHasOnboardingAccounts(true);
    navigate('/gastos', { replace: true, state: { onboarding: 'first-movement' } });
  };

  const handleOnboardingDashboard = () => {
    markOnboardingCompleted();
    setShowDashboardOnboardingSuccess(true);
    navigate('/dashboard');
  };

  const getUserInitials = (name = '') => {
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

    return initials || 'U';
  };

  const renderSidebarProfile = (extraClassName = '') => {
    if (!currentUser) {
      return null;
    }

    const roleLabel = currentUser.role === 'admin' ? 'Admin' : 'Usuario';

    return (
      <div className={`desktop-sidebar-profile ${extraClassName}`.trim()}>
        <div className="desktop-sidebar-avatar" aria-hidden="true">
          {getUserInitials(currentUser.name)}
        </div>
        <div className="desktop-sidebar-profile-copy">
          <span className="desktop-sidebar-profile-name">{currentUser.name}</span>
          <span className="desktop-sidebar-profile-role">{roleLabel}</span>
        </div>
      </div>
    );
  };

  const renderBrandMark = (className = '') => (
    <div className={`brand-logo ${className}`.trim()} aria-label="DexForge">
      <img className="brand-logo-icon" src={dexforgeIcon} alt="" aria-hidden="true" />
      <span className="brand-logo-text">DexForge</span>
    </div>
  );

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

  if (isPortfolioRoute) {
    return <PortfolioPage />;
  }

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
          {renderBrandMark('mobile-topbar-logo')}
          <span className="mobile-topbar-spacer" aria-hidden="true" />
        </div>

        {isMobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              className="mobile-menu-panel"
              onClick={(event) => event.stopPropagation()}
              style={{
                background: 'linear-gradient(180deg, #582888 0%, #557EFA 100%)',
                color: theme.sidebarText,
              }}
            >
              <div className="mobile-menu-header">
                {renderBrandMark('mobile-menu-logo')}
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
              {renderSidebarProfile('mobile-sidebar-profile')}
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
              background: 'linear-gradient(180deg, #582888 0%, #557EFA 100%)',
              color: theme.sidebarText,
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="desktop-sidebar-brand">{renderBrandMark('desktop-sidebar-logo')}</div>
            {renderNavigation()}
            {renderSidebarProfile()}
          </div>

          <div
            className="app-content"
            style={{
              minWidth: 0,
              width: '100%',
              background: isDashboardRoute ? 'transparent' : theme.background,
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
              <Routes>
                <Route
                  path="/auth"
                  element={authenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />}
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage
                        onboardingSuccess={showDashboardOnboardingSuccess}
                        onDismissOnboardingSuccess={() => setShowDashboardOnboardingSuccess(false)}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gastos"
                  element={
                    <ProtectedRoute>
                      <Expenses
                        onExpenseCreated={() => setRefreshExpenses(prev => !prev)}
                        refreshExpenses={refreshExpenses}
                        onboardingStart={location.state?.onboarding === 'first-movement'}
                        onOnboardingDashboard={handleOnboardingDashboard}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cuentas"
                  element={
                    <ProtectedRoute>
                      <AccountsPage
                        onFirstAccountCreated={handleFirstAccountCreated}
                        showFirstAccountOnboarding={!hasCompletedOnboarding}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route path="/actividad" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
                <Route path="/ayuda" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
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
            className="modal-content logout-modal"
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
            <div className="logout-modal-icon" aria-hidden="true">
              <i className="bx bx-log-out"></i>
            </div>
            <h2 className="logout-modal-title">
              Cerrar sesión
            </h2>

            <p className="logout-modal-description">
              ¿Seguro que quieres salir de DexForge?
            </p>

            <div
              className="logout-modal-actions"
            >
              <PrimaryButton
                type="button"
                variant="secondary"
                className="logout-modal-button"
                onClick={() => setIsLogoutModalOpen(false)}
              >
                Cancelar
              </PrimaryButton>

              <PrimaryButton
                type="button"
                className="logout-modal-button"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  handleLogout();
                }}
              >
                Cerrar sesión
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
