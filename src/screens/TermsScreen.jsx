import {
  AlertTriangle,
  BookOpen,
  Camera,
  CheckCircle2,
  FileText,
  HeartPulse,
  Info,
  Lock,
  Mail,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Zap,
} from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';

export default function TermsScreen({ onNavigate, appActive, hasProfile }) {
  return (
    <main className="screen-page terms-page">
      <ScreenHeader
        eyebrow="Trust & Operating Rules"
        title="Terms of Service"
        description="Rules of use, user responsibilities, and prototype operating conditions for BITS in Motion. Smart India Hackathon 2026."
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
        <button type="button" className="trust-subnav-pill active" aria-current="page">
          <FileText size={16} /> Terms of Service
        </button>
        <button type="button" className="trust-subnav-pill" onClick={() => onNavigate('privacy')}>
          <ShieldCheck size={16} /> Privacy Policy
        </button>
        <button type="button" className="trust-subnav-pill" onClick={() => onNavigate('health-disclaimer')}>
          <HeartPulse size={16} /> Health Disclaimer
        </button>
      </nav>

      {/* High-level Notice Card */}
      <div className="terms-notice-box">
        <div className="terms-notice-icon"><Scale size={24} /></div>
        <div className="terms-notice-body">
          <strong>Hackathon Proof-of-Concept Terms of Use</strong>
          <p>
            BITS in Motion is an experimental fitness guidance and on-device computer vision prototype created for Smart India Hackathon 2026. This platform is provided strictly for educational, demonstration, and personal workout tracking purposes under these transparent Terms of Service.
          </p>
        </div>
      </div>

      <div className="terms-container">
        {/* Section 1: Introduction & Acceptance */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">01</span>
            <h2>Introduction & Acceptance of Terms</h2>
          </div>
          <div className="terms-section-content">
            <p>
              By accessing, browsing, or using the BITS in Motion web application, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree with these terms, you must discontinue using the application immediately.
            </p>
            <p>
              These Terms constitute a binding agreement between you as an individual user and the student project team behind BITS in Motion.
            </p>
          </div>
        </section>

        {/* Section 2: Purpose of BITS in Motion */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">02</span>
            <h2>Purpose of BITS in Motion</h2>
          </div>
          <div className="terms-section-content">
            <p>
              BITS in Motion is engineered specifically for college students and individuals living in limited-space accommodations (such as hostel rooms, dormitories, and shared flats) who seek practical, low-barrier fitness support.
            </p>
            <p>
              The application provides transparent workout recommendations, an on-device camera-guided exercise coach with automated rep counting, and personal workout history tracking. It is not intended for commercial fitness training or clinical rehabilitation.
            </p>
          </div>
        </section>

        {/* Section 3: User Responsibilities & Physical Safety */}
        <section className="terms-section highlight-border">
          <div className="terms-section-header">
            <span className="terms-num">03</span>
            <h2>User Responsibilities & Physical Safety</h2>
          </div>
          <div className="terms-section-content">
            <div className="terms-alert-card warning">
              <AlertTriangle size={22} className="alert-icon" />
              <div>
                <strong>Physical Safety Requirement:</strong>
                <p>
                  You are solely responsible for ensuring you are in adequate physical health to perform bodyweight exercises and for maintaining a safe, hazard-free physical environment before starting any movement session.
                </p>
              </div>
            </div>
            <ul>
              <li>
                <strong>Clear Space:</strong> Ensure a cleared, unobstructed area of at least 2m × 2m free of loose rugs, cables, wet spots, and sharp furniture edges.
              </li>
              <li>
                <strong>Self-Regulation:</strong> Never push beyond your physical capacity. Immediately discontinue exercise if you experience pain, dizziness, vertigo, chest tightness, or nausea.
              </li>
              <li>
                <strong>Device Positioning:</strong> Position your device securely on a stable surface (such as a desk, shelf, or stable chair) where it cannot slip or fall during movement.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Account & Guest Mode Rules */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">04</span>
            <h2>Account and Guest Mode Responsibilities</h2>
          </div>
          <div className="terms-section-content">
            <p>
              BITS in Motion supports two operating modalities with distinct data and access boundaries:
            </p>
            <ul>
              <li>
                <strong>Guest Mode:</strong> Operates entirely within your local browser storage (`localStorage`). Guest data remains on that device only and is subject to local browser cache policies. You are responsible for preserving your local browser storage if you wish to retain guest workout history.
              </li>
              <li>
                <strong>Google Account Mode:</strong> Connects via Google Identity Services and persists profile, plans, and session history in a cloud-hosted Neon PostgreSQL database. You are responsible for maintaining the confidentiality of your Google account credentials.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Camera Coach Usage Rules */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">05</span>
            <h2>Camera Coach Usage Rules</h2>
          </div>
          <div className="terms-section-content">
            <p>
              The Live Camera Coach uses client-side WebAssembly computer vision (Google MediaPipe Pose Landmarker) to detect body landmarks and provide real-time form guidance.
            </p>
            <ul>
              <li>
                Camera guidance is an <strong>assistive visual tool</strong>, not a certified physical coach or medical supervisor.
              </li>
              <li>
                Camera features require temporary camera permissions granted in your browser. You may revoke camera access at any time via your browser settings.
              </li>
              <li>
                You agree not to use the camera feature in public or shared spaces where other individuals' privacy could be violated.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 6: AI & Pose-Estimation Limitations */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">06</span>
            <h2>AI & Computer Vision Accuracy Limitations</h2>
          </div>
          <div className="terms-section-content">
            <p>
              Computer vision algorithms are subject to physical, optical, and biomechanical constraints:
            </p>
            <ul>
              <li>
                <strong>Lighting & Contrast:</strong> Poor lighting, backlighting, or low contrast between clothing and backgrounds may reduce landmark detection precision.
              </li>
              <li>
                <strong>Framing & Occlusion:</strong> Partial body visibility, loose clothing, or objects blocking joints will affect joint angle calculation and rep completion detection.
              </li>
              <li>
                <strong>No Perfect Accuracy Guarantee:</strong> We do not guarantee 100% precision in rep counting, movement stage tracking, or form cue generation. Never rely on automated cues if a movement feels physically uncomfortable.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 7: Acceptable Use Policy */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">07</span>
            <h2>Acceptable Use Policy</h2>
          </div>
          <div className="terms-section-content">
            <p>When using BITS in Motion, you agree NOT to:</p>
            <ul>
              <li>Attempt to bypass, disable, or tamper with security features, API rate limits, or session tokens.</li>
              <li>Inject malicious scripts, exploit vulnerabilities, or use automated scrapers against application endpoints.</li>
              <li>Create offensive, defamatory, or abusive pseudonyms on the public campus leaderboard.</li>
              <li>Falsely claim certification, clinical authority, or endorsement associated with BITS in Motion.</li>
            </ul>
          </div>
        </section>

        {/* Section 8: Third-Party Dependencies */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">08</span>
            <h2>Third-Party Services</h2>
          </div>
          <div className="terms-section-content">
            <p>
              BITS in Motion integrates with selected third-party infrastructure:
            </p>
            <ul>
              <li><strong>Google Identity Services:</strong> Provides OAuth 2.0 credential verification for account sign-in.</li>
              <li><strong>Neon Database:</strong> Serverless PostgreSQL provider hosting cloud-synced account data.</li>
              <li><strong>Vercel:</strong> Hosting and edge deployment provider delivering the web application bundle.</li>
            </ul>
            <p>
              Your use of features reliant on third parties is also subject to their respective terms and service availability.
            </p>
          </div>
        </section>

        {/* Section 9: Service Availability & Prototype Status */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">09</span>
            <h2>Service Availability & Prototype Status</h2>
          </div>
          <div className="terms-section-content">
            <p>
              BITS in Motion is provided on an "as-is" and "as-available" basis for hackathon evaluation and demonstration. The development team does not guarantee uninterrupted uptime, bug-free operation, or perpetual data availability. Maintenance, updates, and feature changes may occur without prior notice.
            </p>
          </div>
        </section>

        {/* Section 10: Intellectual Property & Attribution */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">10</span>
            <h2>Intellectual Property & Attribution</h2>
          </div>
          <div className="terms-section-content">
            <p>
              All application code, visual assets, recommendation heuristics, and branding created for BITS in Motion are the intellectual property of the project creators under Smart India Hackathon 2026. Open-source libraries (such as React, Vite, Lucide Icons, and Google MediaPipe) remain subject to their respective open-source licenses.
            </p>
          </div>
        </section>

        {/* Section 11: Limitation of Liability */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">11</span>
            <h2>Limitation of Liability</h2>
          </div>
          <div className="terms-section-content">
            <p>
              To the maximum extent permitted by applicable law, the student development team and hackathon organizers shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from:
            </p>
            <ul>
              <li>Physical injury, strain, sprain, or illness occurring during or following exercise activities.</li>
              <li>Inaccuracies in automated rep counting, movement feedback, or estimated calorie consumption.</li>
              <li>Loss of locally stored guest data, network interruptions, or server downtime.</li>
            </ul>
          </div>
        </section>

        {/* Section 12: Changes to Service & Terms */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">12</span>
            <h2>Changes to Service and Terms</h2>
          </div>
          <div className="terms-section-content">
            <p>
              We reserve the right to revise these Terms of Service as the application evolves through hackathon evaluation rounds. Revisions will be reflected on this page with an updated modification timestamp. Continued use of the platform constitutes your agreement to updated terms.
            </p>
          </div>
        </section>

        {/* Section 13: Project Contact Information */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">13</span>
            <h2>Contact & Hackathon Inquiries</h2>
          </div>
          <div className="terms-section-content">
            <p>
              For inquiries regarding BITS in Motion, demonstration requests, or technical clarifications during Smart India Hackathon 2026, please contact the development team through the official hackathon submission portal or GitHub repository.
            </p>
            <div className="terms-contact-card">
              <Mail size={18} />
              <span>Project Team: <strong>BITS in Motion (SIH 2026)</strong></span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
