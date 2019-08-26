import React from 'react';
import { Server } from './Server';
import { Container } from './styles';
import { useEffect, useState } from 'react';
import { useServers, useServersActions } from '../../services/ServersProvider';


export const useShortcuts = () => {
	const [shortcutsVisible, setShortcutsVisible] = useState(false);

	useEffect(() => {
		const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';

		const onShortcutKeyDown = ({ key }) => {
			key === shortcutKey && setShortcutsVisible(true);
		};

		const onShortcutKeyUp = ({ key }) => {
			key === shortcutKey && setShortcutsVisible(false);
		};

		window.addEventListener('keydown', onShortcutKeyDown);
		window.addEventListener('keyup', onShortcutKeyUp);
		return () => {
			window.removeEventListener('keydown', onShortcutKeyDown);
			window.removeEventListener('keyup', onShortcutKeyUp);
		};
	}, []);

	return shortcutsVisible;
};

export const useSortableServers = () => {
	const propServers = useServers();
	const { sortServers } = useServersActions();

	const handleSort = (serverURLs) => {
		sortServers(serverURLs);
	};

	const [dragged, setDragged] = useState(null);
	const [servers, setServers] = useState(propServers);

	useEffect(() => {
		setServers(propServers);
	}, [propServers]);

	const handleDragStart = (url, event) => {
		setDragged(url);

		event.dataTransfer.dropEffect = 'move';
		event.dataTransfer.effectAllowed = 'move';
	};

	const handleDragEnd = () => {
		setDragged(null);
	};

	const handleDragEnter = (targetUrl) => {
		const draggedServerIndex = servers.findIndex(({ url }) => url === dragged);
		const targetServerIndex = servers.findIndex(({ url }) => url === targetUrl);

		setServers(servers.map((server, i) => (
			(i === draggedServerIndex && servers[targetServerIndex]) ||
			(i === targetServerIndex && servers[draggedServerIndex]) ||
			server
		)));
	};

	const handleDragOver = (event) => {
		event.preventDefault();
	};

	const handleDrop = (event) => {
		event.preventDefault();
		handleSort(servers.map(({ url }) => url));
	};

	return {
		servers,
		dragged,
		handleDragStart,
		handleDragEnd,
		handleDragEnter,
		handleDragOver,
		handleDrop,
	};
};

export function ServerList() {
	const {
		servers,
		dragged,
		handleDragStart,
		handleDragEnd,
		handleDragEnter,
		handleDragOver,
		handleDrop,
	} = useSortableServers();

	const shortcutsVisible = useShortcuts();

	return (
		<Container>
			{servers.map((server, order) => (
				<Server
					key={order}
					url={server.url}
					title={server.title}
					badge={server.badge}
					order={order}
					active={server.isActive}
					dragged={server.url === dragged}
					shortcut={shortcutsVisible}
					onDragStart={handleDragStart.bind(null, server.url)}
					onDragEnd={handleDragEnd}
					onDragEnter={handleDragEnter.bind(null, server.url)}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
				/>
			))}
		</Container>
	);
}
