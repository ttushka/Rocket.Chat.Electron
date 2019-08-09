import { start } from './scripts/start';
import { setupErrorHandling } from './errorHandling';
import { setupMainWindowStateHandling } from './scripts/mainWindow';


setupErrorHandling('renderer');
setupMainWindowStateHandling();
start();
