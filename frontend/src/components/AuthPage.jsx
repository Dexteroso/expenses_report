import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import { saveAuth } from '../utils/auth';
import authIllustration from '../assets/Authentication-2-25.png';
import emailIllustration from '../assets/Email-1.png';
import passwordIllustration from '../assets/Password-1.png';
import registerIllustration from '../assets/Register-1.png';
import AuthLayout from './ui/AuthLayout';
import PrimaryButton from './ui/PrimaryButton';
import TextInput from './ui/TextInput';

const illustrationByMode = {
  login: authIllustration,
  register: registerIllustration,
  forgot: passwordIllustration,
  forgotSent: emailIllustration,
  reset: passwordIllustration,
  resetSuccess: emailIllustration,
};

function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [devResetToken, setDevResetToken] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const resetToken = searchParams.get('token') || searchParams.get('resetToken');
    const requestedMode = searchParams.get('mode');

    if (resetToken) {
      setAuthMode('reset');
      setFormData((prev) => ({
        ...prev,
        resetToken,
      }));
      return;
    }

    if (requestedMode === 'forgot') {
      setAuthMode('forgot');
    }
  }, [searchParams]);

  const resetMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const resetPasswordState = () => {
    setDevResetToken('');
    setDevResetUrl('');
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
    resetPasswordState();
    resetMessages();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      const nextFormData = {
        ...prev,
        [name]: value,
      };

      if (authMode === 'forgot' && name === 'email') {
        return {
          ...nextFormData,
          resetToken: '',
          newPassword: '',
          confirmNewPassword: '',
        };
      }

      return nextFormData;
    });

    if (
      (authMode === 'forgot' && name === 'email' && devResetToken)
      || (name === 'resetToken' && devResetToken && value !== devResetToken)
    ) {
      setDevResetToken('');
      setDevResetUrl('');
    }

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

  const requestPasswordResetEmail = async () => {
    resetMessages();
    setIsSubmitting(true);
    resetPasswordState();

    try {
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
        setErrorMessage(data.error || 'No se pudo enviar la solicitud.');
        return;
      }

      if (data.resetToken) {
        setFormData((prev) => ({
          ...prev,
          resetToken: data.resetToken,
        }));
        setDevResetToken(data.resetToken);
        setDevResetUrl(data.resetUrl || '');
      }

      setAuthMode('forgotSent');
    } catch (error) {
      console.error(error);
      setErrorMessage('No se pudo conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    resetMessages();

    if (authMode === 'forgot') {
      await requestPasswordResetEmail();
      return;
    }

    if (authMode === 'reset') {
      setIsSubmitting(true);

      try {
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

        setAuthMode('resetSuccess');
        setFormData({
          name: '',
          email: formData.email,
          password: '',
          confirmPassword: '',
          resetToken: '',
          newPassword: '',
          confirmNewPassword: '',
        });
        resetPasswordState();
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

  const handleForgotResend = () => {
    requestPasswordResetEmail();
  };

  const handleDevContinueToReset = () => {
    setAuthMode('reset');
    resetMessages();
  };

  const handleBackToLogin = () => {
    handleModeChange('login');
  };

  const renderFields = () => {
    if (authMode === 'register') {
      return (
        <>
          <TextInput placeholder="Nombre" name="name" type="text" value={formData.name} onChange={handleChange} />
          <TextInput placeholder="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
          <TextInput placeholder="Contraseña" name="password" type="password" value={formData.password} onChange={handleChange} />
          <TextInput placeholder="Confirmar contraseña" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} />
        </>
      );
    }

    if (authMode === 'forgot') {
      return (
        <>
          <p className="auth-helper-text">
            Ingresa el correo asociado a tu cuenta para recibir un enlace de recuperación.
          </p>
          <TextInput
            placeholder="Correo electrónico"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
        </>
      );
    }

    if (authMode === 'reset') {
      return (
        <>
          <TextInput
            placeholder="Nueva contraseña"
            name="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={handleChange}
          />
          <TextInput
            placeholder="Confirmar nueva contraseña"
            name="confirmNewPassword"
            type="password"
            value={formData.confirmNewPassword}
            onChange={handleChange}
          />
        </>
      );
    }

    return (
      <>
        <TextInput placeholder="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
        <TextInput placeholder="Contraseña" name="password" type="password" value={formData.password} onChange={handleChange} />
      </>
    );
  };

  const titleByMode = {
    login: 'Inicia sesión',
    register: 'Crear cuenta',
    forgot: 'Recupera tu acceso',
    forgotSent: 'Revisa tu correo',
    reset: 'Nueva contraseña',
    resetSuccess: 'Contraseña actualizada',
  };

  const subtitleByMode = {
    login: 'Administra tus finanzas en un solo lugar',
    register: 'Administra tus finanzas en un solo lugar',
    forgot: 'Te enviaremos un enlace seguro para restablecer tu contraseña',
    forgotSent: 'Te enviamos un enlace seguro para continuar',
    reset: 'Crea una contraseña segura para proteger tu cuenta',
    resetSuccess: 'Ya puedes iniciar sesión con tu nueva contraseña',
  };

  const buttonByMode = {
    login: 'Iniciar sesión',
    register: 'Crear cuenta',
    forgot: 'Solicitar cambio de contraseña',
    reset: 'Guardar nueva contraseña',
  };

  const submitLabel = buttonByMode[authMode];
  const isResetRequestSubmitting = authMode === 'forgot' && isSubmitting;

  const renderAuthContent = () => {
    if (authMode === 'forgotSent') {
      return (
        <div className="auth-reset-content">
          <p className="auth-helper-text">
            Te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y correo no deseado.
          </p>

          {import.meta.env.DEV && devResetToken && (
            <DevResetPanel
              token={devResetToken}
              resetUrl={devResetUrl}
              onContinue={handleDevContinueToReset}
            />
          )}

          <PrimaryButton
            type="button"
            onClick={handleForgotResend}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="auth-loading-content">
                <span className="auth-spinner" aria-hidden="true" />
                Enviando correo...
              </span>
            ) : (
              'Reenviar correo'
            )}
          </PrimaryButton>
        </div>
      );
    }

    if (authMode === 'resetSuccess') {
      return (
        <div className="auth-reset-content">
          <p className="auth-helper-text">
            Tu contraseña fue actualizada correctamente.
          </p>
          <PrimaryButton
            type="button"
            onClick={handleBackToLogin}
          >
            Ir al inicio de sesión
          </PrimaryButton>
        </div>
      );
    }

    return (
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        className="auth-form"
      >
        {renderFields()}

        {errorMessage && (
          <p className="auth-message auth-message-error">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="auth-message auth-message-success">
            {successMessage}
          </p>
        )}

        {authMode === 'reset' && import.meta.env.DEV && formData.resetToken && (
          <details className="auth-dev-details">
            <summary>
              Modo desarrollo
            </summary>
            <div>
              Token: <span>{formData.resetToken}</span>
            </div>
          </details>
        )}

        <PrimaryButton
          type="submit"
          disabled={isSubmitting}
        >
          {isResetRequestSubmitting ? (
            <span className="auth-loading-content">
              <span className="auth-spinner" aria-hidden="true" />
              Enviando correo...
            </span>
          ) : (
            isSubmitting ? 'Procesando...' : submitLabel
          )}
        </PrimaryButton>
      </form>
    );
  };

  return (
    <AuthLayout
      illustrationSrc={illustrationByMode[authMode] || authIllustration}
      title={titleByMode[authMode]}
      subtitle={subtitleByMode[authMode]}
    >
      {renderAuthContent()}

      <div className="auth-secondary-actions">
        {authMode === 'login' && (
          <>
            <button
              type="button"
              onClick={() => handleModeChange('forgot')}
              className="auth-link-button"
            >
              ¿Olvidaste tu contraseña?
            </button>
            <div className="auth-inline-prompt">
              <span>¿No tienes cuenta? </span>
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                className="auth-inline-button"
              >
                Crear cuenta
              </button>
            </div>
          </>
        )}

        {authMode === 'register' && (
          <div className="auth-inline-prompt">
            <span>¿Ya tienes cuenta? </span>
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className="auth-inline-button"
            >
              Inicia sesión
            </button>
          </div>
        )}

        {(authMode === 'forgot' || authMode === 'forgotSent' || authMode === 'reset') && (
          <button
            type="button"
            onClick={handleBackToLogin}
            className="auth-link-button"
          >
            Volver a iniciar sesión
          </button>
        )}
      </div>
    </AuthLayout>
  );
}

function DevResetPanel({ token, resetUrl, onContinue }) {
  return (
    <div className="auth-dev-panel">
      <div className="auth-dev-panel-header">
        <strong>Modo desarrollo</strong>
        <span>Para pruebas locales, puedes continuar usando el token generado.</span>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="auth-dev-button"
      >
        Continuar con token de desarrollo
      </button>

      <details>
        <summary>
          Ver token de desarrollo
        </summary>
        <div className="auth-dev-token">
          <div>
            Token: <span>{token}</span>
          </div>
          {resetUrl && (
            <div>
              Link: <span>{resetUrl}</span>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

export default AuthPage;
