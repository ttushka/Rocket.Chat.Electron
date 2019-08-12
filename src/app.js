import { setupErrorHandling } from './errorHandling';
import i18n from './i18n';
import { setupBasicAuthentication } from './scripts/basicAuth';
import { setupCertificates } from './scripts/certificates';
import { setupDeepLinks } from './scripts/deepLinks';
import attachEvents from './scripts/events';
import { setupMainWindowStateHandling } from './scripts/mainWindow';
import { setupSpellChecking } from './scripts/spellChecking';
import { setupUpdates } from './scripts/updates';


const setup = async () => {
	setupErrorHandling('renderer');
	await i18n.initialize();
	setupMainWindowStateHandling();
	attachEvents();
	setupBasicAuthentication();
	setupCertificates();
	setupDeepLinks();
	setupUpdates();
	setupSpellChecking();
};

setup();
