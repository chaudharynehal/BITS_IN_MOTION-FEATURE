import {
  Activity,
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Flame,
  LayoutDashboard,
  Play,
  RotateCcw,
  ScanLine,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';

const JOURNEY_STEPS = [
  {
    step: '01',
    title: 'Choose Guest or Google Account',
    badge: 'Step 1: Access',
    icon: UserRound,
    summary: 'Decide how you want to keep your data before you begin.',
    points: [
      'Guest Mode: Zero signup required. Progress is stored 100% locally in your browser.',
      'Google Account: Sign in with Google to securely sync workout history to our Neon PostgreSQL database across devices.',
      'Complete data isolation: Guest data never silently uploads or overwrites account data.',
    ],
  },
  {
    step: '02',
    title: 'Complete Profile & Space Preferences',
    badge: 'Step 2: Customization',
    icon: ClipboardCheck,
    summary: 'Input your fitness parameters and physical hostel/home constraints.',
    points: [
      'Physical metrics: Display name, age, height, and weight for accurate calorie calculations.',
      'Fitness parameters: Select your primary goal (e.g. Stay Fit, Build Muscle) and experience level (Beginner to Advanced).',
      'Environment & Equipment: Specify your available time (15–45m), room location, and available gear (none, resistance bands, or dumbbells).',
      'Joint health: Toggle Low-Impact mode to protect knees and joints from jumping stress.',
    ],
  },
  {
    step: '03',
    title: 'Generate or Select Personalized Workout',
    badge: 'Step 3: Recommendation',
    icon: Sparkles,
    summary: 'Receive an explainable routine designed specifically for your space.',
    points: [
      'Transparent reasoning: The recommendation engine shows why each movement is chosen based on your answers.',
      'Structured 3-part routine: Dynamic mobility warm-up, core exercise block, and recovery cool-down.',
      'Flexibility: Follow today’s suggested plan or explore the workout library to practice any exercise at your own pace.',
    ],
  },
  {
    step: '04',
    title: 'Start Movement & Prepare Your Space',
    badge: 'Step 4: Execution',
    icon: Play,
    summary: 'Follow clear exercise instructions tailored for minimal equipment.',
    points: [
      'Dorm-friendly movements: Exercises are designed for small footprints without disturbing roommates.',
      'Self-guided or AI-assisted: Complete sets independently or activate camera guidance for supported movements.',
      'Target muscle visibility: Review primary and secondary muscle groups before starting.',
    ],
  },
  {
    step: '05',
    title: 'Use Camera Coach Where Supported',
    badge: 'Step 5: Live Guidance',
    icon: Camera,
    summary: 'On-device MediaPipe vision tracks your form and counts reps in real time.',
    points: [
      'Zero cloud streaming: Video frames are evaluated entirely in browser memory; no frames are recorded or uploaded.',
      'Biomechanical angle tracking: Knee angles for squats, elbow angles for push-ups, torso flexion for crunches, and stance width for jumping jacks.',
      'Live feedback cues: Get instant voice/visual reminders to reach depth, maintain posture, or fix camera framing.',
      'Automated repetition counting: State machines verify each complete, visibility-qualified repetition.',
    ],
  },
  {
    step: '06',
    title: 'Complete & Save Session Summary',
    badge: 'Step 6: Review',
    icon: CheckCircle2,
    summary: 'Review an objective breakdown of your workout performance.',
    points: [
      'Calorie estimation: Uses evidence-based MET (Metabolic Equivalent of Task) values with your body weight.',
      'Form breakdown: Highlights reps completed, posture cues triggered, and camera framing continuity.',
      'Automatic or manual save: Synced instantly for logged-in accounts; stored locally for guests.',
    ],
  },
  {
    step: '07',
    title: 'View Progress & Community Consistency',
    badge: 'Step 7: Momentum',
    icon: BarChart3,
    summary: 'Track your long-term consistency and celebrate incremental wins.',
    points: [
      'Activity streaks: Rolling 7-day indicators highlight weekly consistency.',
      'Historical archives: Inspect all past workouts, reps, and active duration.',
      'Opt-in campus leaderboard: Optionally compete on workouts and reps using a private alias—never body weight or photos.',
    ],
  },
];

export default function HowItWorksScreen({ onNavigate, onStartCoach, appActive, hasProfile }) {
  return (
    <main className="screen-page how-it-works-page">
      <ScreenHeader
        eyebrow="The User Journey"
        title="How BITS in Motion works"
        description="A practical, 7-step fitness loop from room setup to verified progress. Here is exactly what happens behind the scenes."
        action={
          <div className="screen-heading-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => (onStartCoach ? onStartCoach('squats', 'how-it-works') : onNavigate('coach'))}
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

      {/* 7-Step Journey Timeline */}
      <div className="journey-timeline">
        {JOURNEY_STEPS.map((item) => {
          const Icon = item.icon;
          return (
            <article className="journey-card" key={item.step}>
              <div className="journey-card-aside">
                <span className="journey-number">{item.step}</span>
                <div className="journey-icon-wrap">
                  <Icon size={22} />
                </div>
              </div>
              <div className="journey-card-content">
                <div className="journey-card-header">
                  <span className="journey-badge">{item.badge}</span>
                  <h3>{item.title}</h3>
                </div>
                <p className="journey-summary">{item.summary}</p>
                <ul className="journey-points">
                  {item.points.map((pt, idx) => (
                    <li key={idx}>
                      <CheckCircle2 size={15} className="text-teal" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>

      {/* Privacy Guarantee Card */}
      <section className="how-it-works-privacy-box">
        <div className="privacy-box-icon"><ShieldCheck size={32} /></div>
        <div>
          <h3>Privacy-First AI Guarantee</h3>
          <p>
            Unlike conventional fitness apps that upload video to cloud servers for processing, BITS in Motion runs lightweight Google MediaPipe WASM models <strong>100% on your device</strong>. Your camera stream never leaves your browser’s temporary memory.
          </p>
          <div className="privacy-box-links">
            <button
              className="button button-white button-small"
              type="button"
              onClick={() => onNavigate('terms')}
            >
              Read full privacy & terms disclosure <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Bottom Conversion CTA */}
      <section className="features-cta-banner panel-dark">
        <div>
          <span className="eyebrow light">Ready to Move?</span>
          <h2>Start your fitness journey right now</h2>
          <p>Choose Guest mode for instant local testing, or connect Google for cloud sync.</p>
        </div>
        <div className="features-cta-actions">
          <button
            className="button button-primary button-large"
            type="button"
            onClick={() => onNavigate(appActive && hasProfile ? 'dashboard' : 'profile')}
          >
            {appActive && hasProfile ? 'Open dashboard' : 'Set up my profile'} <ArrowRight size={18} />
          </button>
          <button
            className="button button-on-dark button-large"
            type="button"
            onClick={() => onNavigate('features')}
          >
            Explore all features
          </button>
        </div>
      </section>
    </main>
  );
}
