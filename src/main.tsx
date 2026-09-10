import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ProductImageViewerProvider } from './components/ProductImageViewer.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProductImageViewerProvider>
      <App />
    </ProductImageViewerProvider>
  </StrictMode>,
);

