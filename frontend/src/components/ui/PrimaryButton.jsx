import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';

function PrimaryButton({
  children,
  className = '',
  disabled = false,
  isLoading = false,
  style,
  type = 'button',
  ...props
}) {
  return (
    <button
      className={`primary-button ${className}`.trim()}
      disabled={disabled || isLoading}
      style={{
        '--auth-primary-bg': colors.authPrimary,
        '--auth-primary-hover-bg': colors.authPrimaryHover,
        '--auth-button-radius': radius.button,
        '--auth-button-shadow': shadows.authButton,
        ...style,
      }}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export default PrimaryButton;
