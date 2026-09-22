import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  FileText,
  HeartPulse,
  Info,
  Lock,
  Mail,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';

export default function PrivacyScreen({ onNavigate, appActive, hasProfile }) {
  return (
    <main className="screen-page privacy-page">
      <ScreenHeader
        eyebrow="Privacy & Data Architecture"
        title="Privacy Policy"
        description="Comprehensive disclosure of on-device vision processing, local storage, cloud database isolation, and security engineering practices for BITS in Motion. Smart India Hackathon 2026."
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
        <button type="button" className="trust-subnav-pill active" aria-current="page">
          <ShieldCheck size={16} /> Privacy Policy
        </button>
        <button type="button" className="trust-subnav-pill" onClick={() => onNavigate('health-disclaimer')}>
          <HeartPulse size={16} /> Health Disclaimer
        </button>
      </nav>

      {/* Notice Box */}
      <div className="terms-notice-box privacy-notice-box">
        <div className="terms-notice-icon"><ShieldCheck size={24} /></div>
        <div className="terms-notice-body">
          <strong>Privacy by Architecture, Not Just Policy</strong>
          <p>
            At BITS in Motion, your physical privacy is protected by engineering design. All computer vision analysis executes 100% locally on your personal device using WebAssembly. Camera video streams are never transmitted, recorded, or stored on remote servers.
          </p>
        </div>
      </div>

      <div className="terms-container">
        {/* Section 1: Overview & Core Philosophy */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">01</span>
            <h2>Overview & Core Privacy Principles</h2>
          </div>
          <div className="terms-section-content">
            <p>
              BITS in Motion is engineered for students and fitness enthusiasts with a foundational commitment to user privacy. We believe that physical exercise guidance in private living quarters (such as hostel rooms or bedrooms) must guarantee complete visual confidentiality.
            </p>
            <p>
              Our privacy framework is grounded in four fundamental pillars:
            </p>
            <ul>
              <li><strong>Zero Video Transmission:</strong> Raw camera frames never leave your local device under any circumstance.</li>
              <li><strong>Tiered Storage Transparency:</strong> Complete clarity regarding what data is kept in browser memory, local storage, or cloud databases.</li>
              <li><strong>Strict Tenant Isolation:</strong> Cloud data is cryptographically tied to verified Google accounts with per-user SQL isolation.</li>
              <li><strong>Zero Commercial Monetization:</strong> No user data is sold, licensed, or shared with advertising networks or third-party data brokers.</li>
            </ul>
          </div>
        </section>

        {/* Section 2: On-Device Vision & Zero Video Upload */}
        <section className="terms-section highlight-border-teal">
          <div className="terms-section-header">
            <span className="terms-num">02</span>
            <h2>On-Device Vision & Zero Video Upload Architecture</h2>
          </div>
          <div className="terms-section-content">
            <div className="terms-subbox positive">
              <div className="subbox-title">
                <CheckCircle2 size={18} /> Verified Technical Architecture
              </div>
              <p>
                When you activate the Camera Coach, the video stream from your webcam or mobile camera is fed directly into a client-side Google MediaPipe Pose machine learning model running inside your web browser via WebAssembly (WASM).
              </p>
            </div>
            <p>
              How our computer vision pipeline operates in detail:
            </p>
            <ul>
              <li><strong>33 Coordinate Landmarks:</strong> The neural network analyzes video frames strictly in volatile device memory to extract 33 three-dimensional skeletal coordinate points (X, Y, Z coordinates and visibility confidence).</li>
              <li><strong>Instant Frame Deletion:</strong> The original pixel frame is immediately overwritten and discarded. No frame is ever captured as a bitmap, recorded to disk, or sent across the network.</li>
              <li><strong>Client-Side Biomechanics:</strong> Joint angles (e.g., knee bend angle, elbow flex) and repetition counters are calculated locally using client-side geometric heuristics.</li>
              <li><strong>Network Verification:</strong> You can verify this independently at any time using your browser's Developer Tools Network panel—zero image or video payloads are transmitted during live workout sessions.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: Anonymous Camera Coach Preview */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">03</span>
            <h2>Anonymous Camera Coach Preview Mode</h2>
          </div>
          <div className="terms-section-content">
            <p>
              BITS in Motion provides an immediate Anonymous Camera Preview (accessible via <code>#preview</code>) for new visitors and evaluators to test our computer vision coach without commitment:
            </p>
            <ul>
              <li><strong>No Authentication Required:</strong> No Google sign-in or guest profile creation is requested.</li>
              <li><strong>No Preview Writes:</strong> Preview metrics are never sent to the account API. If you already have a signed-in session, the app may separately restore your existing account.</li>
              <li><strong>Zero LocalStorage Persistence:</strong> Repetition counts, exercise durations, and estimated calories during preview mode are kept purely in volatile React state.</li>
              <li><strong>Immediate Ephemeral Cleanup:</strong> When you exit the preview or close the browser tab, all session metrics are instantly discarded and never merged into any subsequent account.</li>
            </ul>
          </div>
        </section>

        {/* Section 4: Guest Mode & Local Storage Storage */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">04</span>
            <h2>Guest Mode & Local Storage Isolation</h2>
          </div>
          <div className="terms-section-content">
            <p>
              Users who choose to "Continue as Guest" experience complete application functionality without creating an online account:
            </p>
            <ul>
              <li><strong>Local-Only Persistence:</strong> Guest fitness profiles, personalized workout plans, and completed workout sessions are stored exclusively in your browser’s local storage under <code>bits-motion-*-v1</code> keys.</li>
              <li><strong>No Cloud Sync:</strong> Guest data is never uploaded to remote servers or synchronized across multiple devices or browsers.</li>
              <li><strong>User Control:</strong> Clearing this site’s browser data removes Guest records. “Sign in or exit guest” leaves those records in this browser so you can resume later. Signing in does not import them into your account.</li>
            </ul>
          </div>
        </section>

        {/* Section 5: Google Sign-In & Authentication */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">05</span>
            <h2>Google Sign-In & Identity Services</h2>
          </div>
          <div className="terms-section-content">
            <p>
              For users seeking cross-device persistence and cloud backup, BITS in Motion integrates Google Identity Services (OAuth 2.0 / OpenID Connect):
            </p>
            <ul>
              <li><strong>Data Received from Google:</strong> Upon authentication, our backend receives and verifies your Google ID token via Google's token verification endpoints. We collect only your unique Google subject identifier (<code>sub</code>), full name, email address, and profile photo URL.</li>
              <li><strong>No Password Storage:</strong> We never handle, receive, or store your Google password.</li>
              <li><strong>Minimal Scopes:</strong> We request only basic identity profile scopes and do not request access to your Google Drive, contacts, calendar, or other personal Google services.</li>
            </ul>
          </div>
        </section>

        {/* Section 6: Cloud Database Storage & PostgreSQL Tenant Isolation */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">06</span>
            <h2>Cloud Storage & PostgreSQL Tenant Isolation</h2>
          </div>
          <div className="terms-section-content">
            <p>
              When authenticated with a Google account, your fitness profile, generated workout plans, and workout session history are stored in a serverless Neon PostgreSQL database:
            </p>
            <ul>
              <li><strong>Strict Tenant Isolation:</strong> Every database query is strictly parameterized and scoped by the authenticated user's unique ID (<code>WHERE user_id = $1</code>). No user can access or query another user's private workout sessions or personal profile attributes.</li>
              <li><strong>Encrypted in Transit:</strong> All communications between your browser, our API serverless endpoints, and the Neon PostgreSQL database are encrypted using Transport Layer Security (HTTPS / TLS).</li>
              <li><strong>What We Store:</strong> Profile inputs (height, weight, age, fitness level, primary goal, available equipment, workout space), generated plans, and session summaries (exercise type, rep count, duration, estimated calories, completion timestamp).</li>
            </ul>
          </div>
        </section>

        {/* Section 7: Session Security & Cryptographic Cookie Signing */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">07</span>
            <h2>Session Management & Cookie Security</h2>
          </div>
          <div className="terms-section-content">
            <p>
              We prioritize modern web application security practices for authentication and session hygiene:
            </p>
            <ul>
              <li><strong>Cryptographic HMAC Signing:</strong> Authenticated sessions are managed via signed session tokens using HMAC-SHA256 with server-side secrets.</li>
              <li><strong>HttpOnly & SameSite Protection:</strong> Session cookies are set with <code>HttpOnly</code> (preventing client-side script access to guard against cross-site scripting / XSS attacks) and <code>SameSite=Lax</code> (guarding against cross-site request forgery / CSRF).</li>
              <li><strong>Session Expiration:</strong> Sessions expire after their configured lifetime. A successful sign-out clears this browser’s session cookie; it does not revoke cookies on other devices.</li>
            </ul>
          </div>
        </section>

        {/* Section 8: Campus Leaderboard & Privacy Controls */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">08</span>
            <h2>Campus Leaderboard & Privacy Controls</h2>
          </div>
          <div className="terms-section-content">
            <p>
              Community competition on the BITS in Motion Campus Leaderboard is designed with privacy-first principles:
            </p>
            <ul>
              <li><strong>Default Opt-Out:</strong> Leaderboard participation is strictly opt-in (<code>leaderboardOptIn = false</code> by default). Your workout stats are never displayed publicly unless you explicitly enable the setting.</li>
              <li><strong>Pseudonymous Aliases:</strong> Rankings display the public alias you choose. Avoid using your real name if you want a pseudonym. Email addresses and body measurements are not displayed.</li>
              <li><strong>Revocable Participation:</strong> You can disable leaderboard sharing at any time in your Fitness Profile, removing your entry from public rankings immediately.</li>
            </ul>
          </div>
        </section>

        {/* Section 9: Recommendation Engine Data Usage */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">09</span>
            <h2>Workout Recommendation Data Usage</h2>
          </div>
          <div className="terms-section-content">
            <p>
              Workout recommendations use fitness level, goal, time, workout setting, equipment and low-impact preference. Setting is a selected space category, not GPS or an address. Age checks eligibility; height and weight provide BMI, and weight is used for calorie estimates. BMI does not select exercises.
            </p>
            <p>
              The same deterministic rules run in the browser for Guests and on our server for signed-in accounts. Your biometric parameters are never shared with external AI vendors, language model APIs, or commercial recommendation platforms.
            </p>
          </div>
        </section>

        {/* Section 10: Third-Party Services & CDNs */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">10</span>
            <h2>Third-Party Services & Assets</h2>
          </div>
          <div className="terms-section-content">
            <p>
              To maintain high performance and reliable delivery, BITS in Motion utilizes a minimal set of trusted third-party services:
            </p>
            <ul>
              <li><strong>Vercel:</strong> Static site hosting and serverless API execution.</li>
              <li><strong>Neon:</strong> Serverless managed PostgreSQL database hosting.</li>
              <li><strong>Google Identity Services:</strong> Client-side OAuth library for Google Sign-In.</li>
              <li><strong>MediaPipe:</strong> The app serves its pose model and WASM files from the same site. Processing remains inside your browser.</li>
            </ul>
            <p>
              We do NOT embed advertising networks, marketing analytics SDKs, session recording tools, or third-party behavioral trackers.
            </p>
          </div>
        </section>

        {/* Section 11: Honest Compliance Disclosure */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">11</span>
            <h2>Regulatory Disclosures & Hackathon Prototype Status</h2>
          </div>
          <div className="terms-section-content">
            <div className="terms-alert-card info">
              <Info size={20} className="alert-icon" />
              <div>
                <p>
                  <strong>Student Proof-of-Concept Disclosure:</strong> BITS in Motion is an academic project built for Smart India Hackathon 2026. It has not undergone formal third-party regulatory certification audits, including HIPAA compliance certification, official GDPR supervisory authority audit, ISO/IEC 27001 certification, or SOC 2 Type II attestation.
                </p>
                <p>
                  While our architecture implements sound security engineering (on-device vision processing, TLS encryption, parameterized SQL queries, signed cookies, and tenant isolation), users should assess the application in its authentic context as a student hackathon demonstration.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 12: Data Retention, Deletion & Contact */}
        <section className="terms-section">
          <div className="terms-section-header">
            <span className="terms-num">12</span>
            <h2>Data Retention, User Rights & Contact</h2>
          </div>
          <div className="terms-section-content">
            <p>
              You maintain sovereign rights regarding your personal fitness data:
            </p>
            <ul>
              <li><strong>Guest Data Purge:</strong> Clearing your browser cookies and site storage instantly and permanently purges all local guest records.</li>
              <li><strong>Account Deletion:</strong> Signed-in users can request complete deletion of their account profile, plans, and session history by contacting the project team.</li>
              <li><strong>History Access:</strong> Progress displays locally saved Guest sessions or the latest 50 account sessions. A downloadable export is not currently provided.</li>
            </ul>
            <div className="terms-contact-card">
              <Mail size={18} />
              <span>Privacy Contact: <strong>BITS in Motion Team (SIH 2026)</strong> via official hackathon portal</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
