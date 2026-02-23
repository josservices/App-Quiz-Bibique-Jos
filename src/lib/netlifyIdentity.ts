export interface IdentityUser {
  id?: string;
  email?: string;
}

type IdentityEvent = 'init' | 'login' | 'logout' | 'error';
type IdentityEventHandler = (payload?: IdentityUser | Error | null) => void;

interface NetlifyIdentityWidget {
  init: () => void;
  open: (tabName?: 'login' | 'signup') => void;
  close: () => void;
  logout: () => void;
  currentUser: () => IdentityUser | null;
  on: (event: IdentityEvent, handler: IdentityEventHandler) => void;
  off: (event: IdentityEvent, handler: IdentityEventHandler) => void;
}

declare global {
  interface Window {
    netlifyIdentity?: NetlifyIdentityWidget;
  }
}

export function getNetlifyIdentity(): NetlifyIdentityWidget | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.netlifyIdentity ?? null;
}

export async function isNetlifyIdentityEnabled(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const response = await fetch('/.netlify/identity/settings', {
      headers: { Accept: 'application/json' }
    });
    return response.ok;
  } catch {
    return false;
  }
}
