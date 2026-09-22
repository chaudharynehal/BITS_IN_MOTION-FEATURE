import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  FileText,
  Play,
  RotateCcw,
  ScanLine,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  Zap,
} from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import UserMenu from '../components/UserMenu';

const SQUAT_PHASES = [
  {
    key: 'standing', label: 'Standing', angle: 171, cue: 'Ready — lower with control', rep: 12,
    points: [[170, 48], [170, 76], [170, 98], [142, 94], [198, 94], [126, 137], [214, 137], [116, 176], [224, 176], [170, 166], [153, 164], [187, 164], [151, 222], [189, 222], [149, 281], [191, 281]],
  },
  {
    key: 'descending', label: 'Descending', angle: 132, cue: 'Control the descent', rep: 12,
    points: [[180, 58], [177, 85], [172, 108], [145, 104], [199, 108], [122, 139], [219, 143], [105, 169], [235, 173], [170, 183], [153, 181], [187, 184], [136, 226], [204, 228], [116, 281], [224, 281]],
  },
  {
    key: 'depth', label: 'Squat depth', angle: 91, cue: 'Good depth — drive back up', rep: 12,
    points: [[190, 76], [184, 102], [174, 124], [148, 118], [199, 126], [122, 141], [221, 148], [98, 157], [243, 164], [167, 207], [150, 203], [184, 210], [123, 224], [213, 229], [98, 280], [243, 280]],
  },
  {
    key: 'ascending', label: 'Ascending', angle: 133, cue: 'Stand tall to finish the rep', rep: 12,
    points: [[180, 58], [177, 85], [172, 108], [145, 104], [199, 108], [122, 139], [219, 143], [105, 169], [235, 173], [170, 183], [153, 181], [187, 184], [136, 226], [204, 228], [116, 281], [224, 281]],
  },
  {
    key: 'complete', label: 'Rep complete', angle: 171, cue: 'Rep complete — strong control', rep: 13,
    points: [[170, 48], [170, 76], [170, 98], [142, 94], [198, 94], [126, 137], [214, 137], [116, 176], [224, 176], [170, 166], [153, 164], [187, 164], [151, 222], [189, 222], [149, 281], [191, 281]],
  },
];

