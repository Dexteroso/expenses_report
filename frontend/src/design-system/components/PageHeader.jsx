import { colors, spacing, typography } from '../tokens';

function PageHeader({
  actions,
  eyebrow,
  subtitle,
  title,
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'end',
        justifyContent: 'space-between',
        gap: spacing.lg,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'grid', gap: spacing.xs, minWidth: 0 }}>
        {eyebrow && (
          <span
            style={{
              color: colors.brand.cyan,
              fontSize: typography.caption.fontSize,
              fontWeight: 800,
              lineHeight: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </span>
        )}
        <h1 style={{ ...typography.pageTitle, margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ ...typography.caption, margin: 0 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </header>
  );
}

export default PageHeader;
