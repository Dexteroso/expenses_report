import { colors, radius, shadows, spacing, typography } from '../tokens';

const variantStyles = {
  primary: {
    background: colors.brand.cyan,
    borderColor: colors.brand.cyan,
    color: colors.text.inverse,
    boxShadow: shadows.button,
  },
  secondary: {
    background: colors.background.surface,
    borderColor: colors.border.subtle,
    color: colors.brand.cyan,
    boxShadow: 'none',
  },
  ghost: {
    background: 'transparent',
    borderColor: 'transparent',
    color: colors.text.primary,
    boxShadow: 'none',
  },
  danger: {
    background: colors.status.danger,
    borderColor: colors.status.danger,
    color: colors.text.inverse,
    boxShadow: 'none',
  },
  icon: {
    background: colors.background.surfaceMuted,
    borderColor: colors.border.subtle,
    color: colors.text.primary,
    boxShadow: 'none',
  },
};

function Button({
  children,
  className = '',
  disabled = false,
  icon,
  isLoading = false,
  style,
  type = 'button',
  variant = 'primary',
  ...props
}) {
  const resolvedVariant = variantStyles[variant] || variantStyles.primary;
  const isIconOnly = variant === 'icon' && !children;

  return (
    <button
      className={`ds-button ds-button--${variant} ${className}`.trim()}
      disabled={disabled || isLoading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        minWidth: isIconOnly ? '48px' : 'auto',
        minHeight: '48px',
        padding: isIconOnly ? spacing.none : `0 ${spacing.lg}`,
        border: `1px solid ${resolvedVariant.borderColor}`,
        borderRadius: radius.button,
        background: disabled || isLoading ? colors.background.surfaceMuted : resolvedVariant.background,
        boxShadow: disabled || isLoading ? 'none' : resolvedVariant.boxShadow,
        color: disabled || isLoading ? colors.text.disabled : resolvedVariant.color,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        fontFamily: typography.fontFamily,
        fontSize: typography.ui.fontSize,
        fontWeight: 800,
        lineHeight: 1,
        pointerEvents: disabled || isLoading ? 'none' : undefined,
        transition: 'background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
        ...style,
      }}
      type={type}
      {...props}
    >
      {isLoading ? 'Cargando...' : (
        <>
          {icon && <span aria-hidden="true">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

export default Button;
