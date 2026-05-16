import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lightTheme } from '../theme/theme';
import { saveAuth } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';

function AuthPage() {
  const theme = lightTheme;
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    resetToken: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleModeChange = (mode) => {
    setAuthMode(mode);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      resetToken: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    resetMessages();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errorMessage || successMessage) {
      resetMessages();
    }
  };

  const handleFormKeyDown = (event) => {
    if (event.key !== 'Enter' || isSubmitting) {
      return;
    }

    event.preventDefault();
    event.currentTarget.requestSubmit();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    resetMessages();

    if (authMode === 'forgot') {
      setIsSubmitting(true);

      try {
        if (!formData.resetToken) {
          if (!formData.email) {
            setErrorMessage('Completa los campos obligatorios.');
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            setErrorMessage(data.error || 'No se pudo generar el token.');
            return;
          }

          if (data.resetToken) {
            setFormData((prev) => ({
              ...prev,
              resetToken: data.resetToken,
            }));
            setSuccessMessage('Token generado para desarrollo local.');
            return;
          }

          setSuccessMessage(data.message || 'Si el correo existe, se enviarán instrucciones.');
          return;
        }

        if (!formData.resetToken || !formData.newPassword || !formData.confirmNewPassword) {
          setErrorMessage('Completa los campos obligatorios.');
          return;
        }

        if (formData.newPassword.length < 8) {
          setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
          return;
        }

        if (formData.newPassword !== formData.confirmNewPassword) {
          setErrorMessage('Las contraseñas no coinciden.');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: formData.resetToken,
            newPassword: formData.newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.error || 'No se pudo restablecer la contraseña.');
          return;
        }

        setAuthMode('login');
        setFormData({
          name: '',
          email: formData.email,
          password: '',
          confirmPassword: '',
          resetToken: '',
          newPassword: '',
          confirmNewPassword: '',
        });
        setSuccessMessage('Contraseña restablecida. Inicia sesión.');
        return;
      } catch (error) {
        console.error(error);
        setErrorMessage('No se pudo conectar con el servidor.');
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    if (!formData.email || !formData.password || (authMode === 'register' && !formData.name)) {
      setErrorMessage('Completa los campos obligatorios.');
      return;
    }

    if (authMode === 'register' && formData.password !== formData.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (authMode === 'login') {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.error || 'No se pudo iniciar sesión.');
          return;
        }

        saveAuth(data.token, data.user);
        navigate('/dashboard');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'No se pudo crear la cuenta.');
        return;
      }

      setAuthMode('login');
      setFormData({
        name: '',
        email: formData.email,
        password: '',
        confirmPassword: '',
        resetToken: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setSuccessMessage('Cuenta creada. Inicia sesión.');
    } catch (error) {
      console.error(error);
      setErrorMessage('No se pudo conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFields = () => {
    if (authMode === 'register') {
      return (
        <>
          <FormField placeholder="Nombre" name="name" type="text" value={formData.name} onChange={handleChange} />
          <FormField placeholder="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
          <FormField placeholder="Contraseña" name="password" type="password" value={formData.password} onChange={handleChange} />
          <FormField placeholder="Confirmar contraseña" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} />
        </>
      );
    }

    if (authMode === 'forgot') {
      return (
        <>
          <FormField placeholder="Email" name="email" type="email" value={formData.email} onChange={handleChange} />

          {formData.resetToken && (
            <>
              <FormField
                placeholder="Token"
                name="resetToken"
                type="text"
                value={formData.resetToken}
                onChange={handleChange}
                readOnly
              />
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: `1px solid ${theme.border}`,
                  background: theme.surfaceMuted,
                  color: theme.textBody,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  wordBreak: 'break-all',
                }}
              >
                {formData.resetToken}
              </div>
              <FormField
                placeholder="Nueva contraseña"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
              />
              <FormField
                placeholder="Confirmar nueva contraseña"
                name="confirmNewPassword"
                type="password"
                value={formData.confirmNewPassword}
                onChange={handleChange}
              />
            </>
          )}
        </>
      );
    }

    return (
      <>
        <FormField placeholder="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
        <FormField placeholder="Contraseña" name="password" type="password" value={formData.password} onChange={handleChange} />
      </>
    );
  };

  const titleByMode = {
    login: 'Inicia sesión',
    register: 'Crear cuenta',
    forgot: 'Recuperar contraseña',
  };

  const buttonByMode = {
    login: 'Iniciar sesión',
    register: 'Crear cuenta',
    forgot: 'Enviar instrucciones',
  };

  const submitLabel = authMode === 'forgot' && formData.resetToken
    ? 'Restablecer contraseña'
    : buttonByMode[authMode];

  return (
    <div
      className="auth-page"
      style={{
        minHeight: '100vh',
        background: theme.background,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        className="auth-card"
        style={{
          width: 'min(300px, calc(100% - 70px))',
          boxSizing: 'border-box',
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 24,
          boxShadow: theme.shadow,
          padding: 32,
        }}
      >
        <div 
        style={{marginBottom: 24, display: 'flex', justifyContent: 'center'}}>
          <h1 style={{ margin: 0, color: theme.textPrimary, fontSize: 28, fontWeight: 700 }}>
            Expenses Report
          </h1>
        </div>

        <h2 style={{ marginTop: 0, marginBottom: 20, color: theme.textSecondary, fontSize: 20, fontWeight: 600 }}>
          {titleByMode[authMode]}
        </h2>

        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} style={{ display: 'grid', gap: 14 }}>
          {renderFields()}

          {errorMessage && (
            <p style={{ margin: 0, color: '#b91c1c', fontWeight: 'bold' }}>
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p style={{ margin: 0, color: theme.textPrimary, fontWeight: 'bold' }}>
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            style={{
              marginTop: 8,
              padding: '5px 16px',
              borderRadius: 12,
              border: 'none',
              background: theme.sidebarBackground,
              color: theme.sidebarText,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Procesando...' : submitLabel}
          </button>
        </form>

        <div style={{ display: 'grid', gap: 20, marginTop: 5, justifyItems: 'center' }}>
          {authMode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => handleModeChange('forgot')}
                style={getTextButtonStyle(theme)}
              >
                ¿Olvidaste tu contraseña?
              </button>
              <div style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 12 }}>
                <span>¿No tienes cuenta? </span>
                <button
                  type="button"
                  onClick={() => handleModeChange('register')}
                  style={getInlineTextButtonStyle(theme)}
                >
                  Crear cuenta
                </button>
              </div>
            </>
          )}

          {authMode === 'register' && (
            <div style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 12 }}>
              <span>¿Ya tienes cuenta? </span>
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                style={getInlineTextButtonStyle(theme)}
              >
                Inicia sesión
              </button>
            </div>
          )}

          {authMode === 'forgot' && (
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              style={getTextButtonStyle(theme)}
            >
              Volver a iniciar sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ placeholder, name, type, value, onChange, readOnly = false }) {
  const theme = lightTheme;

  return (
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '5px 10px',
        borderRadius: 10,
        border: `1px solid ${theme.inputBorder}`,
        background: theme.inputBackground,
        color: theme.inputText,
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  );
}

function getTextButtonStyle(theme) {
  return {
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: theme.textPrimary,
    textAlign: 'center',
    font: 'inherit',
    fontSize: 12,
    cursor: 'pointer',
  };
}

function getInlineTextButtonStyle(theme) {
  return {
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: theme.textPrimary,
    font: 'inherit',
    fontSize: 12,
    cursor: 'pointer',
  };
}

export default AuthPage;
