import { colors, radius, shadows, spacing } from '../tokens';

const variantStyles = {
  default: {
    borderRadius: radius.card,
    boxShadow: shadows.card,
    padding: spacing.xl,
  },
  compact: {
    borderRadius: radius.table,
    boxShadow: shadows.table,
    padding: spacing.md,
  },
  metric: {
    borderRadius: radius.dashboardCard,
    boxShadow: shadows.card,
    padding: spacing.lg,
  },
};

function Card({ children, className = '', style, variant = 'default', ...props }) {
  const resolvedVariant = variantStyles[variant] || variantStyles.default;

  return (
    <section
      className={`ds-card ds-card--${variant} ${className}`.trim()}
      style={{
        minWidth: 0,
        border: `1px solid ${colors.border.subtle}`,
        background: colors.background.surface,
        boxSizing: 'border-box',
        color: colors.text.primary,
        ...resolvedVariant,
        ...style,
      }}
      {...props}
    >
      {children}
    </section>
  );
}

export default Card;
