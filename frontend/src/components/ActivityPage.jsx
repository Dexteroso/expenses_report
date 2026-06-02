import { useEffect, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch, getUser } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import { formatCurrencyMXN } from '../utils/formatters';
import { typography } from '../styles/typography';

const periodOptions = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'last3', label: 'Últimos 3 días' },
  { value: 'last7', label: 'Últimos 7 días' },
  { value: 'last30', label: 'Últimos 30 días' },
  { value: 'all', label: 'Todo' },
];

const eventLabels = {
  'auth.login_success': 'Inicio de sesión exitoso',
  'auth.login_failed': 'Inicio de sesión fallido',
  'auth.password_reset_requested': 'Recuperación de contraseña solicitada',
  'auth.password_reset_completed': 'Contraseña restablecida',
  'expense.created': 'Movimiento creado',
  'expense.updated': 'Movimiento actualizado',
  'expense.deleted': 'Movimiento eliminado',
  'account.created': 'Cuenta creada',
  'account.updated': 'Cuenta actualizada',
  'account.deactivated': 'Cuenta desactivada',
  'budget.updated': 'Presupuesto actualizado',
  'favorite.created': 'Frecuente creado',
  'favorite.deleted': 'Frecuente eliminado',
  'favorite.used': 'Frecuente usado',
  'user.created': 'Usuario creado',
  'user.updated': 'Usuario actualizado',
  'user.activated': 'Usuario activado',
  'user.deactivated': 'Usuario desactivado',
};

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function ActivityPage() {
  const theme = lightTheme;
  const currentUser = getUser();
  const [period, setPeriod] = useState('today');
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const cardStyle = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: 16,
    boxShadow: theme.shadow,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({ period });

        if (currentUser?.role === 'admin') {
          params.set('allUsers', 'true');
        }

        const response = await authFetch(`${API_BASE_URL}/api/activity?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Error fetching activity');
        }

        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (fetchError) {
        console.error(fetchError);
        setError('No se pudo cargar la actividad.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [period, currentUser?.role]);

  const selectedPeriodLabel = periodOptions.find((option) => option.value === period)?.label || 'Hoy';

  return (
    <div
      className="page-fill activity-page"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        gap: 20,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        height: 'calc(100vh - 96px)',
        minHeight: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div className="responsive-card activity-top-card" style={cardStyle}>
        <header className="page-header">
          <h1>Actividad</h1>
          <p>Visualiza la actividad reciente de tu cuenta y movimientos.</p>
        </header>

        <div className="responsive-filter-bar" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ color: theme.textBody, fontSize: 12, fontWeight: 'bold', lineHeight: '30px' }}>
            Periodo
          </label>
          <select
            className="text-input activity-period-input"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p style={{ color: '#b91c1c', marginBottom: 0, fontSize: 12 }}>
            {error}
          </p>
        )}
      </div>

      <div
        className="responsive-card activity-list-card"
        style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <h2 style={{ ...typography.sectionTitle, marginTop: 0, marginBottom: 12 }}>
          {selectedPeriodLabel}
        </h2>

        <div
          style={{
            display: 'grid',
            gap: 5,
            minHeight: 0,
            overflowY: 'auto',
            paddingRight: 2,
          }}
        >
          {isLoading ? (
            <p style={{ color: theme.textSecondary, margin: 0, fontSize: 12 }}>
              Cargando actividad...
            </p>
          ) : logs.length === 0 ? (
            <p style={{ color: theme.textSecondary, margin: 0, fontSize: 12 }}>
              No hay actividad para este periodo.
            </p>
          ) : (
            <>
              {logs.map((log) => (
                <ActivityRow key={log._id || `${log.eventType}-${log.createdAt}`} log={log} theme={theme} />
              ))}
              <div style={{ color: theme.textSecondary, fontSize: 11, padding: '4px 8px' }}>
                Fin de registros
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ log, theme }) {
  const time = formatActivityTime(log.createdAt);
  const action = eventLabels[log.eventType] || log.eventType;
  const details = getActivityDetails(log).filter(Boolean);
  const primaryParts = [
    time,
    action,
    getPrimaryActivityDetail(log, details),
  ].filter(Boolean);
  const secondaryParts = getSecondaryActivityDetails(log, details).filter(Boolean);
  const parts = [time, action, ...details].filter(Boolean);
  const iconClass = getActivityIconClass(log.eventType);

  return (
    <div
      className="activity-row"
      style={{
        padding: '4px 8px',
        borderRadius: 8,
        background: theme.surfaceMuted,
        border: `1px solid ${theme.border}`,
        color: theme.textBody,
        fontSize: 12,
        lineHeight: 1.4,
        textAlign: 'left',
        minHeight: 24,
        boxSizing: 'border-box',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={parts.join(' · ')}
    >
      <span className="activity-row-icon" aria-hidden="true">
        <i className={iconClass}></i>
      </span>
      <span className="activity-row-desktop">
        {parts.join(' · ')}
      </span>
      <span className="activity-row-mobile">
        <span className="activity-row-primary">{primaryParts.join(' · ')}</span>
        {secondaryParts.length > 0 && (
          <span className="activity-row-secondary">{secondaryParts.join(' · ')}</span>
        )}
      </span>
    </div>
  );
}

function getActivityIconClass(eventType) {
  const iconMap = {
    'auth.login_success': 'bx bx-log-in-circle',
    'auth.login_failed': 'bx bx-error-circle',
    'auth.password_reset_requested': 'bx bx-key',
    'auth.password_reset_completed': 'bx bx-lock-open-alt',
    'expense.created': 'bx bx-wallet',
    'expense.updated': 'bx bx-edit-alt',
    'expense.deleted': 'bx bx-trash',
    'account.created': 'bx bx-credit-card',
    'account.updated': 'bx bx-credit-card',
    'account.deactivated': 'bx bx-block',
    'budget.updated': 'bx bx-wallet',
    'favorite.created': 'bx bx-star',
    'favorite.deleted': 'bx bx-trash',
    'favorite.used': 'bx bx-star',
    'user.created': 'bx bx-user-plus',
    'user.updated': 'bx bx-user',
    'user.activated': 'bx bx-user-check',
    'user.deactivated': 'bx bx-user-x',
  };

  return iconMap[eventType] || 'bx bx-history';
}

function getPrimaryActivityDetail(log, details) {
  if (log.entityType === 'expense') {
    return details[0];
  }

  return '';
}

function getSecondaryActivityDetails(log, details) {
  if (log.entityType === 'expense') {
    return details.slice(1);
  }

  return details;
}

function formatActivityTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function getActivityDetails(log) {
  const metadata = log.metadata || {};

  if (log.entityType === 'auth') {
    return getAuthDetails(log, metadata);
  }

  if (log.entityType === 'expense') {
    return [
      metadata.expenseCode,
      metadata.categoryName || metadata.conceptName,
      formatAmount(metadata.amount),
    ];
  }

  if (log.entityType === 'account') {
    return [
      metadata.accountAlias || buildAccountFallback(metadata),
    ];
  }

  if (log.entityType === 'budget') {
    return getBudgetDetails(metadata);
  }

  if (log.entityType === 'favorite') {
    return getFavoriteDetails(metadata);
  }

  if (log.entityType === 'user') {
    return getUserDetails(log, metadata);
  }

  return [];
}

function getFavoriteDetails(metadata) {
  return [
    metadata.favoriteAlias,
    metadata.categoryName || metadata.conceptName,
    metadata.accountAlias,
    metadata.expenseCode,
  ];
}

function getAuthDetails(log, metadata) {
  if (log.eventType === 'auth.login_success') {
    return [
      metadata.userName || log.actorName,
      metadata.userEmail || log.actorEmail,
    ];
  }

  if (log.eventType === 'auth.login_failed') {
    return [
      metadata.attemptedEmail || metadata.userEmail || log.actorEmail,
    ];
  }

  return [
    metadata.userName || log.actorName,
    metadata.userEmail || log.actorEmail,
  ];
}

function getBudgetDetails(metadata) {
  const changes = Array.isArray(metadata.changes) ? metadata.changes : [];
  const changeCount = Number(metadata.savedCount || changes.length || 0);

  if (changeCount > 1) {
    return [
      metadata.year,
      `${changeCount} cambios`,
    ];
  }

  const change = changes[0] || metadata;
  const categoryConcept = [change.categoryName, change.conceptName].filter(Boolean).join(' / ');
  const amountChange = formatAmountChange(change.oldAmount, change.newAmount);

  return [
    change.year || metadata.year,
    formatMonth(change.month),
    categoryConcept,
    amountChange,
  ];
}

function getUserDetails(log, metadata) {
  const targetName = metadata.targetName || metadata.targetEmail || log.actorName || log.actorEmail;

  if (log.eventType !== 'user.updated') {
    return [targetName];
  }

  return [
    targetName,
    formatUserChangedFields(metadata.changedFields),
  ];
}

function formatAmount(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  return formatCurrencyMXN(value);
}

function formatAmountChange(oldAmount, newAmount) {
  if (oldAmount === undefined || oldAmount === null || newAmount === undefined || newAmount === null) {
    return '';
  }

  return `${formatCurrencyMXN(oldAmount)} → ${formatCurrencyMXN(newAmount)}`;
}

function formatUserChangedFields(changedFields) {
  if (!Array.isArray(changedFields) || changedFields.length === 0) {
    return '';
  }

  return changedFields
    .map((change) => {
      if (change.field === 'role') {
        return `rol: ${change.from} → ${change.to}`;
      }

      if (change.field === 'name') {
        return 'nombre actualizado';
      }

      if (change.field === 'email') {
        return 'email actualizado';
      }

      if (change.field === 'is_active') {
        return `estado: ${formatActiveState(change.from)} → ${formatActiveState(change.to)}`;
      }

      return '';
    })
    .filter(Boolean)
    .join(', ');
}

function formatActiveState(value) {
  return value ? 'activo' : 'inactivo';
}

function formatMonth(month) {
  const monthIndex = Number(month) - 1;

  if (monthIndex < 0 || monthIndex > 11) {
    return '';
  }

  return monthNames[monthIndex];
}

function buildAccountFallback(metadata) {
  if (metadata.bankName && metadata.lastFour) {
    return `${metadata.bankName}_${metadata.lastFour}`;
  }

  return metadata.bankName || '';
}

export default ActivityPage;
