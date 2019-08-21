import { remote } from 'electron';
import { getServers } from './servers';


const { app } = remote;

const handleLogin = (event, webContents, request, authInfo, callback) => {
	const server = getServers().find(({ url, username }) => request.url.indexOf(url) === 0 && username);

	if (server) {
		callback(server.username, server.password);
		return;
	}

	callback(null, null);
};

const setupBasicAuthentication = () => {
	app.addListener('login', handleLogin);

	window.addEventListener('beforeunload', () => {
		app.removeListener('login', handleLogin);
	}, false);
};

let mounted = false;

const setProps = () => {
	if (mounted) {
		return;
	}

	setupBasicAuthentication();
	mounted = true;
};

export default {
	setProps,
};
