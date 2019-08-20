import { setupErrorHandling } from './errorHandling';
import i18n from './i18n';
import attachEvents from './scripts/events';
import { setupMainWindowStateHandling } from './scripts/mainWindow';


const setup = async () => {
	setupErrorHandling('renderer');
	await i18n.initialize();
	setupMainWindowStateHandling();
	attachEvents();
};

setup();
