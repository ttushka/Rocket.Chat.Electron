import { remote } from 'electron';
import servers from './servers';


const { app } = remote;

const handleLogin = (event, webContents, request, authInfo, callback) => {
	for (const url of Object.keys(servers.hosts)) {
		const server = servers.hosts[url];
		if (request.url.indexOf(url) === 0 && server.username) {
			callback(server.username, server.password);
			return;
		}
	}
	callback(null, null);
};

export const setupBasicAuthentication = () => {
	app.addListener('login', handleLogin);

	window.addEventListener('beforeunload', () => {
		app.removeListener('login', handleLogin);
	}, false);
};
