type AnalyticsValue = string | number | boolean;

type AnalyticsParameters = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (command: 'event', eventName: string, parameters?: AnalyticsParameters) => void;
  }
}

export function trackEvent(eventName: string, parameters: AnalyticsParameters = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', eventName, parameters);
}
