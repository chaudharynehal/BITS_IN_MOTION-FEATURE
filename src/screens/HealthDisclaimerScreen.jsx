import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  FileText,
  HeartPulse,
  Info,
  LifeBuoy,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';

export default function HealthDisclaimerScreen({ onNavigate, appActive, hasProfile }) {
  return (
    <main className="screen-page health-page">
      <ScreenHeader
        eyebrow="Fitness Safety & Wellness"
        title="Health & Safety Disclaimer"
        description="Essential physical activity precautions, medical disclaimers, and room safety guidelines for BITS in Motion workouts. Smart India Hackathon 2026."
        action={
          <div className="screen-heading-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => onNavigate(appActive && hasProfile ? 'dashboard' : 'welcome')}
            >
              Return to {appActive && hasProfile ? 'Dashboard' : 'Home'}
            </button>
          </div>
        }
      />

      {/* Trust & Safety Section Navigation */}
      <nav className="trust-subnav" aria-label="Trust and safety pages">
        <button type="button" className="trust-subnav-pill" onClick={() => onNavigate('terms')}>
          <FileText size={16} /> Terms of Service
        </button>
        <button type="button" className="trust-subnav-pill" onClick={() => onNavigate('privacy')}>
          <ShieldCheck size={16} /> Privacy Policy
        </button>
        <button type="button" className="trust-subnav-pill active" aria-current="page">
          <HeartPulse size={16} /> Health Disclaimer
        </button>
      </nav>

      {/* Notice Box */}
      <div className="terms-notice-box health-notice-box">
        <div className="terms-notice-icon"><HeartPulse size={24} /></div>
        <div className="terms-notice-body">
          <strong>Physical Exercise Notice & Health Advisory</strong>
          <p>
            BITS in Motion provides automated movement tracking and exercise routines for general student fitness. It is NOT a medical device, diagnostic tool, or clinical physical therapy program. Your physical health and personal safety must always take precedence over application metrics.
          </p>
        </div>
      </div>

      <div className="terms-container">
        {/* Section 1: Non-Medical & Educational Status */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">01</span>
            <h2>Educational Prototype & Non-Medical Status</h2>
          </div>
          <div className="terms-section-content">
            <p>
              BITS in Motion is an educational software prototype created for the Smart India Hackathon 2026. The information, workout recommendations, biometric estimates (such as BMI and MET-based calorie consumption), and computer-vision posture feedback provided by the platform are intended exclusively for general fitness, educational, and motivational purposes.
            </p>
            <div className="terms-alert-card warning">
              <AlertTriangle size={20} className="alert-icon" />
              <div>
                <strong>Not Medical Advice:</strong> The content provided within BITS in Motion does not constitute medical, orthopedic, or therapeutic advice, diagnosis, or treatment. It should never be relied upon as a substitute for professional medical consultations.
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Medical Consultation Advisory */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">02</span>
            <h2>Physician Consultation & Pre-Existing Conditions</h2>
          </div>
          <div className="terms-section-content">
            <p>
              Engaging in any physical exercise program involves inherent risks of physical strain or injury. You are strongly advised to consult a qualified physician or healthcare provider before beginning any workout regimen with BITS in Motion, particularly if you:
            </p>
            <ul>
              <li>Have been diagnosed with cardiovascular disease, hypertension, or arrhythmia.</li>
              <li>Experience unexplained chest pain, dizziness, or loss of balance.</li>
              <li>Have pre-existing spinal, musculoskeletal, tendon, or joint conditions (e.g., knee arthritis, herniated discs).</li>
              <li>Are recovering from recent surgery, fracture, or severe illness.</li>
              <li>Are pregnant, postpartum, or taking medications that influence heart rate or blood pressure.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: "Listen to Your Body" Protocol */}
        <section className="terms-section highlight-border-amber">
          <div className="terms-section-header">
            <span className="terms-num">03</span>
            <h2>The "Listen to Your Body" Protocol</h2>
          </div>
          <div className="terms-section-content">
            <p>
              Your body's real-time physical sensations are far more accurate and authoritative than any software algorithm or camera pose estimation model. You agree to follow this non-negotiable safety rule:
            </p>
            <div className="terms-subbox negative">
              <div className="subbox-title">
                <AlertOctagon size={18} /> Mandatory Stop Conditions
              </div>
              <p>
                <strong>STOP EXERCISING IMMEDIATELY</strong> and sit or lie down in a safe position if you experience any of the following symptoms:
              </p>
              <ul>
                <li>Acute pain, pinching, or sharp discomfort in any joint or muscle group.</li>
                <li>Chest pain, tightness, pressure, or irregular heart palpitations.</li>
                <li>Lightheadedness, dizziness, tunnel vision, or feelings of impending fainting.</li>
                <li>Nausea, cold sweats, or severe shortness of breath beyond normal cardiovascular exertion.</li>
              </ul>
            </div>
            <p>
              Never "push through" acute or sharp pain to hit a repetition target or leaderboard rank.
            </p>
          </div>
        </section>

        {/* Section 4: Physical Space Clearance (Hostel & Dorms) */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">04</span>
            <h2>Room Clearance & Environmental Safety</h2>
          </div>
          <div className="terms-section-content">
            <p>
              Because BITS in Motion is tailored for student hostels, dormitories, and compact living quarters, environmental hazards represent a primary injury risk. Before starting any movement session:
            </p>
            <ul>
              <li><strong>2m x 2m Minimum Clearance:</strong> Verify a clear floor zone of at least 2 meters by 2 meters (approximately 6 feet by 6 feet) completely free of obstacles.</li>
              <li><strong>Sharp Furniture & Corners:</strong> Ensure safe clearance from bed frames, study desk corners, shelves, chairs, and door handles.</li>
              <li><strong>Floor Surface Integrity:</strong> Exercise on a clean, dry, non-slip floor. Remove loose rugs, charging cables, textbooks, footwear, or food containers.</li>
              <li><strong>Adequate Lighting:</strong> Maintain sufficient overhead lighting so you can clearly see your surroundings and the camera can accurately detect pose landmarks.</li>
              <li><strong>Ceiling Clearance:</strong> For exercises requiring overhead extension (such as jumping jacks), verify ceiling fans and low lighting fixtures are safely out of reach.</li>
            </ul>
          </div>
        </section>

        {/* Section 5: Camera Coach Assistive Limitations */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">05</span>
            <h2>Camera Coach Assistive Limitations</h2>
          </div>
          <div className="terms-section-content">
            <p>
              The Camera Coach utilizes Google MediaPipe Pose computer vision to infer joint positions in real time. You must understand the technical boundaries of this assistive guidance:
            </p>
            <ul>
              <li><strong>Optical Approximation:</strong> Pose estimation is an algorithmic approximation derived from a 2D optical camera. It does not measure internal muscle tension, joint load, or spinal compression.</li>
              <li><strong>Environmental Interference:</strong> Baggy clothing, poor lighting, unusual camera tilt angles, or partial camera obstruction can degrade landmark accuracy.</li>
              <li><strong>Not a Human Trainer:</strong> The software cannot replace the hands-on biomechanical corrections of an accredited personal trainer or physical therapist.</li>
            </ul>
          </div>
        </section>

        {/* Section 6: Low-Impact Options & Joint Considerations */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">06</span>
            <h2>Exercise Intensity & Low-Impact Customization</h2>
          </div>
          <div className="terms-section-content">
            <p>
              Exercise routines should match your current physical fitness level, not your aspirational goals. BITS in Motion includes a "Low impact only" profile preference:
            </p>
            <ul>
              <li><strong>Low-Impact Workouts:</strong> Eliminates high-impact ballistic movements (such as jumping jacks) in favor of joint-friendly exercises with lower ground-reaction forces.</li>
              <li><strong>Warm-Up & Cooldown:</strong> Always complete recommended warm-up mobility exercises and post-workout cooldown stretches to prepare muscles and aid cardiovascular recovery.</li>
              <li><strong>Progression Pacing:</strong> If you are a beginner, commence with shorter durations (e.g., 10–15 minutes) and modest repetition counts before advancing to higher volume.</li>
            </ul>
          </div>
        </section>

        {/* Section 7: Footwear, Apparel & Hydration */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">07</span>
            <h2>Footwear, Hydration & Temperature</h2>
          </div>
          <div className="terms-section-content">
            <p>
              Safe training practices also depend on proper personal preparation:
            </p>
            <ul>
              <li><strong>Supportive Footwear:</strong> Wear clean athletic shoes with proper traction, or practice barefoot only on a stable, non-slip yoga/exercise mat. Avoid working out in socks on tile or polished floors.</li>
              <li><strong>Hydration:</strong> Keep water nearby and hydrate before, during, and after exercise.</li>
              <li><strong>Ventilation:</strong> Hostel rooms can become warm and humid quickly. Ensure proper room ventilation or fan circulation during workouts to prevent overheating.</li>
            </ul>
          </div>
        </section>

        {/* Section 8: Emergency Guidance */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">08</span>
            <h2>Emergency Situations & Immediate Care</h2>
          </div>
          <div className="terms-section-content">
            <div className="terms-alert-card warning">
              <LifeBuoy size={20} className="alert-icon" />
              <div>
                <strong>In an Acute Medical Emergency:</strong> Do not rely on or consult this software. Call your local emergency medical response number immediately:
                <ul style={{ marginTop: '8px' }}>
                  <li><strong>India Emergency Services:</strong> Dial <strong>112</strong> (Unified Emergency) or <strong>102 / 108</strong> (Ambulance).</li>
                  <li><strong>Campus Medical Centers:</strong> Contact your university or hostel health clinic security desk.</li>
                  <li><strong>United States:</strong> Dial <strong>911</strong>.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 9: Feedback & Safety Reporting */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">09</span>
            <h2>Safety Feedback & Team Contact</h2>
          </div>
          <div className="terms-section-content">
            <p>
              If you identify an exercise recommendation or computer vision cue that you believe promotes unsafe biomechanics, or if you encounter any software behavior that might contribute to injury, please notify the development team immediately.
            </p>
            <div className="terms-contact-card">
              <Mail size={18} />
              <span>Safety Feedback: <strong>BITS in Motion Team (SIH 2026)</strong> via official hackathon submission channels</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
