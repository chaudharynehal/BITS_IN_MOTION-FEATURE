import {
  Activity,
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Dumbbell,
  Eye,
  Flame,
  Layers,
  Lock,
  ScanLine,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';
import PublicInfoNav from '../components/PublicInfoNav';

export default function FeaturesScreen({ onNavigate, onStartCoach, appActive, hasProfile }) {
  return (
    <main className="screen-page features-page">
      <ScreenHeader
        eyebrow="Platform Capabilities"
        title="Real AI coaching for real student spaces"
        description="BITS in Motion combines on-device computer vision, explainable recommendations, and strict privacy architecture. Everything here is implemented and running today."
        action={
          <div className="screen-heading-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => appActive && hasProfile ? onStartCoach('squats', 'features') : onNavigate('preview')}
            >
              <Camera size={18} /> Try Camera Coach
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => onNavigate(appActive && hasProfile ? 'dashboard' : 'welcome')}
            >
              {appActive && hasProfile ? 'Dashboard' : 'Home'}
            </button>
          </div>
        }
      />

      <PublicInfoNav current="features" onNavigate={onNavigate} />

      <div className="features-grid">
        {/* 1. Camera Coach */}
        <article className="feature-card feature-hero-card">
          <div className="feature-card-header">
            <div className="feature-icon-badge blue"><Camera size={24} /></div>
            <span className="status-pill">On-device MediaPipe Vision</span>
          </div>
          <div className="feature-card-body">
            <h2>Camera-Guided Movement Coaching</h2>
            <p>
              Real-time pose estimation evaluates 33 skeletal landmarks directly inside your browser. The system measures biomechanical joint angles, counts verified repetitions, and delivers actionable coaching cues without sending a single frame to the cloud.
            </p>
            <div className="feature-metrics-row">
              <div className="feature-metric">
                <strong>4</strong>
                <span>Exercise coaches (Squats, Push-ups, Crunches, Jumping Jacks)</span>
              </div>
              <div className="feature-metric">
                <strong>33</strong>
                <span>MediaPipe landmarks tracked in real-time</span>
              </div>
              <div className="feature-metric">
                <strong>0%</strong>
                <span>Video upload or server streaming</span>
              </div>
            </div>
            <div className="feature-sublist">
              <div><CheckCircle2 size={16} className="text-teal" /><span><strong>Angle-based state machines:</strong> Knee flexion (squats), elbow depth (push-ups), torso curl (crunches), and stance width (jumping jacks).</span></div>
              <div><CheckCircle2 size={16} className="text-teal" /><span><strong>Form guidance & cues:</strong> Immediate feedback on depth, full extension, and camera framing visibility.</span></div>
              <div><CheckCircle2 size={16} className="text-teal" /><span><strong>Hardware acceleration:</strong> WebGL GPU pipeline with automatic, seamless fallback to CPU WASM when GPU access is unavailable.</span></div>
            </div>
          </div>
          <div className="feature-card-footer">
            <button
              className="button button-primary"
              type="button"
              onClick={() => appActive && hasProfile ? onStartCoach('squats', 'features') : onNavigate('preview')}
            >
              <ScanLine size={16} /> Launch squat coach <ChevronRight size={16} />
            </button>
          </div>
        </article>

        {/* 2. Explainable Recommendation Engine */}
        <article className="feature-card">
          <div className="feature-card-header">
            <div className="feature-icon-badge teal"><Sparkles size={24} /></div>
            <span className="feature-badge-light">Explainable AI</span>
          </div>
          <div className="feature-card-body">
            <h3>Personalized Workout Engine</h3>
            <p>
              Rule-based, transparent workout plans tailored specifically to student constraints. No mysterious black-box algorithms: you see exactly why every movement was selected.
            </p>
            <ul className="feature-bullets">
              <li><strong>Fitness Goals:</strong> Stay fit, Build strength, or Support weight management.</li>
              <li><strong>Experience Levels:</strong> Beginner and Intermediate pacing with different work/recovery intervals.</li>
              <li><strong>Time Windows:</strong> 10, 20, 30, 45, or 60 minutes including warm-up and recovery.</li>
              <li><strong>Real Environments:</strong> Small hostel/PG/home spaces or open indoor, campus, outdoor and gym spaces.</li>
              <li><strong>Equipment Matching:</strong> Bodyweight or Backpack. Backpack rows require intermediate experience.</li>
              <li><strong>Impact Preference:</strong> Low-impact selection excludes jumping and moderate-impact movements; it is not medical guidance.</li>
            </ul>
          </div>
        </article>

        {/* 3. Workout Library */}
        <article className="feature-card">
          <div className="feature-card-header">
            <div className="feature-icon-badge violet"><Dumbbell size={24} /></div>
            <span className="feature-badge-light">Hostel-Ready</span>
          </div>
          <div className="feature-card-body">
            <h3>Minimal-Equipment Movement Library</h3>
            <p>
              Curated exercises engineered for compact hostel and PG spaces where room is limited and heavy gear is absent.
            </p>
            <ul className="feature-bullets">
              <li><strong>Lower Body:</strong> Bodyweight squats (camera-guided), reverse lunges.</li>
              <li><strong>Upper Body:</strong> Incline / knee push-ups (camera-guided), backpack rows with textbook weight.</li>
              <li><strong>Core & Torso:</strong> Controlled crunches (camera-guided), supported planks.</li>
              <li><strong>Cardio & Recovery:</strong> Jumping jacks (camera-guided), low-impact marching, mobility warm-ups, and breathing cool-downs.</li>
              <li><strong>Muscle Activation:</strong> Every exercise identifies primary and secondary target muscle groups.</li>
            </ul>
          </div>
          <div className="feature-card-footer">
            <button
              className="button button-secondary button-small"
              type="button"
              onClick={() => onNavigate('workouts')}
            >
              Browse workout library <ChevronRight size={15} />
            </button>
          </div>
        </article>

        {/* 4. Dual Persistence & Data Isolation */}
        <article className="feature-card">
          <div className="feature-card-header">
            <div className="feature-icon-badge amber"><ShieldCheck size={24} /></div>
            <span className="feature-badge-light">Data Architecture</span>
          </div>
          <div className="feature-card-body">
            <h3>Guest Mode & Google Account Sync</h3>
            <p>
              Choose how you want to use the app with guaranteed data isolation and privacy protection.
            </p>
            <div className="feature-comparison-grid">
              <div className="comparison-col">
                <strong>Guest Mode (Local Only)</strong>
                <p>Instant start without creating an account. Profiles, workouts, and plans stay 100% inside your browser’s localStorage. Guest fitness records are not synced to an account.</p>
              </div>
              <div className="comparison-col">
                <strong>Google Account Mode (Cloud Sync)</strong>
                <p>Secure Google Identity Services authentication with server-verified JWTs. Persists to a managed Neon PostgreSQL database with strict per-user row isolation.</p>
              </div>
            </div>
            <p className="feature-note">
              Guest data and signed-in account data remain strictly separate: guest workouts are never leaked or uploaded into Google accounts.
            </p>
          </div>
        </article>

        {/* 5. Progress, Calorie Estimation & History */}
        <article className="feature-card">
          <div className="feature-card-header">
            <div className="feature-icon-badge blue"><BarChart3 size={24} /></div>
            <span className="feature-badge-light">Progress Tracking</span>
          </div>
          <div className="feature-card-body">
            <h3>Session Logs & Consistency Metrics</h3>
            <p>
              Turn movement into quantifiable momentum without unhealthy obsession over body weight or vanity metrics.
            </p>
            <ul className="feature-bullets">
              <li><strong>Energy Estimation:</strong> Evidence-based MET (Metabolic Equivalent of Task) formula combined with user body weight and camera-session duration.</li>
              <li><strong>Form Quality Summaries:</strong> Logs reps completed, camera interruptions, and posture cues triggered.</li>
              <li><strong>Consistency Calendar:</strong> 7-day rolling activity indicators celebrate sticking to your routine.</li>
              <li><strong>Session History:</strong> Chronological record of completed workouts, reps, and estimated calories.</li>
            </ul>
          </div>
        </article>

        {/* 6. Opt-In Campus Leaderboard */}
        <article className="feature-card">
          <div className="feature-card-header">
            <div className="feature-icon-badge teal"><Trophy size={24} /></div>
            <span className="feature-badge-light">Community</span>
          </div>
          <div className="feature-card-body">
            <h3>Privacy-First Campus Leaderboard</h3>
            <p>
              Healthy competition focused on consistency, workouts completed, and verified reps—never body measurements or photos.
            </p>
            <ul className="feature-bullets">
              <li><strong>Strictly Opt-In:</strong> You must explicitly choose to participate; default is private.</li>
              <li><strong>Custom Privacy Alias:</strong> Choose a public alias instead of your real name. Google email is never displayed.</li>
              <li><strong>Weekly & All-Time Rankings:</strong> Community totals show collective campus fitness momentum.</li>
            </ul>
          </div>
          <div className="feature-card-footer">
            <button
              className="button button-secondary button-small"
              type="button"
              onClick={() => onNavigate('leaderboard')}
            >
              View leaderboard preview <ChevronRight size={15} />
            </button>
          </div>
        </article>
      </div>

      {/* Bottom Conversion Banner */}
      <section className="features-cta-banner panel-dark">
        <div>
          <span className="eyebrow light">Get Started in Seconds</span>
          <h2>Experience camera coaching in your browser</h2>
          <p>No account required to try. Test live rep tracking right now with bodyweight squats.</p>
        </div>
        <div className="features-cta-actions">
          <button
            className="button button-primary button-large"
            type="button"
            onClick={() => appActive && hasProfile ? onStartCoach('squats', 'features') : onNavigate('preview')}
          >
            <Camera size={19} /> Start Camera Coach
          </button>
          <button
            className="button button-on-dark button-large"
            type="button"
            onClick={() => onNavigate('how-it-works')}
          >
            See how it works <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}
