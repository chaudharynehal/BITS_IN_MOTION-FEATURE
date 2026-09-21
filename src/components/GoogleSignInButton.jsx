import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

const SCRIPT_ID = 'google-identity-services';

let scriptPromise;

function loadGoogleScript() {
  if (globalThis.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    document.getElementById(SCRIPT_ID)?.remove();
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    const timeout = window.setTimeout(() => fail(), 12000);
    function fail() {
      window.clearTimeout(timeout);
      script.remove();
      scriptPromise = null;
      reject(new Error('Google sign-in could not load.'));
    }
    script.onload = () => {
      window.clearTimeout(timeout);
      if (globalThis.google?.accounts?.id) resolve();
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const containerRef = useRef(null);
  const credentialHandlerRef = useRef(onCredential);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
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
    setStatus('loading');
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
  }, [clientId, disabled, attempt]);

  if (!clientId || disabled) {
    return <button className="google-placeholder" type="button" disabled>Google account sync needs setup</button>;
  }

  return (
    <div className="google-button-wrap">
      {status === 'loading' && <div className="google-loading"><LoaderCircle className="spin" size={17} /> Loading secure sign-in…</div>}
      {status === 'error' && <div className="auth-error">Google sign-in could not load. <button type="button" className="text-button" onClick={() => setAttempt((value) => value + 1)}>Retry Google sign-in</button> You can also continue as a guest.</div>}
      <div ref={containerRef} className={status === 'ready' ? '' : 'google-button-hidden'} />
    </div>
  );
}
