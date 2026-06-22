import { forwardRef } from 'react';
import './ClearableInput.css';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Called when the user clicks the clear (×) button. */
  onClear: () => void;
  /** Extra class for the wrapper span (e.g. to carry flex layout). */
  wrapperClassName?: string;
};

/**
 * A text input with a × button on the right that clears the whole value.
 * The × only appears while the field has content. Spreads all native input
 * props through, so it can replace a plain <input> in place.
 */
const ClearableInput = forwardRef<HTMLInputElement, Props>(function ClearableInput(
  { onClear, wrapperClassName, value, ...rest },
  ref
) {
  const hasValue = value != null && String(value).length > 0;
  return (
    <span className={`clearable-input ${wrapperClassName ?? ''}`}>
      <input ref={ref} value={value} {...rest} />
      {hasValue && (
        <button
          type="button"
          className="clearable-x"
          title="Eingabe löschen"
          aria-label="Eingabe löschen"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
        >
          ×
        </button>
      )}
    </span>
  );
});

export default ClearableInput;
