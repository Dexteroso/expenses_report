import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';

function AppCard({ children, className = '', style, ...props }) {
  return (
    <section
      className={`app-card ${className}`.trim()}
      style={{
        '--auth-card-bg': colors.white,
        '--auth-card-radius': radius.card,
        '--auth-card-mobile-radius': radius.cardMobile,
        '--auth-card-shadow': shadows.authCard,
        ...style,
      }}
      {...props}
    >
      {children}
    </section>
  );
}

export default AppCard;
