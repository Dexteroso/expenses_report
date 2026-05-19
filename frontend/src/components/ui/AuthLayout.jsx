import AppCard from './AppCard';
import { colors } from '../../theme/colors';
import { gradients } from '../../theme/gradients';
import { typography } from '../../theme/typography';
import dexforgeIcon from '../../assets/brand/dexforge-icon-transparent.png';

function AuthLayout({
  children,
  illustrationSrc,
  title,
  subtitle,
}) {
  return (
    <main
      className="auth-layout"
      style={{
        '--auth-background': gradients.authBackground,
        '--auth-title-color': colors.authTitle,
        fontFamily: typography.fontFamily,
      }}
    >
      <AppCard className="auth-card">
        <div className="brand-logo auth-brand-logo" aria-label="DexForge">
          <img className="brand-logo-icon" src={dexforgeIcon} alt="" aria-hidden="true" />
          <span className="brand-logo-text">DexForge</span>
        </div>

        {illustrationSrc && (
          <img
            alt=""
            aria-hidden="true"
            className="auth-illustration"
            src={illustrationSrc}
          />
        )}

        <div className="auth-heading">
          <h1>{title}</h1>
          {subtitle && <h2>{subtitle}</h2>}
        </div>

        {children}
      </AppCard>
    </main>
  );
}

export default AuthLayout;
