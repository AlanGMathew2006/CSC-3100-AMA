import { BrandHeader } from "../../components/BrandHeader";

type EmailConfirmedPageProps = {
  onContinue: () => void;
};

export function EmailConfirmedPage({ onContinue }: EmailConfirmedPageProps) {
  return (
    <div className="page-shell">
      <BrandHeader />

      <section className="auth-content">
        <div className="intro-block">
          <h1>Email confirmed</h1>
          <p>Your account is ready. Log in to get started.</p>
        </div>

        <div className="auth-actions">
          <button type="button" className="primary-button" onClick={onContinue}>
            Go to log in
          </button>
        </div>
      </section>
    </div>
  );
}
