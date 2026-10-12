type WelcomePageProps = {
  onGetStarted?: () => void;
  onSignIn?: () => void;
};

export function WelcomePage({
  onGetStarted = () => undefined,
  onSignIn = () => undefined,
}: WelcomePageProps) {
  return (
    <main className="welcome-screen">
      <header className="brand-header" aria-label="PolyProvision">
        <span className="brand-text">Poly</span>
        <span className="brand-accent">Provision</span>
      </header>

      <section className="hero-visual" aria-label="Campus illustration">
        <img
          className="campus-illustration"
          src="/assets/campus-illustration.jpg"
          alt="Illustration of a campus with winding paths, dining spots, and gardens"
        />
      </section>

      <section className="welcome-content">
        <div className="welcome-copy">
          <h1>Eat smarter with your Dining Dollars.</h1>
          <p>Find campus meals that fit your budget and nutrition goals.</p>
        </div>

        <div className="welcome-actions">
          <button className="primary-action" type="button" onClick={onGetStarted}>
            Get started
          </button>
          <p className="sign-in-prompt">
            Already have an account?{" "}
            <button className="sign-in-action" type="button" onClick={onSignIn}>
              Sign in
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
