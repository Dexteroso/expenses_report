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

const buildPasswordResetText = ({ name, resetUrl, expiresInMinutes }) => (
  `Hola${name ? ` ${name}` : ''},

Recibimos una solicitud para restablecer tu contraseña.

Haz clic en el siguiente enlace para continuar:
${resetUrl}

Este enlace expirará en ${expiresInMinutes} minutos.

Si no solicitaste este cambio, ignora este correo.`
);

const buildPasswordResetHtml = ({ name, resetUrl, expiresInMinutes }) => (
  `<p>Hola${name ? ` ${escapeHtml(name)}` : ''},</p>
<p>Recibimos una solicitud para restablecer tu contraseña.</p>
<p>Haz clic en el siguiente botón para continuar:</p>
<p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:10px 16px;background:#3c568c;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">Restablecer contraseña</a></p>
<p>Este enlace expirará en ${expiresInMinutes} minutos.</p>
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
      subject: 'Restablece tu contraseña de Expenses Report',
      text: buildPasswordResetText({ name, resetUrl, expiresInMinutes }),
      html: buildPasswordResetHtml({ name, resetUrl, expiresInMinutes }),
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
