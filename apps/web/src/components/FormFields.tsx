import { useId, useState } from "react";

type FieldProps = {
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  inputMode?: "decimal" | "numeric";
  prefix?: string;
  invalid?: boolean;
  helper?: string;
};

export function Field({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  inputMode,
  prefix,
  invalid = false,
  helper,
}: FieldProps) {
  const [visible, setVisible] = useState(false);
  const helperId = useId();
  const isPassword = type === "password";
  const shellClass = invalid ? "input-shell input-shell--error" : "input-shell";

  return (
    <label className="field-group">
      <span className="field-label">{label}</span>
      <span className={shellClass}>
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          className="input-control"
          type={isPassword && visible ? "text" : type}
          inputMode={inputMode}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          aria-describedby={helper ? helperId : undefined}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        {isPassword && (
          <button
            type="button"
            className="eye-icon"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            <img src="/assets/figma/eye.svg" alt="" aria-hidden="true" />
          </button>
        )}
      </span>
      {helper && (
        <span id={helperId} className="field-helper success">
          {helper}
        </span>
      )}
    </label>
  );
}

export function FormMessage({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  if (error) {
    return (
      <p className="field-helper error" role="alert">
        <img className="alert-icon" src="/assets/figma/alert.svg" alt="" aria-hidden="true" />
        {error}
      </p>
    );
  }
  if (notice) {
    return (
      <p className="field-helper success" role="status">
        {notice}
      </p>
    );
  }
  return null;
}
