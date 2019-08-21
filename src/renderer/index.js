import { setupErrorHandling } from '../errorHandling';
import i18n from '../i18n';
import attachEvents from './events';
import { setupMainWindowStateHandling } from './mainWindow';


const setup = async () => {
	setupErrorHandling('renderer');
	await i18n.initialize();
	setupMainWindowStateHandling();
	attachEvents();
};

setup();
