import { useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  FileText,
  Lightbulb,
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

function CameraCoachPreview({ onTryCoach }) {
  return (
    <div className="product-visual" aria-label="Interactive preview of live Camera Coach and pose tracking">
      <span className="product-preview-label">Live Camera Coach Preview</span>

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
            className="visual-pose-svg"
            role="img"
            aria-label="Illustration of 33 MediaPipe pose landmarks tracking a squat"
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
            </defs>

            {/* Stylized Body Geometry */}
            <circle className="pose-body-fill" cx="170" cy="56" r="26" />
            <path className="pose-body-torso" d="M140 88Q170 75 200 88L210 170Q170 186 130 170Z" />
            <path className="pose-body-limbs" d="M143 101L104 148L60 176M197 101L236 148L280 176M147 170L112 224L76 278M193 170L228 224L264 278" />

            {/* MediaPipe Skeletal Landmark Connections */}
            <path
              className="pose-skeleton-line"
              d="M170 82L170 167M170 101L104 148L60 176M170 101L236 148L280 176M170 167L112 224L76 278M170 167L228 224L264 278"
            />

            {/* Knee Angle Biomechanical Measurement Indicator */}
            <path
              className="pose-angle-arc"
              d="M136 200 A 30 30 0 0 1 126 238"
            />
            <text x="135" y="222" className="pose-angle-label">88° (Depth OK)</text>

            {/* 33 Key Joint Landmark Nodes */}
            {[
              [170, 56], // nose/head
              [170, 82], // neck
              [170, 101], // sternum
              [143, 101], // left shoulder
              [197, 101], // right shoulder
              [104, 148], // left elbow
              [236, 148], // right elbow
              [60, 176],  // left wrist
              [280, 176], // right wrist
              [170, 167], // mid hip
              [147, 170], // left hip
              [193, 170], // right hip
              [112, 224], // left knee
              [228, 224], // right knee
              [76, 278],  // left ankle
              [264, 278], // right ankle
            ].map(([x, y]) => (
              <circle className="pose-node-circle" cx={x} cy={y} r="5.5" key={x + '-' + y} />
            ))}
          </svg>

          {/* Real-time Angle & Stage Badge */}
          <div className="viewfinder-hud-metric">
            <span>Measurement</span>
            <strong>88° <small>knee angle</small></strong>
          </div>
        </div>

        {/* Live HUD Feedback & Reps */}
        <div className="visual-hud-overlay">
          <div className="hud-feedback-pill">
            <CheckCircle2 size={16} className="text-teal" />
            <span>Good depth — press back up to complete rep</span>
          </div>

          <div className="hud-reps-card">
            <div>
              <span className="hud-label">Verified Reps</span>
              <strong>12 <small>/ 15</small></strong>
            </div>
            <div className="hud-progress-bar">
              <i style={{ width: '80%' }} />
            </div>
            <em>Stage: Ascending</em>
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

      {/* Companion Loop Highlight */}
      <article className="visual-plan-chip">
        <span className="eyebrow light">Daily loop</span>
        <strong>Plan ➔ Move ➔ Improve</strong>
      </article>

      {/* Floating Tip Badge */}
      <article className="visual-tip-chip">
        <Lightbulb size={16} />
        <div>
          <strong>Camera Privacy:</strong>
          <span>Frames never leave this device.</span>
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
  const authenticationBusy = ['checking', 'signing-in', 'signing-out'].includes(auth.status);
  const hasActiveAccount = ['signed-in', 'guest', 'demo'].includes(auth.status);

  function scrollToAuth() {
    authRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  function handleCameraClick() {
    // Calling onCameraGuided starts the guest / camera coach flow directly without requiring Google sign in.
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
            <button
              className="status-pill dark camera-guided-cta"
              type="button"
              onClick={handleCameraClick}
            >
              <Camera size={16} /> Camera-guided movement
            </button>
            <h1>Your hostel-friendly fitness <em>companion</em></h1>
            <p>
              Build a practical workout plan for limited student spaces, then use privacy-first camera coaching for real-time rep counting and observable pose feedback.
            </p>

            <div className="marketing-actions">
              <button
                className="button button-primary button-large"
                type="button"
                onClick={hasActiveAccount ? onContinue : scrollToAuth}
              >
                {hasActiveAccount ? (hasProfile ? 'Continue as ' + (displayName || 'Guest') : 'Continue fitness setup') : 'Set up my fitness journey'} <ArrowRight size={19} />
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

            <div className="auth-choice-card" ref={authRef}>
              {hasActiveAccount ? (
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
              ) : (
                <>
                  <div className="auth-choice-actions">
                    <GoogleSignInButton
                      onCredential={onGoogleCredential}
                      disabled={!auth.accountSyncAvailable || authenticationBusy}
                    />
                    <span className="auth-or">or</span>
                    <button
                      className="guest-continue-button"
                      type="button"
                      onClick={onContinueGuest}
                      disabled={['signing-in', 'signing-out'].includes(auth.status)}
                    >
                      <UserRound size={17} /> Continue as Guest
                    </button>
                  </div>
                  <div className="auth-choice-copy">
                    <strong>Choose how to continue</strong>
                    <small>Google securely syncs your private profile and history. Guest progress stays only in this browser.</small>
                  </div>
                  {auth.status === 'checking' && <small className="setup-note">Checking for a returning account…</small>}
                  {!auth.accountSyncAvailable && auth.status !== 'checking' && (
                    <small className="setup-note">Guest mode is available even while cloud sign-in is unavailable.</small>
                  )}
                  {auth.error && <small className="auth-error">{auth.error}</small>}
                </>
              )}
            </div>
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
            <button type="button" onClick={() => onNavigate('terms')}>Privacy Policy</button>
            <button type="button" onClick={() => onNavigate('terms')}>Health Disclaimer</button>
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
