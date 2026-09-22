import TrustPublication from '../components/TrustPublication';
import { PRIVACY_SECTIONS } from '../data/trustContent';

export default function PrivacyScreen({ onNavigate, appActive, hasProfile }) {
  return (
    <TrustPublication
      page="privacy"
      eyebrow="Privacy & Data"
      title="Privacy Policy"
      description="How BITS in Motion handles camera access, Guest records, Google-linked accounts, and optional leaderboard participation."
      regionLabel="Governing region: India"
      noticeTitle="Camera privacy is built into the product"
      noticeText="Camera processing happens locally in your browser. Video and images are not uploaded, recorded, or stored."
      sections={PRIVACY_SECTIONS}
      onNavigate={onNavigate}
      appActive={appActive}
      hasProfile={hasProfile}
    />
  );
}
