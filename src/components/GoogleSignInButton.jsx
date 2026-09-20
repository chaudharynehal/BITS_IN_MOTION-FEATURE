import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

const SCRIPT_ID = 'google-identity-services';

function loadGoogleScript() {
  if (globalThis.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const containerRef = useRef(null);
  const credentialHandlerRef = useRef(onCredential);
  const [status, setStatus] = useState('loading');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    credentialHandlerRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId || disabled) {
      setStatus('unavailable');
      return undefined;
    }
    let active = true;
    loadGoogleScript().then(() => {
      if (!active || !containerRef.current) return;
      globalThis.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => credential && credentialHandlerRef.current(credential),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      containerRef.current.replaceChildren();
      globalThis.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: Math.min(320, containerRef.current.clientWidth || 320),
      });
      setStatus('ready');
    }).catch(() => active && setStatus('error'));
    return () => { active = false; };
  }, [clientId, disabled]);

  if (!clientId || disabled) {
    return <button className="google-placeholder" type="button" disabled>Google account sync needs setup</button>;
  }

  return (
    <div className="google-button-wrap">
      {status === 'loading' && <div className="google-loading"><LoaderCircle className="spin" size={17} /> Loading secure sign-in…</div>}
      {status === 'error' && <div className="auth-error">Google sign-in could not load. Continue as guest and try again later.</div>}
      <div ref={containerRef} className={status === 'ready' ? '' : 'google-button-hidden'} />
    </div>
  );
}
