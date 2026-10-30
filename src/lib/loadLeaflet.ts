export async function loadLeaflet(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).L) {
    return (window as any).L;
  }
  
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject('SSR environment');

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (document.getElementById('leaflet-js')) {
      const checkL = setInterval(() => {
        if ((window as any).L) {
          clearInterval(checkL);
          resolve((window as any).L);
        }
      }, 50);
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error('Failed to load Leaflet script'));
    document.body.appendChild(script);
  });
}
