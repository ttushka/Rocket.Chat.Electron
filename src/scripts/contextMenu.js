import { remote } from 'electron';
import { t } from 'i18next';


const { getCurrentWindow, Menu } = remote;

let props = {};
let menu;

const createSpellCheckingMenuTemplate = ({
	isEditable,
	webContents,
	spellCheckingCorrections,
	spellCheckingDictionaries,
	onClickReplaceMispelling,
	onToggleSpellCheckingDictionary,
	onClickBrowseForSpellCheckLanguage,
}) => {
	if (!isEditable) {
		return [];
	}

	return [
		...(spellCheckingCorrections ? [
			...(spellCheckingCorrections.length === 0 ? (
				[
					{
						label: t('contextMenu.noSpellingSuggestions'),
						enabled: false,
					},
				]
			) : (
				spellCheckingCorrections.slice(0, 6).map((correction) => ({
					label: correction,
					click: onClickReplaceMispelling && onClickReplaceMispelling.bind(null, webContents, correction),
				}))
			)),
			...(spellCheckingCorrections.length > 6 ? [
				{
					label: t('contextMenu.moreSpellingSuggestions'),
					submenu: spellCheckingCorrections.slice(6).map((correction) => ({
						label: correction,
						click: onClickReplaceMispelling && onClickReplaceMispelling.bind(null, webContents, correction),
					})),
				},
			] : []),
			{
				type: 'separator',
			},
		] : []),
		{
			label: t('contextMenu.spellingLanguages'),
			enabled: spellCheckingDictionaries.length > 0,
			submenu: [
				...spellCheckingDictionaries.map(({ name, enabled }) => ({
					label: name,
					type: 'checkbox',
					checked: enabled,
					click: onToggleSpellCheckingDictionary && (({ checked }) => onToggleSpellCheckingDictionary(webContents, name, checked)),
				})),
				{
					type: 'separator',
				},
				{
					label: t('contextMenu.browseForLanguage'),
					click: onClickBrowseForSpellCheckLanguage && onClickBrowseForSpellCheckLanguage.bind(null, webContents),
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
	onClickSaveImageAs,
}) => (
	mediaType === 'image' ?
		[
			{
				label: t('contextMenu.saveImageAs'),
				click: onClickSaveImageAs && onClickSaveImageAs.bind(null, webContents, srcURL),
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
	webContents,
	onClickOpenLink,
	onClickCopyLinkText,
	onClickCopyLinkAddress,
}) => (
	linkURL ?
		[
			{
				label: t('contextMenu.openLink'),
				click: onClickOpenLink && onClickOpenLink.bind(null, webContents, linkURL, linkText),
			},
			{
				label: t('contextMenu.copyLinkText'),
				enabled: !!linkText,
				click: onClickCopyLinkText && onClickCopyLinkText.bind(null, webContents, linkURL, linkText),
			},
			{
				label: t('contextMenu.copyLinkAddress'),
				click: onClickCopyLinkAddress && onClickCopyLinkAddress.bind(null, webContents, linkURL, linkText),
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
	webContents,
	onClickUndo,
	onClickRedo,
	onClickCut,
	onClickCopy,
	onClickPaste,
	onClickSelectAll,
} = {}) => [
	{
		label: t('contextMenu.undo'),
		accelerator: 'CommandOrControl+Z',
		enabled: canUndo,
		click: onClickUndo && onClickUndo.bind(null, webContents),
	},
	{
		label: t('contextMenu.redo'),
		accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
		enabled: canRedo,
		click: onClickRedo && onClickRedo.bind(null, webContents),
	},
	{
		type: 'separator',
	},
	{
		label: t('contextMenu.cut'),
		accelerator: 'CommandOrControl+X',
		enabled: canCut,
		click: onClickCut && onClickCut.bind(null, webContents),
	},
	{
		label: t('contextMenu.copy'),
		accelerator: 'CommandOrControl+C',
		enabled: canCopy,
		click: onClickCopy && onClickCopy.bind(null, webContents),
	},
	{
		label: t('contextMenu.paste'),
		accelerator: 'CommandOrControl+V',
		enabled: canPaste,
		click: onClickPaste && onClickPaste.bind(null, webContents),
	},
	{
		label: t('contextMenu.selectAll'),
		accelerator: 'CommandOrControl+A',
		enabled: canSelectAll,
		click: onClickSelectAll && onClickSelectAll.bind(null, webContents),
	},
];

const createContextMenuTemplate = (props) => [
	...createSpellCheckingMenuTemplate(props),
	...createImageMenuTemplate(props),
	...createLinkMenuTemplate(props),
	...createDefaultMenuTemplate(props),
];

const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	const template = createContextMenuTemplate(props);
	menu = Menu.buildFromTemplate(template);
};

const trigger = () => {
	menu.popup({ window: getCurrentWindow() });
};

export default {
	setProps,
	trigger,
};
