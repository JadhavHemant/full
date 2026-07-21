/**
 * ============================================
 *  APPLICATION CONFIGURATION
 * ============================================
 * 
 * Set `API_MODE` to control which server the app connects to.
 * 
 *   API_MODE = 'local'   → uses http://localhost:5351/api
 *   API_MODE = 'live'    → uses https://erp-project-apis.onrender.com/api
 * 
 * You can also override the URLs below if needed.
 * ============================================
 */

const CONFIG = {
  // ─── API MODE ───────────────────────────────────────────────
  // Change this to 'local' or 'live' as needed.
  // The app will use the corresponding API_BASE_URL below.
  API_MODE: 'local',   // <-- change to 'live' for production

  // ─── BASE URLS ──────────────────────────────────────────────
  LOCAL_API_URL: 'http://localhost:5351/api',
  LIVE_API_URL: 'https://erp-project-apis.onrender.com/api',

  // ─── SOCKET URLS (derived from API URLs) ────────────────────
  // Socket.IO connects to the root server (without /api suffix)
  get LOCAL_SOCKET_URL() {
    return this.LOCAL_API_URL.replace(/\/api\/?$/, '');
  },
  get LIVE_SOCKET_URL() {
    return this.LIVE_API_URL.replace(/\/api\/?$/, '');
  },

  // ─── COMPUTED HELPERS ───────────────────────────────────────
  get API_BASE_URL() {
    return this.API_MODE === 'live' ? this.LIVE_API_URL : this.LOCAL_API_URL;
  },
  get SOCKET_URL() {
    return this.API_MODE === 'live' ? this.LIVE_SOCKET_URL : this.LOCAL_SOCKET_URL;
  },
  get IS_LIVE() {
    return this.API_MODE === 'live';
  },
};

export default CONFIG;