import { clipboard, remote, shell } from 'electron';
import i18n from '../i18n';
import {
	getSpellCheckingCorrections,
	installSpellCheckingDictionaries,
	getSpellCheckingDictionariesPath,
	getSpellCheckingDictionaries,
	getEnabledSpellCheckingDictionaries,
	setSpellCheckingDictionaryEnabled,
} from './spellChecking';
const { dialog, getCurrentWindow } = remote;


const createSpellCheckingMenuTemplate = ({
	isEditable,
	selectionText,
	webContents,
}) => {
	if (!isEditable) {
		return [];
	}

	const corrections = getSpellCheckingCorrections(selectionText);

	const handleBrowserForLanguage = () => {
		const callback = async (filePaths) => {
			try {
				await installSpellCheckingDictionaries(filePaths);
			} catch (error) {
				console.error(error);
				dialog.showErrorBox(
					i18n.__('dialog.loadDictionaryError.title'),
					i18n.__('dialog.loadDictionaryError.message', { message: error.message })
				);
			}
		};

		dialog.showOpenDialog(getCurrentWindow(), {
			title: i18n.__('dialog.loadDictionary.title'),
			defaultPath: getSpellCheckingDictionariesPath(),
			filters: [
				{ name: i18n.__('dialog.loadDictionary.dictionaries'), extensions: ['aff', 'dic'] },
				{ name: i18n.__('dialog.loadDictionary.allFiles'), extensions: ['*'] },
			],
			properties: ['openFile', 'multiSelections'],
		}, callback);
	};

	return [
		...(corrections ? [
			...(corrections.length === 0 ? (
				[
					{
						label: i18n.__('contextMenu.noSpellingSuggestions'),
						enabled: false,
					},
				]
			) : (
				corrections.slice(0, 6).map((correction) => ({
					label: correction,
					click: () => webContents.replaceMisspelling(correction),
				}))
			)),
			...(corrections.length > 6 ? [
				{
					label: i18n.__('contextMenu.moreSpellingSuggestions'),
					submenu: corrections.slice(6).map((correction) => ({
						label: correction,
						click: () => webContents.replaceMisspelling(correction),
					})),
				},
			] : []),
			{
				type: 'separator',
			},
		] : []),
		{
			label: i18n.__('contextMenu.spellingLanguages'),
			enabled: getSpellCheckingDictionaries().length > 0,
			submenu: [
				...getSpellCheckingDictionaries().map((dictionaryName) => ({
					label: dictionaryName,
					type: 'checkbox',
					checked: getEnabledSpellCheckingDictionaries().includes(dictionaryName),
					click: ({ checked }) => setSpellCheckingDictionaryEnabled(dictionaryName, checked),
				})),
				{
					type: 'separator',
				},
				{
					label: i18n.__('contextMenu.browseForLanguage'),
					click: handleBrowserForLanguage,
				},
			],
		},
		{
			type: 'separator',
		},
	];
};

const createImageMenuTemplate = ({
	mediaType,
	srcURL,
	webContents,
}) => (
	mediaType === 'image' ?
		[
			{
				label: i18n.__('contextMenu.saveImageAs'),
				click: () => webContents.downloadURL(srcURL),
			},
			{
				type: 'separator',
			},
		] :
		[]
);

const createLinkMenuTemplate = ({
	linkURL,
	linkText,
}) => (
	linkURL ?
		[
			{
				label: i18n.__('contextMenu.openLink'),
				click: () => shell.openExternal(linkURL),
			},
			{
				label: i18n.__('contextMenu.copyLinkText'),
				click: () => clipboard.write({ text: linkText, bookmark: linkText }),
				enabled: !!linkText,
			},
			{
				label: i18n.__('contextMenu.copyLinkAddress'),
				click: () => clipboard.write({ text: linkURL, bookmark: linkText }),
			},
			{
				type: 'separator',
			},
		] :
		[]
);

const createDefaultMenuTemplate = ({
	editFlags: {
		canUndo = false,
		canRedo = false,
		canCut = false,
		canCopy = false,
		canPaste = false,
		canSelectAll = false,
	} = {},
} = {}) => [
	{
		label: i18n.__('contextMenu.undo'),
		role: 'undo',
		accelerator: 'CommandOrControl+Z',
		enabled: canUndo,
	},
	{
		label: i18n.__('contextMenu.redo'),
		role: 'redo',
		accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
		enabled: canRedo,
	},
	{
		type: 'separator',
	},
	{
		label: i18n.__('contextMenu.cut'),
		role: 'cut',
		accelerator: 'CommandOrControl+X',
		enabled: canCut,
	},
	{
		label: i18n.__('contextMenu.copy'),
		role: 'copy',
		accelerator: 'CommandOrControl+C',
		enabled: canCopy,
	},
	{
		label: i18n.__('contextMenu.paste'),
		role: 'paste',
		accelerator: 'CommandOrControl+V',
		enabled: canPaste,
	},
	{
		label: i18n.__('contextMenu.selectAll'),
		role: 'selectall',
		accelerator: 'CommandOrControl+A',
		enabled: canSelectAll,
	},
];

export const createContextMenuTemplate = (params) => [
	...createSpellCheckingMenuTemplate(params),
	...createImageMenuTemplate(params),
	...createLinkMenuTemplate(params),
	...createDefaultMenuTemplate(params),
];
