import { ipcRenderer } from 'electron';
import { setupErrorHandling } from './errorHandling';
import i18n from './i18n';
import setupEventsPreload from './preload/events';
import setupFormatPreload from './preload/format';
import setupJitsiPreload from './preload/jitsi';
import setupLinksPreload from './preload/links';
import setupNotificationsPreload from './preload/notifications';
import setupSidebarPreload from './preload/sidebar';
import setupSpellCheckingPreload from './preload/spellChecking';
import setupTitleChangePreload from './preload/titleChange';
import setupUserPresencePreload from './preload/userPresence';


setupErrorHandling('preload');
setupEventsPreload();
setupFormatPreload();
setupJitsiPreload();
setupLinksPreload();
setupNotificationsPreload();
setupSidebarPreload();
setupSpellCheckingPreload();
setupTitleChangePreload();
setupUserPresencePreload();

window.reloadServer = () => ipcRenderer.sendToHost('reload-server');
window.i18n = i18n;
