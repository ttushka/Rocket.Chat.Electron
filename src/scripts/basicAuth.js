import { remote } from 'electron';
import servers from './servers';


export const setupBasicAuthentication = () => {
	remote.app.on('login', (event, webContents, request, authInfo, callback) => {
		for (const url of Object.keys(servers.hosts)) {
			const server = servers.hosts[url];
			if (request.url.indexOf(url) === 0 && server.username) {
				callback(server.username, server.password);
				return;
			}
		}
		callback(null, null);
	});
};
