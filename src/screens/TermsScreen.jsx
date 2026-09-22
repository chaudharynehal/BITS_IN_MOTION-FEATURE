import TrustPublication from '../components/TrustPublication';
import { TERMS_SECTIONS } from '../data/trustContent';

export default function TermsScreen({ onNavigate, appActive, hasProfile }) {
  return (
    <TrustPublication
      page="terms"
      eyebrow="Trust & Operating Rules"
      title="Terms and Conditions"
      description="The rules, responsibilities, service limits, and legal basis that apply when you use BITS in Motion."
      regionLabel="Governing law: India"
      noticeTitle="Please read before using BITS in Motion"
      noticeText="BITS in Motion is a student fitness project for education, demonstration, and personal use—not a medical or clinical service."
      sections={TERMS_SECTIONS}
      onNavigate={onNavigate}
      appActive={appActive}
      hasProfile={hasProfile}
    />
  );
}
