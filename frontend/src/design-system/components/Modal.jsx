import { colors, radius, shadows, spacing, typography, zIndex } from '../tokens';
import Button from './Button';

function Modal({
  children,
  isOpen,
  onClose,
  title,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: zIndex.modal,
        display: 'grid',
        placeItems: 'center',
        padding: spacing.lg,
        background: colors.background.overlay,
        boxSizing: 'border-box',
      }}
    >
      <section
        style={{
          width: 'min(100%, 420px)',
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.modal,
          background: colors.background.surface,
          boxShadow: shadows.modal,
          boxSizing: 'border-box',
          color: colors.text.primary,
          padding: spacing.xl,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'start',
            justifyContent: 'space-between',
            gap: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          {title && (
            <h2 style={{ ...typography.sectionTitle, margin: 0 }}>
              {title}
            </h2>
          )}
          <Button aria-label="Cerrar modal" onClick={onClose} variant="icon">
            x
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default Modal;