function CameraCoachPreview() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setPhaseIndex(2);
      return undefined;
    }
    const duration = phaseIndex === 0 || phaseIndex === 2 || phaseIndex === 4 ? 900 : 720;
    const timer = window.setTimeout(() => setPhaseIndex((current) => (current + 1) % SQUAT_PHASES.length), duration);
    return () => window.clearTimeout(timer);
  }, [phaseIndex, reducedMotion]);

  const phase = SQUAT_PHASES[phaseIndex];
  const p = phase.points;
  const limbPath = `M${p[3][0]} ${p[3][1]}L${p[5][0]} ${p[5][1]}L${p[7][0]} ${p[7][1]}M${p[4][0]} ${p[4][1]}L${p[6][0]} ${p[6][1]}L${p[8][0]} ${p[8][1]}M${p[10][0]} ${p[10][1]}L${p[12][0]} ${p[12][1]}L${p[14][0]} ${p[14][1]}M${p[11][0]} ${p[11][1]}L${p[13][0]} ${p[13][1]}L${p[15][0]} ${p[15][1]}`;
  const skeletonPath = `M${p[1][0]} ${p[1][1]}L${p[2][0]} ${p[2][1]}L${p[9][0]} ${p[9][1]}M${p[3][0]} ${p[3][1]}L${p[2][0]} ${p[2][1]}L${p[4][0]} ${p[4][1]}M${p[3][0]} ${p[3][1]}L${p[5][0]} ${p[5][1]}L${p[7][0]} ${p[7][1]}M${p[4][0]} ${p[4][1]}L${p[6][0]} ${p[6][1]}L${p[8][0]} ${p[8][1]}M${p[10][0]} ${p[10][1]}L${p[12][0]} ${p[12][1]}L${p[14][0]} ${p[14][1]}M${p[11][0]} ${p[11][1]}L${p[13][0]} ${p[13][1]}L${p[15][0]} ${p[15][1]}`;
  const torsoPath = `M${p[3][0]} ${p[3][1]}Q${p[2][0]} ${p[2][1] - 8} ${p[4][0]} ${p[4][1]}L${p[11][0]} ${p[11][1]}Q${p[9][0]} ${p[9][1] + 8} ${p[10][0]} ${p[10][1]}Z`;

  return (
    <div className="product-visual" aria-label="Animated illustration of Camera Coach tracking a complete squat">
      <span className="product-preview-label">Camera Coach · illustrative preview</span>

      <article className="visual-camera-card">
        {/* Top Camera Bar */}
        <div className="visual-card-top">
          <span className="camera-live-tag">
            <i className="camera-live-dot" /> On-Device Vision
          </span>
          <strong className="camera-exercise-tag">Squat coach • Knee angle</strong>
        </div>

        {/* Viewfinder with Pose Landmarks */}
        <div className="visual-viewfinder">
          <div className="viewfinder-scanline" aria-hidden="true" />
          <span className="viewfinder-bracket top-left" aria-hidden="true" />
          <span className="viewfinder-bracket top-right" aria-hidden="true" />
          <span className="viewfinder-bracket bottom-left" aria-hidden="true" />
          <span className="viewfinder-bracket bottom-right" aria-hidden="true" />

          <svg
            viewBox="0 0 340 310"
            className={`visual-pose-svg squat-phase-${phase.key}`}
            role="img"
            aria-label={`Squat animation: ${phase.label}, knee angle ${phase.angle} degrees`}
          >
            <defs>
              <linearGradient id="pose-line-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#20e1be" />
                <stop offset="100%" stopColor="#3d91ff" />
              </linearGradient>
              <linearGradient id="angle-arc-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffd765" />
                <stop offset="100%" stopColor="#ff9f43" />
              </linearGradient>
              <radialGradient id="athlete-head" cx="35%" cy="28%" r="75%">
                <stop offset="0%" stopColor="#2d5678" />
                <stop offset="100%" stopColor="#102940" />
              </radialGradient>
            </defs>

            {/* Stylized Body Geometry */}
            <circle className="pose-body-fill" cx={p[0][0]} cy={p[0][1]} r="25" />
            <path className="pose-body-torso" d={torsoPath} />
            <path className="pose-body-limbs" d={limbPath} />

            {/* MediaPipe Skeletal Landmark Connections */}
            <path
              className="pose-skeleton-line"
              d={skeletonPath}
            />

            {/* Knee Angle Biomechanical Measurement Indicator */}
            <path
              className="pose-angle-arc"
              d={`M${p[12][0] - 15} ${p[12][1] - 17} A 28 28 0 0 1 ${p[12][0] + 8} ${p[12][1] + 20}`}
            />
            <text x={p[12][0] - 7} y={p[12][1] + 3} className="pose-angle-label">{phase.angle}°</text>

            {/* 33 Key Joint Landmark Nodes */}
            {p.map(([x, y], index) => (
              <circle className="pose-node-circle" cx={x} cy={y} r={index === 0 ? 4 : 5.5} key={index} />
            ))}
          </svg>

          {/* Real-time Angle & Stage Badge */}
          <div className="viewfinder-hud-metric">
            <span>Measurement</span>
            <strong>{phase.angle}° <small>knee angle</small></strong>
          </div>
        </div>

        {/* Live HUD Feedback & Reps */}
        <div className="visual-hud-overlay">
          <div className="hud-feedback-pill">
            <CheckCircle2 size={16} className="text-teal" />
            <span>{phase.cue}</span>
          </div>

          <div className="hud-reps-card">
            <div>
              <span className="hud-label">Example reps</span>
              <strong>{phase.rep} <small>/ 15</small></strong>
            </div>
            <div className="hud-progress-bar">
              <i style={{ width: `${Math.round(phase.rep / 15 * 100)}%` }} />
            </div>
            <em>Stage: {phase.label}</em>
          </div>
        </div>

        {/* Pipeline Diagram Ribbon */}
        <div className="visual-pipeline-ribbon">
          <div className="pipeline-step">
            <Camera size={13} />
            <span>1. Local Camera</span>
          </div>
          <span className="pipeline-arrow">➔</span>
          <div className="pipeline-step">
            <ScanLine size={13} />
            <span>2. 33 Landmarks</span>
          </div>
          <span className="pipeline-arrow">➔</span>
          <div className="pipeline-step">
            <Activity size={13} />
            <span>3. Real-time Cues</span>
          </div>
        </div>
      </article>

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
  const [showAuthChooser, setShowAuthChooser] = useState(false);
  const authenticationBusy = ['checking', 'signing-in', 'signing-out'].includes(auth.status);
  const hasActiveAccount = ['signed-in', 'guest', 'demo'].includes(auth.status);
  const isAuthChooserVisible = showAuthChooser || Boolean(auth.error);

  function openAuthChooser() {
    setShowAuthChooser(true);
    setTimeout(() => {
      authRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }, 50);
  }

  function handleCameraClick() {
    // Preview is independent of Guest mode and never saves a workout.
    onCameraGuided?.();
  }

  return (
    <main className="welcome-screen-v2">
      <section className="welcome-hero-v2">
        <header className="marketing-nav">
          <button
            className="marketing-brand"
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
          >
            <img src="/logo.png" alt="" />
            <span><small>Smart India Hackathon 2026</small>BITS in Motion</span>
          </button>
          <nav aria-label="Homepage">
            <button type="button" onClick={() => onNavigate('features')}>Features</button>
            <button type="button" onClick={() => onNavigate('how-it-works')}>How it works</button>
            <button type="button" onClick={onLeaderboard}>Leaderboard</button>
            <button type="button" onClick={() => onNavigate('terms')}>Terms & Conditions</button>
            {hasActiveAccount && <button type="button" onClick={onProgress}>Progress</button>}
          </nav>
          {hasActiveAccount ? (
            <UserMenu
              user={auth.user}
              status={auth.status}
              displayName={displayName}
              onNavigate={onNavigate}
              onSignOut={onSignOut}
              onExitGuest={onExitGuest}
              dark
            />
          ) : (
            <div className="marketing-nav-actions">
              <button
                type="button"
                className="nav-signin-button"
                onClick={openAuthChooser}
              >
                Sign in
              </button>
            </div>
          )}
        </header>

        <div className="marketing-hero-grid">
          <div className="marketing-copy">
            <span className="status-pill dark">
              <Sparkles size={15} /> Built for Hostel & Student Spaces
            </span>
            <h1>Your hostel-friendly fitness <em>companion</em></h1>
            <p>
              Build a practical workout plan for limited student spaces, then use privacy-first camera coaching for real-time rep counting and observable pose feedback.
            </p>

            <div className="marketing-actions">
              <button
                className="button button-primary button-large"
                type="button"
                onClick={hasActiveAccount ? onContinue : openAuthChooser}
              >
                {hasActiveAccount ? 'Continue my journey' : 'Set up my fitness journey'} <ArrowRight size={19} />
              </button>
              <button
                className="button button-accent button-large camera-hero-btn"
                type="button"
                onClick={handleCameraClick}
              >
                <Camera size={19} /> Live Camera Coach
              </button>
              <button
                className="button button-on-dark button-large"
                type="button"
                onClick={() => onNavigate('features')}
              >
                <Sparkles size={18} /> Explore features
              </button>
              <button
                className="button button-quiet-dark"
                type="button"
                onClick={() => onNavigate('how-it-works')}
              >
                How it works <ChevronRight size={16} />
              </button>
            </div>

            {hasActiveAccount && (
              <div className="auth-choice-card" ref={authRef}>
                <div className="returning-state">
                  <div className="returning-avatar"><UserRound size={22} /></div>
                  <div>
                    <span>{auth.status === 'signed-in' ? 'Synced account' : auth.status === 'demo' ? 'Judge demo' : 'Guest account'}</span>
                    <strong>Ready when you are, {displayName || 'Guest'}.</strong>
                  </div>
                  <button className="button button-white" type="button" onClick={onContinue}>
                    {hasProfile ? 'Open dashboard' : 'Continue setup'} <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            )}

            {!hasActiveAccount && isAuthChooserVisible && (
              <div className="auth-choice-card auth-choice-expanded" ref={authRef}>
                <div className="auth-choice-header">
                  <strong>Choose how to continue</strong>
                  <span>Start your personalized routine or test locally without signing in.</span>
                </div>
                <div className="auth-choice-options-grid">
                  <div className="auth-option-card">
                    <div className="auth-option-badge">Cloud Sync</div>
                    <h4>Google Account</h4>
                    <p>Save your profile, plans and progress to your account.</p>
                    <div className="auth-option-action">
                      <GoogleSignInButton
                        onCredential={onGoogleCredential}
                        disabled={!auth.accountSyncAvailable || authenticationBusy}
                      />
                    </div>
                    {!auth.accountSyncAvailable && auth.status !== 'checking' && (
                      <small className="setup-note">Cloud sign-in is currently unavailable.</small>
                    )}
                  </div>

                  <div className="auth-option-card">
                    <div className="auth-option-badge guest">Private & Local</div>
                    <h4>Guest Mode</h4>
                    <p>Continue locally without signing in.</p>
                    <div className="auth-option-action">
                      <button
                        className="guest-continue-button"
                        type="button"
                        onClick={onContinueGuest}
                        disabled={['signing-in', 'signing-out'].includes(auth.status)}
                      >
                        <UserRound size={17} /> Continue as Guest
                      </button>
                    </div>
                    <small className="setup-note">Stored in local browser storage only.</small>
                  </div>
                </div>
                {auth.status === 'checking' && <small className="setup-note checking">Checking for a returning account…</small>}
                {auth.error && <small className="auth-error">{auth.error}</small>}
              </div>
            )}
          </div>

          <CameraCoachPreview onTryCoach={handleCameraClick} />
        </div>

        <div className="marketing-privacy">
          <ShieldCheck size={18} />
          <span><strong>Your movement stays yours.</strong> Camera frames are processed locally in your browser and are never recorded or uploaded.</span>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="student-benefits">
        <div className="section-intro">
          <span />
          <div>
            <small>Simple to start. Real progress.</small>
            <h2>Why it works for students</h2>
            <p>Your profile shapes the plan; the camera guides supported movements; your saved sessions make progress visible.</p>
          </div>
          <span />
        </div>
        <div className="benefit-grid">
          <article>
            <div className="benefit-icon blue"><Dumbbell size={25} /></div>
            <h3>Built for real student spaces</h3>
            <p>Short sessions, minimal equipment, and practical movements designed for hostel rooms, PGs, and apartments.</p>
          </article>
          <article>
            <div className="benefit-icon teal"><Sparkles size={25} /></div>
            <h3>Explainable recommendations</h3>
            <p>Transparent rules use your goal, available time, experience, location, and equipment—never a mysterious black box.</p>
          </article>
          <article>
            <div className="benefit-icon violet"><ScanLine size={25} /></div>
            <h3>Four live movement coaches</h3>
            <p>MediaPipe landmarks support squats, push-ups, crunches, and jumping jacks with automated rep counting and form cues.</p>
          </article>
        </div>
        <div className="section-footer-action">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => onNavigate('features')}
          >
            Explore all capabilities in detail <ArrowRight size={17} />
          </button>
        </div>
      </section>

      {/* How it Works Overview */}
      <section className="how-it-works">
        <div>
          <span className="eyebrow">From profile to progress</span>
          <h2>A fitness loop that keeps you in control</h2>
        </div>
        <ol>
          <li><i>01</i><strong>Tell us what fits</strong><span>Add your goal, space, time, and equipment.</span></li>
          <li><i>02</i><strong>Get a realistic plan</strong><span>Review it, start now, or explore the app first.</span></li>
          <li><i>03</i><strong>Move with guidance</strong><span>Use live camera coaching only when you choose.</span></li>
          <li><i>04</i><strong>See your momentum</strong><span>Real saved sessions power your progress.</span></li>
        </ol>
        <div className="how-it-works-actions">
          <button
            className="button button-on-dark"
            type="button"
            onClick={() => onNavigate('how-it-works')}
          >
            See full 7-step journey <ArrowRight size={16} />
          </button>
          {!hasActiveAccount && (
            <button className="judge-demo-link" type="button" onClick={onJudgeDemo} disabled={authenticationBusy}>
              <Zap size={16} /> Preview the isolated judge demo
            </button>
          )}
        </div>
      </section>

      {/* Dedicated Homepage Footer */}
      <footer className="welcome-footer">
        <div className="welcome-footer-inner">
          <div className="footer-brand">
            <div className="footer-brand-logo">
              <img src="/logo.png" alt="" />
              <div>
                <strong>BITS in Motion</strong>
                <span>Smart India Hackathon 2026 Prototype</span>
              </div>
            </div>
            <p className="footer-tagline">
              Student-focused AI fitness platform with on-device camera guidance, dorm-friendly workouts, and verifiable privacy.
            </p>
          </div>

          <div className="footer-nav-col">
            <strong>Platform</strong>
            <button type="button" onClick={() => onNavigate('features')}>Features</button>
            <button type="button" onClick={() => onNavigate('how-it-works')}>How it works</button>
            <button type="button" onClick={handleCameraClick}>Live Camera Coach</button>
            <button type="button" onClick={onLeaderboard}>Campus Leaderboard</button>
          </div>

          <div className="footer-nav-col">
            <strong>Trust & Safety</strong>
            <button type="button" onClick={() => onNavigate('terms')}>Terms & Conditions</button>
            <button type="button" onClick={() => onNavigate('privacy')}>Privacy Policy</button>
            <button type="button" onClick={() => onNavigate('health-disclaimer')}>Health Disclaimer</button>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="footer-privacy-badge">
            <ShieldCheck size={16} />
            <span>100% on-device vision processing • Zero video upload guarantee</span>
          </div>
          <small>© 2026 BITS in Motion • SIH 2026</small>
        </div>
      </footer>
    </main>
  );
}
