import { useEffect, useMemo } from 'react';
import { remote } from 'electron';
import { t } from 'i18next';
import { useServers, useActiveServer } from './services/ServersProvider';


const { TouchBar: ElectronTouchBar, nativeImage, getCurrentWindow } = remote;
const { TouchBarButton, TouchBarLabel, TouchBarSegmentedControl, TouchBarScrubber, TouchBarPopover, TouchBarGroup } = ElectronTouchBar;

let props = {
	servers: [],
	activeServerURL: null,
	onTouchServer: null,
};

class SelectServerPanel {
	constructor() {
		this._MAX_LENGTH_FOR_SEGMENTS_CONTROL = 76 - t('touchBar.selectServer').length;
		this._setHostsArray();
	}

	_isSegmentedControl() {
		return this.control && this.control.hasOwnProperty('selectedIndex');
	}

	_getActiveServerIndex() {
		return this._hosts.findIndex((value) => value.host === props.activeServerURL);
	}

	_setHostsArray() {
		this._hosts = Object.values(props.servers).map((value) => ({ label: value.title, host: value.url }));
		this._hosts = this._trimHostsNames(this._hosts);
	}

	_getTotalLengthOfHostsNames() {
		return this._hosts.reduce((acc, host) => acc + host.label.length, 0);
	}

	_update() {
		this._setHostsArray();
		if (this.control) {
			if (this._isSegmentedControl()) {
				this.control.segments = this._hosts;
				this.control.selectedIndex = this._getActiveServerIndex();
			} else {
				this.control.items = this._hosts;
			}
		} else {
			this.build();
		}
	}

	build() {
		const popoverItems = this._buildSelectServersPopoverItems();

		this.touchBarPopover = new TouchBarPopover({
			label: t('touchBar.selectServer'),
			items: new ElectronTouchBar({
				items: popoverItems,
			}),
		});
		return this.touchBarPopover;
	}

	_buildSelectServersPopoverItems() {
		const items = [
			new TouchBarLabel({ label: t('touchBar.selectServer') }),
		];

		// The maximum length of available display area is limited. If exceed the length of displayed data, then
		// touchbar element is not displayed. If the length of displayed host names exceeds the limit, then
		// the touchBarScrubber is used. In other case SegmentedControl is used.
		const hostsNamesLength = this._getTotalLengthOfHostsNames();

		if (this._hosts.length) {
			if (hostsNamesLength <= this._MAX_LENGTH_FOR_SEGMENTS_CONTROL) {
				items.push(this._buildTouchBarSegmentedControl());
			} else {
				items.push(this._buildTouchBarScrubber());
			}
		}
		return items;
	}

	_buildTouchBarSegmentedControl() {
		this.control = new TouchBarSegmentedControl({
			segmentStyle: 'separated',
			selectedIndex: this._getActiveServerIndex(),
			segments: this._hosts,
			change: (index) => {
				const { onTouchServer } = props;
				onTouchServer && onTouchServer(this._hosts[index].host);
			},
		});
		return this.control;
	}

	_buildTouchBarScrubber() {
		this.control = new TouchBarScrubber({
			selectedStyle: 'background',
			showArrowButtons: true,
			mode: 'fixed',
			items: this._hosts,
			highlight: (index) => {
				const { onTouchServer } = props;
				onTouchServer && onTouchServer(this._hosts[index].host);
			},
		});
		return this.control;
	}

	/**
	 * If it is possible to fit the hosts names to the specific limit, then trim the hosts names to the format "open.rocke.."
	 * @param arr {Array} array of hosts
	 * @returns {Array} array of hosts
	 */
	_trimHostsNames(arr) {
		const hostsNamesLength = this._getTotalLengthOfHostsNames();

		if (hostsNamesLength <= this._MAX_LENGTH_FOR_SEGMENTS_CONTROL) {
			return arr;
		}

		// The total length of hosts names with reserved space for '..' characters
		const amountOfCharsToDisplay = this._MAX_LENGTH_FOR_SEGMENTS_CONTROL - 2 * arr.length;
		const amountOfCharsPerHost = Math.floor(amountOfCharsToDisplay / arr.length);

		if (amountOfCharsPerHost > 0) {
			let additionChars = amountOfCharsToDisplay % arr.length;
			return arr.map((host) => {
				if (amountOfCharsPerHost < host.label.length) {
					let additionChar = 0;
					if (additionChars) {
						additionChar = 1;
						additionChars--;
					}
					host.label = `${ host.label.slice(0, amountOfCharsPerHost + additionChar) }..`;
				}
				return host;
			});
		}
		return arr;
	}
}

class FormattingPanel {
	constructor() {
		this._buttonClasses = ['bold', 'italic', 'strike', 'code', 'multi-line'];
		this._BACKGROUND_COLOR = '#A4A4A4';
	}

	build() {
		const formatButtons = [];

		this._buttonClasses.forEach((buttonClass) => {
			const touchBarButton = new TouchBarButton({
				backgroundColor: this._BACKGROUND_COLOR,
				icon: nativeImage.createFromPath(`${ __dirname }/images/icon-${ buttonClass }.png`),
				click: () => {
					const { onTouchFormattingButton } = props;
					onTouchFormattingButton && onTouchFormattingButton(buttonClass);
				},
			});
			formatButtons.push(touchBarButton);
		});

		this._touchBarGroup = new TouchBarGroup({
			items: [
				new TouchBarLabel({ label: t('touchBar.formatting') }),
				...formatButtons,
			],
		});
		return this._touchBarGroup;
	}
}

class TouchBarBuilder {
	constructor() {
		this._touchBarElements = {};
	}

	build() {
		this._touchBar = new ElectronTouchBar({
			items: Object.values(this._touchBarElements).map((element) => element.build()),
		});
		return this._touchBar;
	}

	addSelectServerPanel(panel) {
		if (this._isPanel(panel)) {
			this._touchBarElements.selectServerPanel = panel;
		}
		return this;
	}

	addFormattingPanel(panel) {
		if (this._isPanel(panel)) {
			this._touchBarElements.formattingtPanel = panel;
		}
		return this;
	}

	_isPanel(panel) {
		return panel && typeof panel.build === 'function';
	}
}

const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	const touchBar = new TouchBarBuilder()
		.addSelectServerPanel(new SelectServerPanel())
		.addFormattingPanel(new FormattingPanel())
		.build();
	getCurrentWindow().setTouchBar(touchBar);
};

export function TouchBar(props) {
	const servers = useServers();
	const activeServer = useActiveServer();
	const activeServerURL = useMemo(() => (activeServer || {}).url, [servers]);

	useEffect(() => {
		setProps({
			servers,
			activeServerURL,
			...props,
		});
	});

	return null;
}
