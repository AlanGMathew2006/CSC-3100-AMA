export function Toast({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="toast-message" role="status" aria-live="polite">
      <img src="/assets/figma/check-circle.svg" alt="" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
