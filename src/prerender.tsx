import {StrictMode} from 'react';
import {renderToString} from 'react-dom/server';
import App from './App.tsx';

// Renders the home page to static HTML at build time so search engines and
// first paint see the content before the JavaScript runs.
export function renderHome() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
