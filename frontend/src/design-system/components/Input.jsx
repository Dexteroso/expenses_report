import { colors, radius, shadows, spacing, typography } from '../tokens';

function Input({
  className = '',
  disabled = false,
  error,
  helperText,
  label,
  style,
  ...props
}) {
  const borderColor = error ? colors.status.error : colors.border.subtle;

  return (
    <label
      className={`ds-input-field ${className}`.trim()}
      style={{
        display: 'grid',
        gap: spacing.xs,
        color: colors.text.body,
        fontFamily: typography.fontFamily,
        fontSize: typography.caption.fontSize,
        fontWeight: 700,
        minWidth: 0,
      }}
    >
      {label && <span>{label}</span>}
      <input
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: '30px',
          padding: `0 ${spacing.md}`,
          border: `1px solid ${disabled ? colors.border.subtle : borderColor}`,
          borderRadius: radius.input,
          outline: 'none',
          background: colors.background.surface,
          boxSizing: 'border-box',
          color: disabled ? colors.text.disabled : colors.text.body,
          fontFamily: typography.fontFamily,
          fontSize: typography.body.fontSize,
          lineHeight: 1.3,
          boxShadow: error ? shadows.focus : 'none',
          ...style,
        }}
        {...props}
      />
      {(error || helperText) && (
        <span
          style={{
            color: error ? colors.status.error : colors.text.muted,
            fontSize: typography.caption.fontSize,
            fontWeight: 650,
            lineHeight: 1.35,
          }}
        >
          {error || helperText}
        </span>
      )}
    </label>
  );
}

export default Input;
