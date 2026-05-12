import { useEffect, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch, getUser } from '../utils/auth';
import { typography } from '../styles/typography';

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
  const pageTitleStyle = {
    ...typography.pageTitle,
    marginTop: 10,
    marginBottom: 10,
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
      const response = await authFetch('http://localhost:3000/api/users');
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
      const response = await authFetch(`http://localhost:3000/api/users/${user.id}`, {
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
        `http://localhost:3000/api/users/${user.id}/${user.is_active ? 'deactivate' : 'activate'}`,
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
        <h1 style={pageTitleStyle}>Usuarios</h1>
        <p style={{ margin: 0, color: theme.textSecondary }}>
          No tienes permisos para ver esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="responsive-card users-card" style={cardStyle}>
      <h1 style={pageTitleStyle}>Usuarios</h1>

      {pageMessage && (
        <p style={{ color: '#b91c1c', fontWeight: 'bold' }}>
          {pageMessage}
        </p>
      )}

      {isLoading ? (
        <p style={{ margin: 0, color: theme.textSecondary }}>Cargando usuarios...</p>
      ) : (
        <div className="table-scroll" style={{ width: '100%', overflowX: 'auto', boxSizing: 'border-box' }}>
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
                      type="text"
                      value={user.name}
                      onChange={(event) => handleChange(user.id, 'name', event.target.value)}
                      style={getInputStyle(theme)}
                    />
                  </td>
                  <td style={rowCellStyle}>
                    <input
                      type="email"
                      value={user.email}
                      onChange={(event) => handleChange(user.id, 'email', event.target.value)}
                      style={getInputStyle(theme)}
                    />
                  </td>
                  <td style={rowCellStyle}>
                    <select
                      value={user.role}
                      onChange={(event) => handleChange(user.id, 'role', event.target.value)}
                      style={getInputStyle(theme)}
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
                            Boolean(user.is_active) ? theme.sidebarBackground : theme.border
                          }`,
                          background: Boolean(user.is_active)
                            ? theme.sidebarBackground
                            : theme.inputDisabledBackground,
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
                      <button
                        type="button"
                        onClick={() => handleSaveUser(user)}
                        disabled={Boolean(savingRows[user.id])}
                        style={{
                          width: 'fit-content',
                          padding: '5px 12px',
                          borderRadius: 8,
                          border: `1px solid ${theme.border}`,
                          background: savingRows[user.id] ? theme.inputDisabledBackground : theme.sidebarBackground,
                          color: savingRows[user.id] ? theme.textSecondary : theme.sidebarText,
                          fontSize: 12,
                          // fontWeight: 'bold',
                          cursor: savingRows[user.id] ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {savingRows[user.id] ? 'Guardando...' : 'Guardar'}
                      </button>
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
      )}
    </div>
  );
}

function getInputStyle(theme) {
  return {
    width: '100%',
    padding: '5px 10px',
    borderRadius: 8,
    border: `1px solid ${theme.inputBorder}`,
    background: theme.inputBackground,
    color: theme.inputText,
    fontSize: 12,
    textAlign: 'center',
    boxSizing: 'border-box',
  };
}

export default UsersPage;
