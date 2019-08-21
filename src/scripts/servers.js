import jetpack from 'fs-jetpack';
import { remote } from 'electron';


const hostsKey = 'rocket.chat.hosts';
const activeKey = 'rocket.chat.currentHost';

let props = {
	onUpdate: null,
};

class Servers {
	get hosts() {
		return this._hosts;
	}

	set hosts(hosts) {
		this._hosts = hosts;
		this.save();
		return true;
	}

	load() {
		let hosts = localStorage.getItem(hostsKey);

		try {
			hosts = JSON.parse(hosts);
		} catch (e) {
			if (typeof hosts === 'string' && hosts.match(/^https?:\/\//)) {
				hosts = {};
				hosts[hosts] = {
					title: hosts,
					url: hosts,
				};
			}

			localStorage.setItem(hostsKey, JSON.stringify(hosts));
		}

		if (hosts === null) {
			hosts = {};
		}

		if (Array.isArray(hosts)) {
			const oldHosts = hosts;
			hosts = {};
			oldHosts.forEach(function(item) {
				item = item.replace(/\/$/, '');
				hosts[item] = {
					title: item,
					url: item,
				};
			});
			localStorage.setItem(hostsKey, JSON.stringify(hosts));
		}

		// Load server info from server config file
		if (Object.keys(hosts).length === 0) {
			const { app } = remote;
			const userDir = jetpack.cwd(app.getPath('userData'));
			const appDir = jetpack.cwd(jetpack.path(app.getAppPath(), app.getAppPath().endsWith('.asar') ? '..' : '.'));
			const path = (userDir.find({ matching: 'servers.json', recursive: false })[0] && userDir.path('servers.json')) ||
				(appDir.find({ matching: 'servers.json', recursive: false })[0] && appDir.path('servers.json'));

			if (path) {
				try {
					const result = jetpack.read(path, 'json');
					if (result) {
						hosts = {};
						Object.keys(result).forEach((title) => {
							const url = result[title];
							hosts[url] = { title, url };
						});
						localStorage.setItem(hostsKey, JSON.stringify(hosts));
						// Assume user doesn't want sidebar if they only have one server
						if (Object.keys(hosts).length === 1) {
							localStorage.setItem('sidebar-closed', 'true');
						}
					}

				} catch (e) {
					console.error('Server file invalid');
				}
			}
		}

		this._hosts = hosts;
		this.setActive(this.active);

		const { onUpdate } = props;
		onUpdate && onUpdate();
	}

	save() {
		localStorage.setItem(hostsKey, JSON.stringify(this._hosts));
	}

	addHost(hostUrl) {
		const { hosts } = this;

		const match = hostUrl.match(/^(https?:\/\/)([^:]+):([^@]+)@(.+)$/);
		let username;
		let password;
		let authUrl;
		if (match) {
			authUrl = hostUrl;
			hostUrl = match[1] + match[4];
			username = match[2];
			password = match[3];
		}

		if (this._hosts[hostUrl] === true) {
			this.setActive(hostUrl);
			return false;
		}

		hosts[hostUrl] = {
			title: hostUrl,
			url: hostUrl,
			authUrl,
			username,
			password,
		};
		this.hosts = hosts;

		const { onUpdate } = props;
		onUpdate && onUpdate(hostUrl);

		return hostUrl;
	}

	removeHost(hostUrl) {
		const { hosts } = this;
		if (hosts[hostUrl]) {
			delete hosts[hostUrl];
			this.hosts = hosts;

			if (this.active === hostUrl) {
				this.clearActive();
			}
			const { onUpdate } = props;
			onUpdate && onUpdate(hostUrl);
		}
	}

	get active() {
		const active = localStorage.getItem(activeKey);
		return active === 'null' ? null : active;
	}

	setActive(hostUrl) {
		let url;
		if (this._hosts[hostUrl]) {
			url = hostUrl;
		} else if (Object.keys(this._hosts).length > 0) {
			url = Object.keys(this._hosts)[0];
		}

		if (url) {
			localStorage.setItem(activeKey, hostUrl);
			const { onUpdate } = props;
			onUpdate && onUpdate(url);
			return true;
		}
		const { onUpdate } = props;
		onUpdate && onUpdate();
		return false;
	}

	clearActive() {
		localStorage.removeItem(activeKey);
		const { onUpdate } = props;
		onUpdate && onUpdate();
		return true;
	}
}

const instance = new Servers();

let mounted = false;
const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	if (mounted) {
		return;
	}

	instance.load();
	mounted = true;
};

export default Object.assign(instance, {
	setProps,
});

export const getServers = () => {
	const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];

	return Object.values(instance.hosts)
		.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b))
		.map(({ title, url }) => ({ title, url }));
};

export const getActiveServerURL = () => instance.active;

export const setActiveServerURL = (serverURL) => instance.setActive(serverURL);

export const setServerProperties = (serverURL, props) => {
	const server = instance.hosts[serverURL];
	const newServer = {
		...server,
		...props,
	};

	if (newServer.title === 'Rocket.Chat' && /https?:\/\/open\.rocket\.chat/.test(serverURL) === false) {
		newServer.title = `${ newServer.title } - ${ serverURL }`;
	}

	instance.hosts[serverURL] = newServer;

	const { onUpdate } = props;
	onUpdate && onUpdate();
};

export const addServer = (serverURL) => {
	const resolvedServerURL = instance.addHost(serverURL);

	if (!resolvedServerURL) {
		return;
	}

	instance.setActive(resolvedServerURL);

	return resolvedServerURL;
};

export const removeServer = (serverURL) => {
	instance.removeHost(serverURL);
};

export const sortServers = (serverURLs) => {
	localStorage.setItem('rocket.chat.sortOrder', JSON.stringify(serverURLs));
	const { onUpdate } = props;
	onUpdate && onUpdate();
};

export const validateServerURL = async (serverURL, timeout = 2000) => {
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
