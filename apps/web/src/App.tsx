import { useState } from "react";
import "./App.css";

type Screen = "welcome" | "login" | "signup" | "dashboard";

function App() {
  const [screen, setScreen] = useState<Screen>("welcome");

  if (screen === "welcome") {
    return (
      <WelcomeOnboardingScreen
        onGetStarted={() => setScreen("login")}
        onSignIn={() => setScreen("login")}
      />
    );
  }

  if (screen === "login") {
    return (
      <LoginScreen
        onCreateAccount={() => setScreen("signup")}
        onLogin={() => setScreen("dashboard")}
      />
    );
  }

  if (screen === "signup") {
    return (
      <SignupScreen
        onLogin={() => setScreen("login")}
        onCreateAccount={() => setScreen("dashboard")}
      />
    );
  }

  return <DashboardScreen onBackToLogin={() => setScreen("welcome")} />;
}

type WelcomeOnboardingProps = {
  onGetStarted?: () => void;
  onSignIn?: () => void;
};

function WelcomeOnboardingScreen({
  onGetStarted = () => undefined,
  onSignIn = () => undefined,
}: WelcomeOnboardingProps) {
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
          <p>
            Find campus meals that fit your budget and nutrition goals.
          </p>
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

function BrandHeader() {
  return (
    <div className="brand-header" aria-label="PolyProvision">
      <span className="brand-text">Poly</span>
      <span className="brand-accent">Provision</span>
      <span className="brand-underline" aria-hidden="true" />
    </div>
  );
}

type LoginScreenProps = {
  onCreateAccount: () => void;
  onLogin: () => void;
};

function LoginScreen({ onCreateAccount, onLogin }: LoginScreenProps) {
  return (
    <div className="page-shell">
      <BrandHeader />

      <section className="auth-content">
        <div className="intro-block">
          <h1>Welcome back</h1>
          <p>
            Log in to continue planning meals that fit your goals.
          </p>
        </div>

        <div className="form-stack">
          <div className="field-group">
            <label>Email</label>
            <div className="input-shell input-shell--active">
              student@calpoly.edu
            </div>
            <p className="field-helper success">Ready to continue with this email.</p>
          </div>

          <div className="field-group">
            <label>Password</label>
            <div className="input-shell input-shell--error">
              <span className="input-text">•••••••</span>
              <span className="eye-icon" aria-hidden="true" />
            </div>
            <p className="field-helper error">
              <span className="alert-icon" aria-hidden="true" />
              Incorrect password. Try again or reset it.
            </p>
          </div>

          <button type="button" className="link-button link-button--right">
            Forgot password?
          </button>
        </div>

        <div className="auth-actions">
          <button type="button" className="primary-button" onClick={onLogin}>
            Log in
          </button>

          <div className="divider-row" aria-label="Continue with Google">
            <span>or</span>
          </div>

          <button type="button" className="secondary-button">
            <span className="google-mark">G</span>
            Continue with Google
          </button>
        </div>

        <p className="signup-copy">
          New to PolyProvision? <button type="button" className="link-button" onClick={onCreateAccount}>Create an account</button>
        </p>
      </section>
    </div>
  );
}

type SignupScreenProps = {
  onLogin: () => void;
  onCreateAccount: () => void;
};

function SignupScreen({ onLogin, onCreateAccount }: SignupScreenProps) {
  return (
    <div className="page-shell">
      <BrandHeader />

      <section className="auth-content auth-content--signup">
        <div className="intro-block">
          <h1>Create your account</h1>
          <p>Start making the most of your Dining Dollars.</p>
        </div>

        <div className="form-stack form-stack--signup">
          <div className="field-group">
            <label>Name</label>
            <div className="input-shell">Taylor Mustang</div>
          </div>

          <div className="field-group">
            <label>Email</label>
            <div className="input-shell input-shell--active">taylor@calpoly.edu</div>
            <p className="field-helper success">Use your Cal Poly email address.</p>
          </div>

          <div className="field-group">
            <label>Password</label>
            <div className="input-shell">
              <span className="input-text">•••••••</span>
              <span className="eye-icon" aria-hidden="true" />
            </div>
            <p className="field-helper success">Use 8 or more characters.</p>
          </div>

          <div className="field-group">
            <label>Confirm password</label>
            <div className="input-shell input-shell--error">
              <span className="input-text">•••••••</span>
              <span className="eye-icon" aria-hidden="true" />
            </div>
            <p className="field-helper error">
              <span className="alert-icon" aria-hidden="true" />
              Passwords don't match. Try again.
            </p>
          </div>
        </div>

        <p className="terms-text">
          By creating an account, you agree to our <button type="button" className="link-button">Terms of use</button> and acknowledge our <button type="button" className="link-button">Privacy policy</button>.
        </p>

        <div className="auth-actions auth-actions--signup">
          <button type="button" className="primary-button" onClick={onCreateAccount}>
            Create account
          </button>
        </div>

        <p className="signup-copy">
          Already have an account? <button type="button" className="link-button" onClick={onLogin}>Log in</button>
        </p>
      </section>
    </div>
  );
}

type DashboardScreenProps = {
  onBackToLogin: () => void;
};

function DashboardScreen({ onBackToLogin }: DashboardScreenProps) {
  return (
    <div className="page-shell page-shell--dashboard">
      <BrandHeader />

      <section className="dashboard-shell">
        <header className="user-header">
          <div className="profile-pill">
            <div className="avatar" aria-label="profile avatar" />
            <div className="profile-copy">
              <span className="profile-greeting">Good afternoon</span>
              <strong>John Doe</strong>
            </div>
          </div>
          <button type="button" className="alert-button" aria-label="Notifications">
            <svg
              className="bell-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
              <circle className="bell-notification" cx="19" cy="5" r="3" />
            </svg>
          </button>
        </header>

        <div className="toggle-pill" aria-label="Daily or weekly view">
          <button type="button" className="toggle-option toggle-option--active">Daily</button>
          <button type="button" className="toggle-option">Weekly</button>
        </div>

        <div className="section-header">Today's Nutrition</div>

        <div className="nutrition-card">
          <div className="nutrition-chart" aria-label="Nutrition summary">
            <div className="chart-center">
              <strong>1,250</strong>
              <span>Calories Remaining</span>
              <small>1,750 / 3,000 kcal</small>
            </div>
          </div>

          <div className="legend-list">
            <div className="legend-item">
              <span className="legend-dot legend-dot--protein" />
              Protein
            </div>
            <div className="legend-item">
              <span className="legend-dot legend-dot--carbs" />
              Carbs
            </div>
            <div className="legend-item">
              <span className="legend-dot legend-dot--fat" />
              Fat
            </div>
            <div className="legend-item">
              <span className="legend-dot legend-dot--fiber" />
              Fiber
            </div>
          </div>
        </div>

        <div className="section-header">Nutrient Summary</div>

        <div className="summary-row">
          <div className="summary-box">
            <div className="summary-title"><span className="legend-dot legend-dot--protein" /> Protein</div>
            <div className="summary-value">65 / 120g</div>
          </div>
          <div className="summary-box">
            <div className="summary-title"><span className="legend-dot legend-dot--carbs" /> Carbs</div>
            <div className="summary-value">180 / 250g</div>
          </div>
          <div className="summary-box">
            <div className="summary-title"><span className="legend-dot legend-dot--fat" /> Fat</div>
            <div className="summary-value">42 / 70g</div>
          </div>
          <div className="summary-box">
            <div className="summary-title"><span className="legend-dot legend-dot--fiber" /> Fiber</div>
            <div className="summary-value">18 / 30g</div>
          </div>
        </div>

        <div className="dollars-card">
          <div className="dollars-header">
            <span className="dollar-value">$142.00</span>
            <span className="remaining-label">remaining</span>
          </div>
          <div className="dollars-meta">
            <span>$8.00 of $12.00</span>
            <span className="tag">spent today</span>
          </div>
          <div className="progress-track">
            <span className="progress-bar" />
          </div>
          <div className="budget-copy">Spent this week: $84.20</div>
          <div className="budget-copy">Recommended weekly budget: $95.00</div>
          <div className="budget-copy budget-copy--bold">You’re $10.80 under your weekly budget.</div>
        </div>

        <div className="recommend-card">
          <h2>What should I eat next?</h2>
          <div className="meal-row">
            <div>
              <span className="meal-label">Vista Grande</span>
              <h3>Chicken Teriyaki Bowl</h3>
              <div className="meal-meta">
                <span>520 kcal</span>
                <span>38g protein</span>
                <span>62g carbs</span>
                <span>14g fat</span>
              </div>
            </div>
            <button type="button" className="mini-tag">High protein</button>
          </div>
          <div className="meal-actions">
            <button type="button" className="text-link">View Meal</button>
            <button type="button" className="action-button" onClick={onBackToLogin}>Add to Today</button>
          </div>
        </div>

        <div className="bottom-nav" aria-label="Main navigation">
          <button type="button" className="nav-item nav-item--active">Home</button>
          <button type="button" className="nav-item">Explore</button>
          <button type="button" className="nav-item">Saved</button>
          <button type="button" className="nav-item">Profile</button>
        </div>
      </section>
    </div>
  );
}

export default App;
