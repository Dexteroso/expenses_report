const LOCAL_FRONTEND_URL = 'http://localhost:5173';
const RESEND_API_URL = 'https://api.resend.com/emails';
const EMAIL_SEND_TIMEOUT_MS = 10000;

const getFrontendUrl = () => (process.env.FRONTEND_URL || LOCAL_FRONTEND_URL).replace(/\/$/, '');

const buildPasswordResetUrl = (token) => {
  const resetUrl = new URL('/auth', getFrontendUrl());
  resetUrl.searchParams.set('mode', 'forgot');
  resetUrl.searchParams.set('token', token);

  return resetUrl.toString();
};

const hasEmailConfig = () => Boolean(
  process.env.RESEND_API_KEY
  && process.env.EMAIL_FROM
);

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildPasswordResetText = ({ name, resetUrl, resetToken, expiresInMinutes }) => (
  `Hola${name ? ` ${name}` : ''},

Recibimos una solicitud para restablecer tu contraseña de Expenses Report.

Abre este enlace para continuar:
${resetUrl}

También puedes copiar este token en el formulario de recuperación:
${resetToken}

Este token expira en ${expiresInMinutes} minutos.

Si no solicitaste este cambio, ignora este correo.`
);

const buildPasswordResetHtml = ({ name, resetUrl, resetToken, expiresInMinutes }) => (
  `<p>Hola${name ? ` ${escapeHtml(name)}` : ''},</p>
<p>Recibimos una solicitud para restablecer tu contraseña de Expenses Report.</p>
<p><a href="${escapeHtml(resetUrl)}">Restablecer contraseña</a></p>
<p>También puedes copiar este token en el formulario de recuperación:</p>
<p><code>${escapeHtml(resetToken)}</code></p>
<p>Este token expira en ${expiresInMinutes} minutos.</p>
<p>Si no solicitaste este cambio, ignora este correo.</p>`
);

const sendPasswordResetEmail = async ({ to, name, resetToken, resetUrl, expiresInMinutes }) => {
  if (!hasEmailConfig()) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('Password reset email skipped because Resend is not configured.');
      console.info(`Password reset URL: ${resetUrl}`);
      console.info(`Password reset token: ${resetToken}`);
      return { skipped: true };
    }

    throw new Error('Resend email configuration is missing');
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Restablece tu contraseña',
      text: buildPasswordResetText({ name, resetUrl, resetToken, expiresInMinutes }),
      html: buildPasswordResetHtml({ name, resetUrl, resetToken, expiresInMinutes }),
    }),
    signal: AbortSignal.timeout(EMAIL_SEND_TIMEOUT_MS),
  });

  if (!response.ok) {
    let responseBody = {};

    try {
      responseBody = await response.json();
    } catch (error) {
      responseBody = { message: 'Resend returned a non-JSON error response' };
    }

    throw new Error(
      `Resend email send failed with status ${response.status}: ${responseBody.message || responseBody.name || 'Unknown error'}`
    );
  }

  return { sent: true };
};

module.exports = {
  buildPasswordResetUrl,
  sendPasswordResetEmail,
};
