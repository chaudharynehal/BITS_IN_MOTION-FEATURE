import { AlertTriangle, FileText, HeartPulse, ShieldCheck } from 'lucide-react';
import PublicInfoNav from './PublicInfoNav';
import ScreenHeader from './ScreenHeader';
import { TRUST_PUBLICATION_DATE } from '../data/trustContent';

const PAGE_ICONS = {
  terms: FileText,
  privacy: ShieldCheck,
  'health-disclaimer': HeartPulse,
};

function Bullet({ item }) {
  if (typeof item === 'string') return <li>{item}</li>;
  return <li><strong>{item.lead}</strong>{item.text}</li>;
}

function InternalLink({ link, onNavigate }) {
  return (
    <a
      className="trust-inline-link"
      href={`#${link.route}`}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(link.route);
      }}
    >
      {link.label}
    </a>
  );
}

function TrustSection({ section, index, onNavigate, page }) {
  const headingId = `${page}-section-${index + 1}`;
  return (
    <section className={`terms-section${section.tone ? ` trust-section-${section.tone}` : ''}`} aria-labelledby={headingId}>
      <div className="terms-section-header">
        <span className="terms-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <h2 id={headingId}>{section.title}</h2>
      </div>
      <div className="terms-section-content">
        {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {section.bullets && <ul>{section.bullets.map((item, itemIndex) => <Bullet item={item} key={typeof item === 'string' ? item : item.lead + itemIndex} />)}</ul>}
        {section.groups?.map((group) => (
          <div className="trust-subsection" key={group.title}>
            <h3>{group.title}</h3>
            {group.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {group.bullets && <ul>{group.bullets.map((item, itemIndex) => <Bullet item={item} key={typeof item === 'string' ? item : item.lead + itemIndex} />)}</ul>}
          </div>
        ))}
        {section.links && (
          <p className="trust-related-links">
            Read the {section.links.map((link, linkIndex) => (
              <span key={link.route}>
                {linkIndex > 0 && ' and '}
                <InternalLink link={link} onNavigate={onNavigate} />
              </span>
            ))} before using the application.
          </p>
        )}
        {section.note && <p className="trust-note">{section.note}</p>}
        {section.callout && (
          <div className={`trust-callout ${section.callout.tone || ''}`} role="note">
            <AlertTriangle size={20} aria-hidden="true" />
            <div><strong>{section.callout.title}</strong><p>{section.callout.text}</p></div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function TrustPublication({
  page,
  eyebrow,
  title,
  description,
  regionLabel,
  noticeTitle,
  noticeText,
  sections,
  onNavigate,
  appActive,
  hasProfile,
}) {
  const Icon = PAGE_ICONS[page];
  const pageClass = page === 'health-disclaimer' ? 'health-page' : `${page}-page`;
  const noticeClass = page === 'privacy' ? 'privacy-notice-box' : page === 'health-disclaimer' ? 'health-notice-box' : '';

  return (
    <main className={`screen-page ${pageClass}`}>
      <ScreenHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
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

      <div className="trust-metadata" aria-label="Publication details">
        <span><strong>BITS in Motion</strong></span>
        <span>Last updated: {TRUST_PUBLICATION_DATE}</span>
        {regionLabel && <span>{regionLabel}</span>}
      </div>

      <PublicInfoNav current={page} onNavigate={onNavigate} />

      <div className={`terms-notice-box ${noticeClass}`}>
        <div className="terms-notice-icon"><Icon size={24} aria-hidden="true" /></div>
        <div className="terms-notice-body">
          <strong>{noticeTitle}</strong>
          <p>{noticeText}</p>
        </div>
      </div>

      <article className="terms-container" aria-label={`${title} publication`}>
        {sections.map((section, index) => (
          <TrustSection section={section} index={index} onNavigate={onNavigate} page={page} key={section.title} />
        ))}
      </article>

      <footer className="trust-page-footer">
        <div>
          <strong>BITS in Motion</strong>
          <span>Smart India Hackathon 2026 · Last updated {TRUST_PUBLICATION_DATE}</span>
        </div>
        <a
          className="trust-footer-link"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('welcome');
          }}
        >
          Return to Home
        </a>
      </footer>
    </main>
  );
}
