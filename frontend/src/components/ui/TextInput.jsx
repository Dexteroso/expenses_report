import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';

function TextInput({ className = '', style, ...props }) {
  return (
    <input
      className={`text-input ${className}`.trim()}
      style={{
        '--auth-input-bg': colors.authInputBackground,
        '--auth-input-border': colors.authBorder,
        '--auth-input-radius': radius.input,
        ...style,
      }}
      {...props}
    />
  );
}

export default TextInput;
