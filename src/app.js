import { setupErrorHandling } from './errorHandling';
import { setupBasicAuthentication } from './scripts/basicAuth';
import { setupCertificates } from './scripts/certificates';
import { setupDeepLinks } from './scripts/deepLinks';
import { setupMainWindowStateHandling } from './scripts/mainWindow';
import { setupSpellChecking } from './scripts/spellChecking';
import { start } from './scripts/start';
import { setupUpdates } from './scripts/updates';


setupErrorHandling('renderer');
setupMainWindowStateHandling();
setupBasicAuthentication();
setupCertificates();
setupDeepLinks();
setupUpdates();
setupSpellChecking();
start();
