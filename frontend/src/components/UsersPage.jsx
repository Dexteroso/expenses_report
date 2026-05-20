import { useEffect, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch, getUser } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import PrimaryButton from './ui/PrimaryButton';

function UsersPage() {
  const theme = lightTheme;
  const cardStyle = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    padding: '16px',
    boxShadow: theme.shadow,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  };
  const headerCellStyle = {
    textAlign: 'center',
    padding: '5px 6px',
    fontWeight: 'bold',
  };
  const rowCellStyle = {
    padding: '5px 6px',
    textAlign: 'center',
    verticalAlign: 'middle',
  };
  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'admin';
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageMessage, setPageMessage] = useState('');
  const [rowMessages, setRowMessages] = useState({});
  const [savingRows, setSavingRows] = useState({});
  const [statusLoadingRows, setStatusLoadingRows] = useState({});

  const fetchUsers = async () => {
    if (!isAdmin) {
      return;
    }

    setIsLoading(true);
    setPageMessage('');

    try {
      const response = await authFetch(`${API_BASE_URL}/api/users`);
      const data = await response.json();

      if (!response.ok) {
        setPageMessage(data.error || 'No se pudieron cargar los usuarios.');
        return;
      }

      setUsers(data);
    } catch (error) {
      console.error(error);
      setPageMessage('No se pudieron cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (userId, field, value) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
              ...user,
              [field]: value,
            }
          : user
      )
    );

    setRowMessages((prev) => ({
      ...prev,
      [userId]: '',
    }));
  };

  const handleSaveUser = async (user) => {
    setSavingRows((prev) => ({
      ...prev,
      [user.id]: true,
    }));
    setRowMessages((prev) => ({
      ...prev,
      [user.id]: '',
    }));

    try {
      const response = await authFetch(`${API_BASE_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRowMessages((prev) => ({
          ...prev,
          [user.id]: data.error || 'No se pudo actualizar el usuario.',
        }));
        return;
      }

      setRowMessages((prev) => ({
        ...prev,
        [user.id]: 'Usuario actualizado',
      }));

      await fetchUsers();
    } catch (error) {
      console.error(error);
      setRowMessages((prev) => ({
        ...prev,
        [user.id]: 'No se pudo actualizar el usuario.',
      }));
    } finally {
      setSavingRows((prev) => ({
        ...prev,
        [user.id]: false,
      }));
    }
  };

  const handleStatusChange = async (user) => {
    const isSelf = currentUser?.id === user.id;

    if (isSelf && Boolean(user.is_active)) {
      setRowMessages((prev) => ({
        ...prev,
        [user.id]: 'No puedes desactivar tu propia cuenta.',
      }));
      return;
    }

    setStatusLoadingRows((prev) => ({
      ...prev,
      [user.id]: true,
    }));
    setRowMessages((prev) => ({
      ...prev,
      [user.id]: '',
    }));

    try {
      const response = await authFetch(
        `${API_BASE_URL}/api/users/${user.id}/${user.is_active ? 'deactivate' : 'activate'}`,
        {
          method: 'PATCH',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setRowMessages((prev) => ({
          ...prev,
          [user.id]: data.error || 'No se pudo actualizar el estado del usuario.',
        }));
        return;
      }

      // setRowMessages((prev) => ({
      //   ...prev,
      //   [user.id]: user.is_active ? 'Usuario desactivado' : 'Usuario activado',
      // }));

      await fetchUsers();
    } catch (error) {
      console.error(error);
      setRowMessages((prev) => ({
        ...prev,
        [user.id]: 'No se pudo actualizar el estado del usuario.',
      }));
    } finally {
      setStatusLoadingRows((prev) => ({
        ...prev,
        [user.id]: false,
      }));
    }
  };

  if (!isAdmin) {
    return (
      <div className="responsive-card users-card" style={cardStyle}>
        <header className="page-header">
          <h1>Usuarios</h1>
          <p>Administra usuarios, permisos y accesos de la plataforma.</p>
        </header>
        <p style={{ margin: 0, color: theme.textSecondary }}>
          No tienes permisos para ver esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="responsive-card users-card" style={cardStyle}>
      <header className="page-header">
        <h1>Usuarios</h1>
        <p>Administra usuarios, permisos y accesos de la plataforma.</p>
      </header>

      {pageMessage && (
        <p style={{ color: '#b91c1c', fontWeight: 'bold' }}>
          {pageMessage}
        </p>
      )}

      {isLoading ? (
        <p style={{ margin: 0, color: theme.textSecondary }}>Cargando usuarios...</p>
      ) : (
        <>
          <div className="table-scroll users-table-scroll" style={{ width: '100%', overflowX: 'auto', boxSizing: 'border-box' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead style={{ fontSize: 12, color: theme.textSecondary, borderBottom: `2px solid ${theme.border}` }}>
                <tr>
                  <th style={headerCellStyle}>Nombre</th>
                  <th style={headerCellStyle}>Email</th>
                  <th style={headerCellStyle}>Rol</th>
                  <th style={headerCellStyle}>Estado</th>
                  <th style={headerCellStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 10, color: theme.textBody }}>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                    <td style={rowCellStyle}>
                      <input
                        className="text-input users-edit-input"
                        type="text"
                        value={user.name}
                        onChange={(event) => handleChange(user.id, 'name', event.target.value)}
                      />
                    </td>
                    <td style={rowCellStyle}>
                      <input
                        className="text-input users-edit-input"
                        type="email"
                        value={user.email}
                        onChange={(event) => handleChange(user.id, 'email', event.target.value)}
                      />
                    </td>
                    <td style={rowCellStyle}>
                      <select
                        className="text-input users-edit-input"
                        value={user.role}
                        onChange={(event) => handleChange(user.id, 'role', event.target.value)}
                      >
                        <option value="admin">admin</option>
                        <option value="user">user</option>
                      </select>
                    </td>
                    <td style={rowCellStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(user.is_active)}
                          aria-label={Boolean(user.is_active) ? 'Usuario activo' : 'Usuario inactivo'}
                          title={Boolean(user.is_active) ? 'Activo' : 'Inactivo'}
                          onClick={() => handleStatusChange(user)}
                          disabled={Boolean(statusLoadingRows[user.id]) || (currentUser?.id === user.id && Boolean(user.is_active))}
                          style={{
                            width: 42,
                            height: 24,
                            borderRadius: 999,
                            border: `1px solid ${
                              Boolean(user.is_active) ? '#11A9CC' : theme.border
                            }`,
                            background: Boolean(user.is_active)
                              ? '#11A9CC'
                              : '#f8fafc',
                            padding: 0,
                            position: 'relative',
                            cursor:
                              Boolean(statusLoadingRows[user.id]) || (currentUser?.id === user.id && Boolean(user.is_active))
                                ? 'not-allowed'
                                : 'pointer',
                            opacity:
                              Boolean(statusLoadingRows[user.id]) || (currentUser?.id === user.id && Boolean(user.is_active))
                                ? 0.7
                                : 1,
                            transition: 'background 160ms ease, border-color 160ms ease, opacity 160ms ease',
                            boxSizing: 'border-box',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: 2,
                              left: Boolean(user.is_active) ? 20 : 2,
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: '#fff',
                              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.22)',
                              transition: 'left 160ms ease',
                            }}
                          />
                        </button>
                      </div>
                    </td>
                    <td style={rowCellStyle}>
                      <div style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
                        <PrimaryButton
                          type="button"
                          className="users-save-button"
                          onClick={() => handleSaveUser(user)}
                          disabled={Boolean(savingRows[user.id])}
                        >
                          {savingRows[user.id] ? 'Guardando...' : 'Guardar'}
                        </PrimaryButton>
                        {rowMessages[user.id] && (
                          <span
                            style={{
                              color: rowMessages[user.id].includes('No se pudo') ? '#b91c1c' : theme.textPrimary,
                              fontSize: 12,
                              textAlign: 'center',
                            }}
                          >
                            {rowMessages[user.id]}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="users-mobile-list">
          {users.map((user) => (
            <article key={user.id} className="users-mobile-card">
              <div className="users-mobile-card-header">
                <div style={{ minWidth: 0 }}>
                  <span className="users-mobile-title">{user.name || 'Sin nombre'}</span>
                  <span className="users-mobile-email">{user.email}</span>
                </div>
                <span className={`users-mobile-status ${Boolean(user.is_active) ? 'is-active' : 'is-inactive'}`}>
                  {Boolean(user.is_active) ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="users-mobile-fields">
                <label className="users-mobile-field-name">
                  <span>Nombre</span>
                  <input
                    className="text-input users-edit-input"
                    type="text"
                    value={user.name}
                    onChange={(event) => handleChange(user.id, 'name', event.target.value)}
                  />
                </label>
                <label className="users-mobile-field-email">
                  <span>Email</span>
                  <input
                    className="text-input users-edit-input"
                    type="email"
                    value={user.email}
                    onChange={(event) => handleChange(user.id, 'email', event.target.value)}
                  />
                </label>
                <label className="users-mobile-field-role">
                  <span>Rol</span>
                  <select
                    className="text-input users-edit-input"
                    value={user.role}
                    onChange={(event) => handleChange(user.id, 'role', event.target.value)}
                  >
                    <option value="admin">admin</option>
                    <option value="user">user</option>
                  </select>
                </label>
                <div className="users-mobile-state-row">
                  <span>Estado</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(user.is_active)}
                    aria-label={Boolean(user.is_active) ? 'Usuario activo' : 'Usuario inactivo'}
                    title={Boolean(user.is_active) ? 'Activo' : 'Inactivo'}
                    onClick={() => handleStatusChange(user)}
                    disabled={Boolean(statusLoadingRows[user.id]) || (currentUser?.id === user.id && Boolean(user.is_active))}
                    className={`users-mobile-switch ${Boolean(user.is_active) ? 'is-active' : 'is-inactive'}`}
                  >
                    <span />
                  </button>
                </div>

                <PrimaryButton
                  type="button"
                  className="users-mobile-save-button"
                  onClick={() => handleSaveUser(user)}
                  disabled={Boolean(savingRows[user.id])}
                >
                  {savingRows[user.id] ? 'Guardando...' : 'Guardar'}
                </PrimaryButton>
              </div>

              <div className="users-mobile-actions">
                {rowMessages[user.id] && (
                  <span
                    className="users-mobile-message"
                    style={{
                      color: rowMessages[user.id].includes('No se pudo') ? '#b91c1c' : theme.textPrimary,
                    }}
                  >
                    {rowMessages[user.id]}
                  </span>
                )}
              </div>
            </article>
          ))}
          </div>
        </>
      )}
    </div>
  );
}

export default UsersPage;
