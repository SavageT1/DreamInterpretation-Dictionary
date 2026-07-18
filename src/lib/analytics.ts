type AnalyticsValue = string | number | boolean;

type AnalyticsParameters = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function updateConsent(granted: boolean) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  const value = granted ? 'granted' : 'denied';
  window.gtag('consent', 'update', {
    analytics_storage: value,
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  });
}

export function trackEvent(eventName: string, parameters: AnalyticsParameters = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', eventName, parameters);
}
