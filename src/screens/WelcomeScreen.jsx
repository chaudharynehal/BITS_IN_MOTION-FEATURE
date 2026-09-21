import { useRef } from 'react';
import {
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  Dumbbell,
  Lightbulb,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
} from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import UserMenu from '../components/UserMenu';

function ProductVisual() {
  return (
    <div className="product-visual" aria-label="Preview of camera coaching and progress features">
      <span className="product-preview-label">Illustrative feature preview</span>
      <article className="visual-camera">
        <div className="visual-card-top"><span><i /> Live workout</span><strong>Squats</strong></div>
        <svg viewBox="0 0 340 310" role="img" aria-label="Illustration of pose landmarks during a squat">
          <defs><linearGradient id="pose-line" x1="0" x2="1"><stop stopColor="#20e1be" /><stop offset="1" stopColor="#5ba2ff" /></linearGradient></defs>
          <circle className="body-fill" cx="170" cy="56" r="28" />
          <path className="body-fill" d="M140 88Q170 75 200 88L211 171Q170 188 129 171Z" />
          <path className="body-limb" d="M143 101L102 150L57 178M197 101L238 150L283 178M147 171L109 227L73 282M193 171L231 227L267 282" />
          <path className="pose-line" d="M170 82L170 167M170 103L102 150L57 178M170 103L238 150L283 178M170 167L109 227L73 282M170 167L231 227L267 282" />
          {[ [170,82], [170,103], [102,150], [57,178], [238,150], [283,178], [170,167], [109,227], [73,282], [231,227], [267,282] ].map(([x, y]) => <circle className="pose-node" cx={x} cy={y} r="6" key={x + '-' + y} />)}
        </svg>
        <div className="visual-reps"><span>Reps</span><strong>12 <small>/ 15</small></strong><div><i /></div><em><CheckCircle2 size={15} /> Good form</em></div>
      </article>

      <article className="visual-plan">
        <span className="eyebrow light">Today’s loop</span>
        <h3>Plan. Move.<br />Improve.</h3>
        <div className="visual-steps"><span className="active">1<small>Profile</small></span><i /><span>2<small>Plan</small></span><i /><span>3<small>Move</small></span><i /><span>4<small>Review</small></span></div>
      </article>

      <article className="visual-progress">
        <div><span className="eyebrow light">Weekly progress</span><BarChart3 size={20} /></div>
        <div className="visual-bars">{[36, 54, 82, 62, 72, 49, 30].map((height, index) => <i style={{ height }} key={height + '-' + index} />)}</div>
        <div className="visual-days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
      </article>

      <article className="visual-tip"><Lightbulb size={20} /><div><strong>Coach tip</strong><span>Keep your back long and knees tracking comfortably.</span></div></article>
    </div>
  );
}

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
  const featuresRef = useRef(null);
  const howItWorksRef = useRef(null);
  const authenticationBusy = ['checking', 'signing-in', 'signing-out'].includes(auth.status);
  const hasActiveAccount = ['signed-in', 'guest', 'demo'].includes(auth.status);

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function openCameraGuided() {
    const opened = onCameraGuided?.();
    if (!opened) scrollTo(authRef);
  }

  return (
    <main className="welcome-screen-v2">
      <section className="welcome-hero-v2">
        <header className="marketing-nav">
          <button className="marketing-brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
            <img src="/logo.png" alt="" />
            <span><small>Smart India Hackathon 2026</small>BITS in Motion</span>
          </button>
          <nav aria-label="Homepage">
            <button onClick={() => scrollTo(featuresRef)}>Features</button>
            <button onClick={() => scrollTo(howItWorksRef)}>How it works</button>
            <button onClick={onLeaderboard}>Leaderboard</button>
            {hasActiveAccount && <button onClick={onProgress}>Progress</button>}
          </nav>
          <UserMenu
            user={auth.user}
            status={auth.status}
            displayName={displayName}
            onNavigate={onNavigate}
            onSignOut={onSignOut}
            onExitGuest={onExitGuest}
            dark
          />
        </header>

        <div className="marketing-hero-grid">
          <div className="marketing-copy">
            <button className="status-pill dark camera-guided-cta" type="button" onClick={openCameraGuided}><Camera size={16} /> Camera-guided movement</button>
            <h1>Your hostel-friendly fitness <em>companion</em></h1>
            <p>Build a practical plan for your space, then use privacy-first camera coaching for rep counting and observable pose feedback.</p>
            <div className="marketing-actions">
              <button className="button button-primary button-large" onClick={hasActiveAccount ? onContinue : () => scrollTo(authRef)}>
                {hasActiveAccount ? hasProfile ? 'Continue as ' + (displayName || 'Guest') : 'Continue fitness setup' : 'Set up my fitness journey'} <ArrowRight size={19} />
              </button>
              <button className="button button-on-dark button-large" onClick={() => scrollTo(featuresRef)}><Sparkles size={18} /> Explore features</button>
            </div>

            <div className="auth-choice-card" ref={authRef}>
              {hasActiveAccount ? (
                <div className="returning-state">
                  <div className="returning-avatar"><UserRound size={22} /></div>
                  <div><span>{auth.status === 'signed-in' ? 'Synced account' : auth.status === 'demo' ? 'Judge demo' : 'Guest account'}</span><strong>Ready when you are, {displayName || 'Guest'}.</strong></div>
                  <button className="button button-white" onClick={onContinue}>{hasProfile ? 'Open dashboard' : 'Continue setup'} <ArrowRight size={17} /></button>
                </div>
              ) : (
                <>
                  <div className="auth-choice-actions">
                    <GoogleSignInButton onCredential={onGoogleCredential} disabled={!auth.accountSyncAvailable || authenticationBusy} />
                    <span className="auth-or">or</span>
                    <button className="guest-continue-button" type="button" onClick={onContinueGuest} disabled={['signing-in', 'signing-out'].includes(auth.status)}><UserRound size={17} /> Continue as Guest</button>
                  </div>
                  <div className="auth-choice-copy"><strong>Choose how to continue</strong><small>Google securely syncs your private profile and history. Guest progress stays only in this browser.</small></div>
                  {auth.status === 'checking' && <small className="setup-note">Checking for a returning account…</small>}
                  {!auth.accountSyncAvailable && auth.status !== 'checking' && <small className="setup-note">Guest mode is available even while cloud sign-in is unavailable.</small>}
                  {auth.error && <small className="auth-error">{auth.error}</small>}
                </>
              )}
            </div>
          </div>

          <ProductVisual />
        </div>

        <div className="marketing-privacy"><ShieldCheck size={18} /><span><strong>Your movement stays yours.</strong> Camera frames are processed locally in your browser and are not recorded.</span></div>
      </section>

      <section className="student-benefits" ref={featuresRef}>
        <div className="section-intro"><span /><div><small>Simple to start. Real progress.</small><h2>Why it works for students</h2><p>Your profile shapes the plan; the camera guides supported movements; your saved sessions make progress visible.</p></div><span /></div>
        <div className="benefit-grid">
          <article><div className="benefit-icon blue"><Dumbbell size={25} /></div><h3>Built for real student spaces</h3><p>Short sessions, minimal equipment and practical movements for hostel, home, campus or PG rooms.</p></article>
          <article><div className="benefit-icon teal"><Sparkles size={25} /></div><h3>Explainable recommendations</h3><p>Clear rules use your goal, time, experience, location and equipment—not a mysterious black box.</p></article>
          <article><div className="benefit-icon violet"><ScanLine size={25} /></div><h3>Four live movement coaches</h3><p>MediaPipe landmarks support squats, push-ups, crunches and jumping jacks with rep counting and cues.</p></article>
        </div>
      </section>

      <section className="how-it-works" ref={howItWorksRef}>
        <div>
          <span className="eyebrow">From profile to progress</span>
          <h2>A fitness loop that keeps you in control</h2>
        </div>
        <ol>
          <li><i>01</i><strong>Tell us what fits</strong><span>Add your goal, space, time and equipment.</span></li>
          <li><i>02</i><strong>Get a realistic plan</strong><span>Review it, start now or explore the app first.</span></li>
          <li><i>03</i><strong>Move with guidance</strong><span>Use live coaching only when you choose.</span></li>
          <li><i>04</i><strong>See your momentum</strong><span>Real saved sessions power your progress.</span></li>
        </ol>
        {!hasActiveAccount && <button className="judge-demo-link" onClick={onJudgeDemo} disabled={authenticationBusy}><Zap size={16} /> Preview the isolated judge demo</button>}
      </section>
    </main>
  );
}
