import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (element: HTMLElement, config: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export interface GoogleRegistrationData {
  token: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
}

interface GoogleSignInButtonProps {
  onError?: (message: string) => void;
  mode?: 'login' | 'register';

  // Used only when a NEW/incomplete Google customer
  // must finish Rayjin Hardware registration.
  onRegistrationRequired?: (
    data: GoogleRegistrationData
  ) => void;
}

// Google "G" logo
function GoogleLogo() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export function GoogleSignInButton({
  onError,
  mode = 'login',
  onRegistrationRequired,
}: GoogleSignInButtonProps) {
  const navigate = useNavigate();
  const hiddenBtnRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

  const isConfigured =
    clientId &&
    !clientId.includes('YOUR_GOOGLE_CLIENT_ID');

  // Wait for Google Identity Services script
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        setScriptReady(true);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleCredentialResponse = async (
    response: { credential: string }
  ) => {
    setLoading(true);

    try {
      const res = await axios.post(
        '/api/auth/google',
        {
          id_token: response.credential,
          mode,
        }
      );

      // ─────────────────────────────────────
      // NEW / INCOMPLETE GOOGLE CUSTOMER
      // ─────────────────────────────────────
      if (res.data?.requires_registration) {
        if (mode !== 'register') {
          onError?.(
            'This Google account still needs to complete Rayjin Hardware registration. Please open Sign Up and choose "Sign up with Google".'
          );
          return;
        }

        const registrationToken =
          res.data.google_registration_token;

        const profile =
          res.data.google_profile;

        if (
          !registrationToken ||
          !profile?.email
        ) {
          onError?.(
            'Google registration information is incomplete. Please try again.'
          );
          return;
        }

        if (!onRegistrationRequired) {
          onError?.(
            'Unable to open the Google registration form. Please try again.'
          );
          return;
        }

        onRegistrationRequired({
          token: registrationToken,
          first_name:
            profile.first_name || '',
          last_name:
            profile.last_name || '',
          email: profile.email,
          avatar_url:
            profile.avatar_url ?? null,
        });

        return;
      }

      // ─────────────────────────────────────
      // EXISTING COMPLETE CUSTOMER
      // ─────────────────────────────────────
      const {
        token,
        user,
      } = res.data;

      if (!token || !user) {
        onError?.(
          'Google authentication returned an incomplete response.'
        );
        return;
      }

      localStorage.setItem(
        'token',
        token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(user)
      );

      window.dispatchEvent(
        new Event('storage')
      );

      navigate(
        user.role === 'admin'
          ? '/admin/dashboard'
          : '/customer/dashboard'
      );

    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err)
          ? err.response?.data?.error
          : null;

      onError?.(
        message ||
        'Google sign-in failed. Please try again.'
      );

    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Identity Services
  useEffect(() => {
    if (
      !scriptReady ||
      !hiddenBtnRef.current ||
      !isConfigured
    ) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback:
        handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(
      hiddenBtnRef.current,
      {
        theme: 'outline',
        size: 'large',
        width: 400,
        text:
          mode === 'register'
            ? 'signup_with'
            : 'signin_with',
      }
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scriptReady,
    clientId,
    mode,
  ]);

  const handleCustomButtonClick = () => {
    const gsiBtn =
      hiddenBtnRef.current?.querySelector(
        'div[role="button"]'
      ) as HTMLElement | null;

    if (gsiBtn) {
      gsiBtn.click();
    } else {
      window.google?.accounts?.id?.prompt();
    }
  };

  if (!isConfigured) {
    return (
      <div className="w-full py-3 px-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-sm text-center font-mono">
        ⚠ Set VITE_GOOGLE_CLIENT_ID in project/.env to enable Google Sign-In
      </div>
    );
  }

  return (
    <div className="relative w-full">

      {/* Hidden official Google button */}
      <div
        ref={hiddenBtnRef}
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none overflow-hidden w-0 h-0"
      />

      {/* Rayjin-styled Google button */}
      <button
        type="button"
        onClick={handleCustomButtonClick}
        disabled={
          loading ||
          !scriptReady
        }
        className="
          w-full flex items-center justify-center gap-3
          py-3 px-4 rounded-xl
          bg-white/5 hover:bg-white/10
          border border-white/15 hover:border-white/30
          text-white font-medium text-sm
          transition-all duration-200 ease-out
          hover:-translate-y-0.5
          hover:shadow-lg hover:shadow-black/20
          active:scale-[0.98]
          active:translate-y-0
          disabled:opacity-50
          disabled:cursor-not-allowed
          disabled:transform-none
          focus:outline-none
          focus:ring-2 focus:ring-white/20
        "
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white/60"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />

              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>

            <span className="text-white/70">
              Authenticating…
            </span>
          </>
        ) : (
          <>
            <GoogleLogo />

            <span>
              {mode === 'register'
                ? 'Sign up with Google'
                : 'Sign in with Google'}
            </span>
          </>
        )}
      </button>
    </div>
  );
}