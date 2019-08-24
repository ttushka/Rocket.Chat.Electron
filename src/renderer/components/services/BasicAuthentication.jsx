import { remote } from 'electron';
import { useServers } from './ServersProvider';
import { useEventListener } from '../../hooks/useEventListener';


const { app } = remote;

export function BasicAuthentication() {
	const servers = useServers();

	const handleLogin = (event, webContents, request, authInfo, callback) => {
		const server = servers.find(({ url, username }) => request.url.indexOf(url) === 0 && username);

		if (server) {
			callback(server.username, server.password);
			return;
		}

		callback(null, null);
	};

	useEventListener(app, 'login', handleLogin);

	return null;
}
