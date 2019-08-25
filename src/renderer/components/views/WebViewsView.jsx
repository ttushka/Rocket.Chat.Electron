import React, { useEffect, useMemo } from 'react';
import webview from '../../webview';
import contextMenu from '../../contextMenu';
import {
	getEnabledSpellCheckingDictionaries,
	getSpellCheckingCorrections,
	getSpellCheckingDictionaries,
	getSpellCheckingDictionariesPath,
	installSpellCheckingDictionaries,
	setSpellCheckingDictionaryEnabled,
	setupSpellChecking,
} from '../../spellChecking';
import { showOpenDialog, showErrorBox } from '../../dialogs';
import { useTranslation } from 'react-i18next';
import { reportError } from '../../../errorHandling';
import { shell, clipboard } from 'electron';
import { useServers, useServersActions } from '../services/ServersProvider';
import { usePreferences } from '../services/PreferencesProvider';
import { useSetFocusedWebContents, useFocusedWebContents } from '../services/FocusedWebContentsHolder';
import { useSetOpenModal } from '../services/OpenModalState';
import { useActivateMainWindow, useMainWindow } from '../MainWindow';
import { useSetOpenView } from '../services/OpenViewState';


const Markup = React.memo(() =>
	<div className='webviews' />
);
Markup.displayName = 'Markup';

export const useReloadWebView = () => webview.reload;

export const useOpenDevToolsForWebView = () => webview.openDevTools;

export const useFormatButtonOnWebView = () => webview.format;

export const WebViewsView = React.lazy(async () => {
	await setupSpellChecking();

	function WebViewsView(props) {
		const servers = useServers();
		const activeServerURL = useMemo(() => (servers.find(({ isActive }) => isActive) || {}).url, [servers]);
		const { isSideBarVisible } = usePreferences();
		const { setServerProperties, setActiveServerURL } = useServersActions();
		const setFocusedWebContents = useSetFocusedWebContents();
		const setOpenModal = useSetOpenModal();
		const activateMainWindow = useActivateMainWindow();
		const setOpenView = useSetOpenView();
		const focusedWebContents = useFocusedWebContents();
		const mainWindow = useMainWindow();

		const { t } = useTranslation();

		useEffect(() => {
			webview.setProps({
				servers,
				activeServerURL,
				hasSideBarPadding: !isSideBarVisible,
				...props,
				onContextMenu: (serverURL, webContents, params) => {
					contextMenu.setProps({
						webContents,
						...params,
						spellCheckingCorrections: getSpellCheckingCorrections(params.selectionText),
						spellCheckingDictionaries: getSpellCheckingDictionaries().map((name) => ({
							name,
							enabled: getEnabledSpellCheckingDictionaries().includes(name),
						})),
						onClickReplaceMispelling: (webContents, correction) => {
							webContents.replaceMisspelling(correction);
						},
						onToggleSpellCheckingDictionary: (webContents, name, isEnabled) => {
							setSpellCheckingDictionaryEnabled(name, isEnabled);
						},
						onClickBrowseForSpellCheckLanguage: async () => {
							const { filePaths } = await showOpenDialog({
								title: t('dialog.loadDictionary.title'),
								defaultPath: getSpellCheckingDictionariesPath(),
								filters: [
									{ name: t('dialog.loadDictionary.dictionaries'), extensions: ['aff', 'dic'] },
									{ name: t('dialog.loadDictionary.allFiles'), extensions: ['*'] },
								],
								properties: ['openFile', 'multiSelections'],
							});

							try {
								await installSpellCheckingDictionaries(filePaths);
							} catch (error) {
								reportError(error);
								showErrorBox(
									t('dialog.loadDictionaryError.title'),
									t('dialog.loadDictionaryError.message', { message: error.message })
								);
							}
						},
						onClickSaveImageAs: (webContents, url) => {
							webContents.downloadURL(url);
						},
						onClickOpenLink: (webContents, url) => {
							shell.openExternal(url);
						},
						onClickCopyLinkText: (webContents, url, text) => {
							clipboard.write({ text, bookmark: text });
						},
						onClickCopyLinkAddress: (webContents, url, text) => {
							clipboard.write({ text: url, bookmark: text });
						},
						onClickUndo: (webContents) => {
							webContents.undo();
						},
						onClickRedo: (webContents) => {
							webContents.redo();
						},
						onClickCut: (webContents) => {
							webContents.cut();
						},
						onClickCopy: (webContents) => {
							webContents.copy();
						},
						onClickPaste: (webContents) => {
							webContents.paste();
						},
						onClickSelectAll: (webContents) => {
							webContents.selectAll();
						},
					});
					contextMenu.trigger();
				},
				onBadgeChange: (serverURL, badge) => {
					setServerProperties(serverURL, { badge });
				},
				onBlur: () => {
					setFocusedWebContents(mainWindow.webContents);
				},
				onFocus: (serverURL, webContents) => {
					setFocusedWebContents(webContents);
				},
				onRequestScreenSharing: () => {
					setOpenModal('screenSharing');
				},
				onSideBarStyleChange: (serverURL, style) => {
					setServerProperties(serverURL, { style });
				},
				onRequestFocus: (serverURL) => {
					activateMainWindow();
					setActiveServerURL(serverURL);
					setOpenView('webViews');
					setFocusedWebContents(focusedWebContents);
					focusedWebContents.focus();
				},
				onTitleChange: (serverURL, title) => {
					setServerProperties(serverURL, { title });
				},
				onNavigate: (serverURL, url) => {
					setServerProperties(serverURL, { lastPath: url });
				},
			});
		});

		return <Markup />;
	}

	return { default: WebViewsView };
});
