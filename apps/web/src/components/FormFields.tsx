import { useState } from "react";

type FieldProps = {
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  invalid?: boolean;
  helper?: string;
};

export function Field({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  invalid = false,
  helper,
}: FieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const shellClass = invalid ? "input-shell input-shell--error" : "input-shell";

  return (
    <label className="field-group">
      <span className="field-label">{label}</span>
      <span className={shellClass}>
        <input
          className="input-control"
          type={isPassword && visible ? "text" : type}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        {isPassword && (
          <button
            type="button"
            className="eye-icon"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((current) => !current)}
          />
        )}
      </span>
      {helper && <span className="field-helper success">{helper}</span>}
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
        <span className="alert-icon" aria-hidden="true" />
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
