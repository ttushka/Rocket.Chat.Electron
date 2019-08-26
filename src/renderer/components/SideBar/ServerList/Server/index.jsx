import { remote } from 'electron';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parse as parseURL } from 'url';
import { useServersActions } from '../../../services/ServersProvider';
import { useSetOpenView } from '../../../services/OpenViewState';
import { useReloadWebView, useOpenDevToolsForWebView } from '../../../views/WebViewsView';
import { useMainWindow } from '../../../MainWindow';
import { Tooltip } from '../../styles';
import {
	Outer,
	Inner,
	Initials,
	Indicator,
	Favicon,
	Badge,
	Shortcut,
} from './styles';


const { Menu } = remote;

export const useHasUnreadMessages = (badge) => useMemo(() => !!badge, [badge]);

export const useMentionCount = (badge) => useMemo(() => (
	[badge].filter((badge) => parseInt(badge, 10)).filter(Number.isInteger)[0]
), [badge]);

export const useInitials = (url, title) => useMemo(() => (
	title
		.replace(url, parseURL(url).hostname)
		.split(/[^A-Za-z0-9]+/g)
		.slice(0, 2)
		.map((text) => text.slice(0, 1).toUpperCase())
		.join('')
), [url, title]);

export const useFavicon = (serverUrl) => {
	const url = useMemo(() => {
		const faviconCacheBustingTime = 15 * 60 * 1000;
		const bustingParam = Math.round(Date.now() / faviconCacheBustingTime);
		return `${ serverUrl.replace(/\/$/, '') }/assets/favicon.svg?_=${ bustingParam }`;
	}, [serverUrl]);

	const [loaded, setLoaded] = useState(false);

	const handleLoad = () => {
		setLoaded(true);
	};

	const handleError = () => {
		setLoaded(false);
	};

	return [url, loaded, handleLoad, handleError];
};

export const useSelection = (url) => {
	const setOpenView = useSetOpenView();
	const { setActiveServerURL } = useServersActions();

	const handleSelect = useCallback(() => {
		setOpenView('webViews');
		setActiveServerURL(url);
	}, [url]);

	return handleSelect;
};

export const useContextMenu = (url) => {
	const mainWindow = useMainWindow();
	const reloadWebView = useReloadWebView();
	const openDevToolsForWebView = useOpenDevToolsForWebView();
	const { removeServer } = useServersActions();

	const { t } = useTranslation();

	const handleContextMenu = (event) => {
		event.preventDefault();

		const onClickReload = () => {
			reloadWebView(url);
		};

		const onClickRemove = () => {
			removeServer(url);
		};

		const onClickOpenDevTools = () => {
			openDevToolsForWebView(url);
		};

		const template = [
			{
				label: t('sidebar.item.reload'),
				click: onClickReload,
			},
			{
				label: t('sidebar.item.remove'),
				click: onClickRemove,
			},
			{
				label: t('sidebar.item.openDevTools'),
				click: onClickOpenDevTools,
			},
		];

		const menu = Menu.buildFromTemplate(template);
		menu.popup(mainWindow);
	};

	return [handleContextMenu];
};


export function Server({
	url,
	title = url,
	badge,
	order,
	active,
	dragged,
	shortcut,
	...props
}) {
	const hasUnreadMessages = useHasUnreadMessages(badge);
	const mentionCount = useMentionCount(badge);
	const initials = useInitials(url, title);
	const [faviconUrl, faviconLoaded, handleFaviconLoad, handleFaviconError] = useFavicon(url);
	const handleSelect = useSelection(url);
	const [handleContextMenu] = useContextMenu(url);

	return <Outer
		draggable="true"
		onClick={handleSelect}
		onContextMenu={handleContextMenu}
		{...props}
	>
		<Indicator
			active={active}
			unread={hasUnreadMessages}
		/>
		<Inner>
			<Initials
				active={active}
				faviconLoaded={faviconLoaded}
				shortcut={shortcut}
			>
				{initials}
			</Initials>

			<Favicon
				active={active}
				draggable="false"
				faviconLoaded={faviconLoaded}
				shortcut={shortcut}
				src={faviconUrl}
				onLoad={handleFaviconLoad}
				onError={handleFaviconError}
			/>

			{mentionCount && (
				<Badge>
					{mentionCount}
				</Badge>
			)}

			{order <= 9 && (
				<Shortcut visible={shortcut}>
					{`${ process.platform === 'darwin' ? '⌘' : '^' }${ order + 1 }`}
				</Shortcut>
			)}
		</Inner>

		<Tooltip>
			{title}
		</Tooltip>
	</Outer>;
}
