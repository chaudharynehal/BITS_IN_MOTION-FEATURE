import { ArrowRight, Camera, ChartNoAxesCombined, ShieldCheck, Sparkles, Trophy, UserRound } from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import UserMenu from '../components/UserMenu';

export default function WelcomeScreen({ auth, onGoogleCredential, onSignOut, onContinueGuest, onStart, onJudgeDemo, onProgress, onLeaderboard }) {
  const authenticationBusy = ['checking', 'signing-in', 'signing-out'].includes(auth.status);
  return (
    <main className="welcome-screen">
      <section className="welcome-hero">
        <div className="welcome-identity">
          <img className="welcome-logo" src="/logo.png" alt="BITS in Motion logo" />
          <div><span className="eyebrow light">Smart India Hackathon 2026</span><strong>BITS in Motion</strong></div>
        </div>
        <div className="welcome-account"><UserMenu user={auth.user} onSignOut={onSignOut} /></div>

        <div className="welcome-grid">
          <div className="welcome-copy">
            <span className="status-pill dark"><Camera size={16} /> Camera-guided movement</span>
            <h1>Your hostel-friendly fitness companion</h1>
            <p>Get a practical plan for your space, then use your camera for real-time counting and basic observable pose feedback across four exercises.</p>
            <div className="welcome-actions">
              <button className="button button-primary button-large" onClick={onStart}>Start my workout <ArrowRight size={19} /></button>
              {!auth.user && <button className="button button-on-dark" onClick={onJudgeDemo}><Sparkles size={18} /> Try judge demo</button>}
              <button className="button button-on-dark" onClick={onLeaderboard}><Trophy size={18} /> Leaderboard</button>
            </div>
            {!auth.user && (
              <div className="welcome-signin">
                <div><strong>Choose how to continue</strong><small>Google syncs your private account across devices. Guest data stays only in this browser.</small></div>
                <div className="account-entry-actions">
                  <GoogleSignInButton onCredential={onGoogleCredential} disabled={!auth.accountSyncAvailable || authenticationBusy} />
                  <button className="guest-continue-button" type="button" onClick={onContinueGuest} disabled={auth.status === 'signing-in'}><UserRound size={17} /> Continue as Guest</button>
                </div>
                {auth.status === 'checking' && <small className="setup-note">Checking for a returning account…</small>}
                {!auth.accountSyncAvailable && auth.status !== 'checking' && <small className="setup-note">Guest mode is fully available. Cloud account sync activates after deployment credentials are configured.</small>}
                {auth.error && <small className="auth-error">{auth.error}</small>}
              </div>
            )}
          </div>

          <div className="flow-preview" aria-label="How BITS in Motion works">
            <div className="flow-card flow-card-main">
              <span className="eyebrow light">Today’s loop</span>
              <strong>Plan. Move. Improve.</strong>
              <div className="flow-line"><span className="active">1</span><i /><span>2</span><i /><span>3</span></div>
              <div className="flow-labels"><small>Profile</small><small>Coach</small><small>Progress</small></div>
            </div>
            <div className="flow-card flow-card-stat"><ChartNoAxesCombined size={22} /><div><strong>3 day</strong><small>active streak</small></div></div>
          </div>
        </div>

        <div className="privacy-banner"><ShieldCheck size={20} /><span><strong>Your movement stays yours.</strong> Camera frames are processed locally in your browser and are not recorded.</span></div>
      </section>

      <section className="welcome-details">
        <div><span>01</span><h2>Built for real student spaces</h2><p>Short sessions, minimal equipment and no need for a dedicated gym floor.</p></div>
        <div><span>02</span><h2>Explainable recommendations</h2><p>Clear rules use your level, goal, time, location and equipment—not a black box.</p></div>
        <div><span>03</span><h2>Four live movement coaches</h2><p>MediaPipe landmarks power complete-cycle counting for squats, push-ups, crunches and jumping jacks.</p></div>
      </section>

      <button className="progress-shortcut" onClick={onProgress}><ChartNoAxesCombined size={18} /> View progress</button>
    </main>
  );
}
