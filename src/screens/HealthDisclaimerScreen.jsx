import TrustPublication from '../components/TrustPublication';
import { HEALTH_SECTIONS } from '../data/trustContent';

export default function HealthDisclaimerScreen({ onNavigate, appActive, hasProfile }) {
  return (
    <TrustPublication
      page="health-disclaimer"
      eyebrow="Fitness Safety"
      title="Health Disclaimer"
      description="Important health, exercise, room-safety, camera, and estimate limitations for BITS in Motion workouts."
      noticeTitle="Your safety comes before every target"
      noticeText="Stop if a movement feels unsafe or causes a warning symptom. BITS in Motion does not provide medical advice or emergency assistance."
      sections={HEALTH_SECTIONS}
      onNavigate={onNavigate}
      appActive={appActive}
      hasProfile={hasProfile}
    />
  );
}
