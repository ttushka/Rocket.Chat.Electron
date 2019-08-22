import { remote } from 'electron';
import React from 'react';
import ReactDOM from 'react-dom';
import { setupErrorHandling } from '../errorHandling';
import i18n from '../i18n';
import { App } from './components/App';
import { setupMainWindowStateHandling } from './mainWindow';


const { getGlobal } = remote;

const setup = async () => {
	setupErrorHandling('renderer');
	await i18n.initialize();
	setupMainWindowStateHandling();

	window.addEventListener('beforeunload', () => {
		try {
			ReactDOM.unmountComponentAtNode(document.getElementById('root'));
		} catch (error) {
			getGlobal('console').error(error);
		}
	});

	ReactDOM.render(<App />, document.getElementById('root'));
};

setup();
