import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { parse as parseURL, format as formatURL } from 'url';
import { reportError } from '../../../errorHandling';
import { readUserDataFile, readAppDataFile } from '../../userData';


const serversFileName = 'servers.json';
const hostsKey = 'rocket.chat.hosts';
const activeKey = 'rocket.chat.currentHost';
const sortingKey = 'rocket.chat.sortOrder';

const loadServers = async () => {
	let serversObject;

	try {
		serversObject = JSON.parse(localStorage.getItem(hostsKey)) || {};
	} catch (error) {
		serversObject = {};
	}

	if (typeof serversObject === 'string' && serversObject.match(/^https?:\/\//)) {
		serversObject = {
			[serversObject]: {
				url: serversObject,
				title: serversObject,
			},
		};
	}

	if (Array.isArray(serversObject)) {
		serversObject = serversObject.reduce((hosts, serverURL) => {
			serverURL = serverURL.replace(/\/$/, '');
			return {
				...hosts,
				[serverURL]: {
					url: serverURL,
					title: serverURL,
				},
			};
		}, {});
	}

	if (Object.keys(serversObject).length === 0) {
		for (const readFile of [readUserDataFile, readAppDataFile]) {
			try {
				serversObject = await readFile(serversFileName, 'json');
				if (typeof serversObject !== 'undefined') {
					break;
				}
			} catch (error) {
				reportError(error);
			}
		}

		if (serversObject === null || typeof serversObject !== 'object') {
			serversObject = {};
		}

		try {
			serversObject = Object.entries(serversObject)
				.reduce((hosts, [title, url]) => ({
					url,
					title,
				}), {});
		} catch (error) {
			reportError(error);
		}
	}

	const serverURLs = JSON.parse(localStorage.getItem(sortingKey)) || [];
	const activeServerURL = localStorage.getItem(activeKey);

	return Object.values(serversObject || {})
		.sort(({ url: a }, { url: b }) => serverURLs.indexOf(a) - serverURLs.indexOf(b))
		.map(({ url, title, ...serverProps }) => ({
			url,
			title: title || url,
			...serverProps,
			isActive: url === (activeServerURL === 'null' ? null : activeServerURL),
		}));
};

const saveServers = async (servers) => {
	localStorage.setItem('servers', JSON.stringify(servers));

	const serversObject = servers.reduce((serversObject, { url, isActive, ...serverProps }) => ({
		...serversObject,
		[url]: {
			url,
			...serverProps,
		},
	}), {});
	const serverURLs = servers.map(({ url }) => url);
	const activeServerURL = (servers.find(({ isActive }) => isActive) || {}).url;

	localStorage.setItem(hostsKey, JSON.stringify(serversObject));
	localStorage.setItem(sortingKey, JSON.stringify(serverURLs));
	if (activeServerURL) {
		localStorage.setItem(activeKey, activeServerURL);
	} else {
		localStorage.removeItem(activeKey);
	}
};

const useServersPersistence = (initialServers) => {
	const [servers, setServers] = useState(initialServers);

	useEffect(() => {
		saveServers(servers);
	}, [servers]);

	return [servers, setServers];
};

const ServersContext = createContext([]);

export const useServers = () => {
	const [servers] = useContext(ServersContext);
	return servers;
};

export const useActiveServer = () => {
	const [servers] = useContext(ServersContext);
	return useMemo(() => servers.find(({ isActive }) => isActive), [servers]);
};

export const useGlobalBadge = () => {
	const [servers] = useContext(ServersContext);

	return useMemo(() => {
		const badges = servers.map(({ badge }) => badge);

		const getMentionCount = () => badges
			.filter((badge) => Number.isInteger(badge))
			.reduce((sum, count) => sum + count, 0);

		const hasUnreadBadge = () => badges.some((badge) => !!badge);

		return getMentionCount() || (hasUnreadBadge() && '•') || null;
	}, [servers]);
};

export const useServersActions = () => {
	const [servers, setServers] = useContext(ServersContext);

	const setActiveServerURL = (serverURL) => {
		setServers(servers.map((server) => ({
			...server,
			isActive: server.url === serverURL,
		})));
	};

	const addServer = (serverURL) => {
		const server = {
			url: serverURL,
			title: serverURL,
			isActive: true,
		};

		const parsedUrl = parseURL(serverURL);
		const { auth } = parsedUrl;
		if (auth) {
			server.authUrl = serverURL;
			delete parsedUrl.auth;
			server.url = formatURL(parsedUrl);
			[server.username, server.password] = auth.split(':');
		}

		if (servers.some(({ url }) => url === server.url)) {
			setActiveServerURL(server.url);
			return;
		}

		setServers([
			...servers.map(({ isActive, ...server }) => ({ ...server, isActive: false })),
			server,
		]);
	};

	const removeServer = (serverURL) => {
		setServers(servers.filter(({ url }) => url !== serverURL));
	};

	const sortServers = (serverURLs) => {
		setServers(servers.sort(({ url: a }, { url: b }) => serverURLs.indexOf(a) - serverURLs.indexOf(b)));
	};

	const setServerProperties = (serverURL, props) => {
		setServers(servers.map((server) => {
			if (server.url !== serverURL) {
				return server;
			}

			const newServer = {
				...server,
				...props,
			};

			if (newServer.title === 'Rocket.Chat' && /https?:\/\/open\.rocket\.chat/.test(serverURL) === false) {
				newServer.title = `${ newServer.title } - ${ serverURL }`;
			}

			return newServer;
		}));
	};

	return useMemo(() => ({
		addServer,
		removeServer,
		sortServers,
		setServerProperties,
		setActiveServerURL,
	}), [servers]);
};

export const useServerValidation = () => async (serverURL, timeout = 2000) => {
	const headers = new Headers();

	if (serverURL.includes('@')) {
		const url = new URL(serverURL);
		serverURL = url.origin;
		headers.set('Authorization', `Basic ${ btoa(`${ url.username }:${ url.password }`) }`);
	}

	const response = await Promise.race([
		fetch(`${ serverURL }/api/info`, { headers }),
		new Promise((resolve, reject) => setTimeout(() => reject('timeout'), timeout)),
	]);

	if (!response.ok) {
		throw 'invalid';
	}
};

export const ServersProvider = React.lazy(async () => {
	const loadedServers = await loadServers();

	function ServersProvider({ children }) {
		const contextValue = useServersPersistence(loadedServers);

		return <ServersContext.Provider value={contextValue}>
			{children}
		</ServersContext.Provider>;
	}

	return { default: ServersProvider };
});
