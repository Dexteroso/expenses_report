import { colors, spacing, typography } from '../tokens';

function PageShell({ children, className = '', style, ...props }) {
  return (
    <main
      className={`ds-page-shell ${className}`.trim()}
      style={{
        minHeight: '100vh',
        width: '100%',
        background: colors.background.app,
        boxSizing: 'border-box',
        color: colors.text.primary,
        fontFamily: typography.fontFamily,
        padding: spacing.xl,
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          display: 'grid',
          gap: spacing.xl,
          width: '100%',
          maxWidth: '1380px',
          margin: '0 auto',
        }}
      >
        {children}
      </div>
    </main>
  );
}

export default PageShell;
