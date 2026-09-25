import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  ChevronRight,
  Clock3,
  Dumbbell,
  Home,
  Menu,
  ScanLine,
  ShieldCheck,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import GoogleSignInButton from "../components/GoogleSignInButton";
import UserMenu from "../components/UserMenu";
import HomeCoachPreview from "../components/HomeCoachPreview";
import "../styles/homepage.css";

const scrollBehavior = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";

export default function WelcomeScreen({
  auth,
  displayName,
  hasProfile,
  onGoogleCredential,
  onSignOut,
  onExitGuest,
  onContinueGuest,
  onContinue,
  onCameraGuided,
  onJudgeDemo,
  onProgress,
  onLeaderboard,
  onNavigate,
}) {
  const authRef = useRef(null);
  const navRef = useRef(null);
  const menuButton = useRef(null);
  const authTrigger = useRef(null);
  const [showAuthChooser, setShowAuthChooser] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const authenticationBusy = ["checking", "signing-in", "signing-out"].includes(
    auth.status,
  );
  const hasActiveAccount = ["signed-in", "guest", "demo"].includes(auth.status);
  const isAuthChooserVisible =
    !hasActiveAccount && (showAuthChooser || Boolean(auth.error));

  useEffect(() => {
    if (!menuOpen) return undefined;
    const dismiss = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const outside = (event) => {
      if (
        !navRef.current?.querySelector("nav")?.contains(event.target) &&
        !menuButton.current?.contains(event.target)
      )
        setMenuOpen(false);
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", outside);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!isAuthChooserVisible) return undefined;
    const frame = window.requestAnimationFrame(() => {
      authRef.current?.focus({ preventScroll: true });
      authRef.current?.scrollIntoView({
        behavior: scrollBehavior(),
        block: "nearest",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isAuthChooserVisible]);

  function openAuthChooser(event) {
    authTrigger.current = event.currentTarget;
    setMenuOpen(false);
    setShowAuthChooser(true);
    if (isAuthChooserVisible) {
      authRef.current?.focus({ preventScroll: true });
      authRef.current?.scrollIntoView({
        behavior: scrollBehavior(),
        block: "nearest",
      });
    }
  }
  function go(action) {
    setMenuOpen(false);
    action?.();
  }

  return (
    <main className="welcome-screen-v2 home-page">
      <header className="marketing-nav home-header" ref={navRef}>
        <button
          className="home-brand"
          type="button"
          aria-label="BITS in Motion home"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: scrollBehavior() })
          }
        >
          <img src="/logo.svg" alt="" width="42" height="42" />
          <span>
            BITS <small>in Motion</small>
          </span>
        </button>
        <nav
          id="home-navigation"
          className={`home-navigation${menuOpen ? " is-open" : ""}`}
          aria-label="Homepage"
        >
          <button
            type="button"
            onClick={() => go(() => onNavigate("features"))}
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => go(() => onNavigate("how-it-works"))}
          >
            How it works
          </button>
          <button type="button" onClick={() => go(onLeaderboard)}>
            Leaderboard
          </button>
          {hasActiveAccount && (
            <button type="button" onClick={() => go(onProgress)}>
              Progress
            </button>
          )}
        </nav>
        <div className="home-header-actions">
          {hasActiveAccount ? (
            <UserMenu
              user={auth.user}
              status={auth.status}
              displayName={displayName}
              onNavigate={onNavigate}
              onSignOut={onSignOut}
              onExitGuest={onExitGuest}
            />
          ) : (
            <button
              className="nav-signin-button home-signin"
              type="button"
              aria-expanded={isAuthChooserVisible}
              aria-controls="home-auth-chooser"
              onClick={openAuthChooser}
            >
              Sign in <ArrowRight size={16} />
            </button>
          )}
          <button
            ref={menuButton}
            className="home-menu-toggle home-icon-button"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="home-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <div className="marketing-copy home-copy">
          <span className="home-kicker">
            <i className="home-kicker-dot" /> Built around student life
          </span>
          <h1 id="home-title">
            Fitness that fits
            <br />
            <span>student life.</span>
          </h1>
          <p>
            Practical workouts built around your time, space, equipment and
            goals. Turn on Camera Coach and it counts your reps and cues your
            form—right in your room.
          </p>
          <div className="home-actions">
            <button
              className="home-button home-button-primary"
              type="button"
              onClick={hasActiveAccount ? onContinue : openAuthChooser}
            >
              {hasActiveAccount
                ? "Continue my journey"
                : "Set up my fitness journey"}{" "}
              <ArrowRight size={18} />
            </button>
            <button
              className="home-button home-button-secondary"
              type="button"
              onClick={onCameraGuided}
            >
              <Camera size={18} /> Live Camera Coach
            </button>
          </div>
          <ul className="home-proof" aria-label="What you get">
            <li>
              <Clock3 size={16} /> 10–60 minute plans
            </li>
            <li>
              <Home size={16} /> PG room, hostel or home
            </li>
            <li>
              <ShieldCheck size={16} /> Camera stays on your device
            </li>
          </ul>
          <div className="home-discovery">
            <button type="button" onClick={() => onNavigate("features")}>
              Explore features <ChevronRight size={15} />
            </button>
            <button type="button" onClick={() => onNavigate("how-it-works")}>
              How it works <ChevronRight size={15} />
            </button>
          </div>
          {hasActiveAccount && (
            <div className="home-continuation">
              <span className="home-continuation-avatar">
                <UserRound size={20} />
              </span>
              <div>
                <strong>Welcome back, {displayName || "Guest"}.</strong>
                <span>
                  {hasProfile
                    ? "Your plan is ready when you are."
                    : "Your next step: finish your setup."}
                </span>
              </div>
              <button type="button" onClick={onContinue}>
                {hasProfile ? "Open dashboard" : "Continue setup"}{" "}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          {isAuthChooserVisible && (
            <section
              id="home-auth-chooser"
              className="auth-choice-card auth-choice-expanded home-auth"
              ref={authRef}
              tabIndex={-1}
              aria-labelledby="home-auth-title"
            >
              <div className="home-auth-heading">
                <div>
                  <h2 id="home-auth-title">Choose how to continue</h2>
                  <p>Your routine, your choice.</p>
                </div>
                {!auth.error && (
                  <button
                    className="home-icon-button"
                    type="button"
                    aria-label="Close sign-in options"
                    onClick={() => {
                      setShowAuthChooser(false);
                      authTrigger.current?.focus();
                    }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <div className="home-auth-options">
                <div>
                  <h3>Google Account</h3>
                  <p>Keep your plan and progress across devices.</p>
                  <GoogleSignInButton
                    onCredential={onGoogleCredential}
                    disabled={!auth.accountSyncAvailable || authenticationBusy}
                  />
                  {!auth.accountSyncAvailable && auth.status !== "checking" && (
                    <small>Cloud sign-in is currently unavailable.</small>
                  )}
                </div>
                <div>
                  <h3>Guest Mode</h3>
                  <p>Start without an account. Saved on this browser.</p>
                  <button
                    className="home-button home-button-secondary"
                    type="button"
                    onClick={onContinueGuest}
                    disabled={["signing-in", "signing-out"].includes(
                      auth.status,
                    )}
                  >
                    <UserRound size={17} /> Continue as Guest
                  </button>
                </div>
              </div>
              {auth.status === "checking" && (
                <p role="status">Checking for a returning account…</p>
              )}
              {auth.error && (
                <p className="auth-error" role="alert">
                  {auth.error}
                </p>
              )}
            </section>
          )}
        </div>
        <HomeCoachPreview onTryCoach={onCameraGuided} />
        <aside className="home-privacy">
          <span className="home-privacy-icon">
            <ShieldCheck size={25} />
          </span>
          <div>
            <h2>Your movement stays yours.</h2>
            <p>
              Camera frames are processed locally in your browser. Never
              recorded. Never uploaded.
            </p>
          </div>
          <button type="button" onClick={() => onNavigate("privacy")}>
            Our privacy promise <ArrowRight size={16} />
          </button>
        </aside>
      </section>

      <section className="home-fit" aria-labelledby="home-fit-title">
        <div className="home-section-heading">
          <div>
            <span className="home-kicker">Less friction. More movement.</span>
            <h2 id="home-fit-title">
              Made for the life
              <br />
              you actually live.
            </h2>
          </div>
          <p>
            Between lectures, deadlines and everything else, a little movement
            should fit in—not get in the way.
          </p>
        </div>
        <div className="home-fit-grid">
          <article className="home-fit-time">
            <Clock3 size={23} />
            <div className="home-time-graphic" aria-hidden="true">
              <strong>
                20 <small>min</small>
              </strong>
              <div>
                {[0, 1, 2, 3, 4].map((i) => (
                  <i key={i} />
                ))}
              </div>
              <span>A break worth taking</span>
            </div>
            <h3>A little time goes a long way.</h3>
            <p>
              Choose a 10–60 minute plan with warm-up, workout and cool-down
              built in.
            </p>
          </article>
          <article className="home-fit-space">
            <Dumbbell size={23} />
            <div className="home-space-graphic" aria-hidden="true">
              <svg viewBox="0 0 300 150">
                <path d="M42 92L158 30L270 84L155 144Z" fill="#d9e1ef" />
                <path d="M42 92V40L158 0V30Z" fill="#edf1f9" />
                <path d="M158 0L270 47V84L158 30Z" fill="#e8edf6" />
                <path d="M90 92L170 48L228 76L148 122Z" fill="#9bafd9" />
                <path
                  d="M105 92L170 57L213 77"
                  fill="none"
                  stroke="#c3cfe5"
                  strokeWidth="2"
                />
                <path
                  d="M222 55Q213 40 229 36Q247 33 251 50L257 69L228 79Z"
                  fill="#bda07c"
                />
                <path
                  d="M227 42Q229 24 241 38M232 56L249 51"
                  fill="none"
                  stroke="#806b51"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <h3>Your room is enough.</h3>
            <p>
              PG room, hostel or home. A plan that respects your space and the
              equipment you have.
            </p>
          </article>
          <article className="home-fit-coach">
            <ScanLine size={23} />
            <div className="home-cue-graphic" aria-hidden="true">
              <span>
                <i>✓</i> Rep complete
              </span>
              <strong>
                One rep.
                <br />
                More confidence.
              </strong>
            </div>
            <h3>Guidance when you want it.</h3>
            <p>
              Try four camera-supported movements, or move at your own pace with
              Self-Guided workouts.
            </p>
          </article>
        </div>
      </section>

      <section className="home-journey" aria-labelledby="home-journey-title">
        <div>
          <span className="home-kicker">Start where you are</span>
          <h2 id="home-journey-title">
            Your next good habit
            <br />
            starts with a plan.
          </h2>
          <button
            className="home-button home-button-secondary"
            type="button"
            onClick={() => onNavigate("how-it-works")}
          >
            See how it works <ArrowRight size={17} />
          </button>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>Make it yours</h3>
              <p>Your goal, your time, your space and equipment.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Find your rhythm</h3>
              <p>Follow your plan with camera or self-guided movements.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>See yourself move forward</h3>
              <p>Your saved sessions make your progress visible.</p>
            </div>
          </li>
        </ol>
      </section>

      <footer className="welcome-footer home-footer">
        <div className="home-footer-top">
          <div className="home-footer-brand">
            <strong>
              BITS <span>in Motion</span>
            </strong>
            <p>
              Small spaces. Real movement.
              <br />
              Built for student life.
            </p>
          </div>
          <nav aria-label="Explore">
            <h2>Explore</h2>
            <button type="button" onClick={() => onNavigate("features")}>
              Features
            </button>
            <button type="button" onClick={() => onNavigate("how-it-works")}>
              How it works
            </button>
            <button type="button" onClick={onCameraGuided}>
              Live Camera Coach
            </button>
            <button type="button" onClick={onLeaderboard}>
              Campus Leaderboard
            </button>
          </nav>
          <nav aria-label="Trust and safety">
            <h2>Your peace of mind</h2>
            <button type="button" onClick={() => onNavigate("privacy")}>
              Privacy Policy
            </button>
            <button type="button" onClick={() => onNavigate("terms")}>
              Terms & Conditions
            </button>
            <button
              type="button"
              onClick={() => onNavigate("health-disclaimer")}
            >
              Health Disclaimer
            </button>
            {!hasActiveAccount && (
              <button
                type="button"
                onClick={onJudgeDemo}
                disabled={authenticationBusy}
              >
                <Zap size={15} /> Preview the isolated judge demo
              </button>
            )}
          </nav>
        </div>
        <div className="home-footer-bottom">
          <small>© 2026 BITS in Motion · A student-built SIH project</small>
          <span>
            <ShieldCheck size={16} /> Your camera. Your device. Your choice.
          </span>
        </div>
      </footer>
    </main>
  );
}
