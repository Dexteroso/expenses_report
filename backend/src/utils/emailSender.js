const nodemailer = require('nodemailer');

const LOCAL_FRONTEND_URL = 'http://localhost:5173';

const getFrontendUrl = () => (process.env.FRONTEND_URL || LOCAL_FRONTEND_URL).replace(/\/$/, '');

const buildPasswordResetUrl = (token) => {
  const resetUrl = new URL('/auth', getFrontendUrl());
  resetUrl.searchParams.set('mode', 'forgot');
  resetUrl.searchParams.set('token', token);

  return resetUrl.toString();
};

const hasSmtpConfig = () => Boolean(
  process.env.SMTP_HOST
  && process.env.SMTP_PORT
  && process.env.SMTP_USER
  && process.env.SMTP_PASS
  && process.env.SMTP_FROM
);

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
  if (!hasSmtpConfig()) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('Password reset email skipped because SMTP is not configured.');
      console.info(`Password reset URL: ${resetUrl}`);
      console.info(`Password reset token: ${resetToken}`);
      return { skipped: true };
    }

    throw new Error('SMTP configuration is missing');
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Restablece tu contraseña',
    text: buildPasswordResetText({ name, resetUrl, resetToken, expiresInMinutes }),
    html: buildPasswordResetHtml({ name, resetUrl, resetToken, expiresInMinutes }),
  });

  return { sent: true };
};

module.exports = {
  buildPasswordResetUrl,
  sendPasswordResetEmail,
};
