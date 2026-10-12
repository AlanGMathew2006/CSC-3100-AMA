type GoogleButtonProps = {
  onClick: () => void;
  loading: boolean;
};

export function GoogleButton({ onClick, loading }: GoogleButtonProps) {
  return (
    <button
      type="button"
      className="secondary-button"
      onClick={onClick}
      disabled={loading}
    >
      <span className="google-mark" aria-hidden="true">
        G
      </span>
      {loading ? "Redirecting to Google…" : "Continue with Google"}
    </button>
  );
}
