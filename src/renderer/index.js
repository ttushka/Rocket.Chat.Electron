import { setupErrorHandling } from '../errorHandling';
import i18n from '../i18n';
import { setupMainWindowStateHandling } from './mainWindow';
import attachEvents from './events';


const setup = async () => {
	setupErrorHandling('renderer');
	await i18n.initialize();
	setupMainWindowStateHandling();
	attachEvents();
};

setup();
