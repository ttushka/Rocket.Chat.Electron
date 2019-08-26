import { Button } from '@rocket.chat/fuselage';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Outer,
	Inner,
	OffLineCard,
	ConnectToServerForm,
	ConnectToServerLabel,
	ConnectToServerInput,
	ConnectToServerError,
} from './LandingView.styles';
import { RocketChatLogo } from '../ui/RocketChatLogo';
import { useOpenView, useSetOpenView } from '../services/OpenViewState';
import { useServers, useServersActions } from '../services/ServersProvider';


const defaultServerURL = 'https://open.rocket.chat';

const normalizeURL = (serverURL) => {
	if (!/^https?:\/\//.test(serverURL)) {
		return `https://${ serverURL }`;
	}

	return serverURL;
};

const validateServer = async (serverURL, timeout = 5000) => {
	try {
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

		if (response.status === 401) {
			return 'basic-auth';
		}

		if (!response.ok) {
			return 'invalid';
		}

		const { success } = await response.json();
		if (!success) {
			return 'invalid';
		}

		return 'valid';
	} catch (error) {
		return 'invalid';
	}
};

export const useConnectionStatus = () => {
	const [isOffLine, setOffLine] = useState(false);

	useEffect(() => {
		const handleConnectionStatus = () => {
			setOffLine(!navigator.onLine);
		};

		window.addEventListener('online', handleConnectionStatus);
		window.addEventListener('offline', handleConnectionStatus);
		handleConnectionStatus();

		return () => {
			window.removeEventListener('online', handleConnectionStatus);
			window.removeEventListener('offline', handleConnectionStatus);
		};
	}, []);

	return isOffLine;
};

export const useForm = () => {
	const servers = useServers();
	const { addServer, setActiveServerURL } = useServersActions();
	const setOpenView = useSetOpenView();
	const [serverURL, setServerURL] = useState('');
	const [error, setError] = useState(null);
	const [validating, setValidating] = useState(false);
	const { t } = useTranslation();

	const handleConnectToServer = async (serverURL) => {
		const index = servers.findIndex(({ url }) => url === serverURL);

		if (index > -1) {
			setActiveServerURL(serverURL);
			setOpenView('webViews');
			return;
		}

		const result = await validateServer(serverURL);
		if (result === 'valid') {
			addServer(serverURL);
			setActiveServerURL(serverURL);
			setOpenView('webViews');
		}

		return result;
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		setError(null);
		setValidating(true);

		const value = serverURL.trim() || defaultServerURL;

		const tries = [
			value,
			(
				!/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(value) ?
					`https://${ value }.rocket.chat` :
					null
			),
		].filter(Boolean).map(normalizeURL);

		let result;
		for (const serverURL of tries) {
			setServerURL(serverURL);

			result = await handleConnectToServer(serverURL);

			if (result === 'valid') {
				setServerURL('');
				setError(null);
				setValidating(false);
				return;
			}
		}

		switch (result) {
			case 'basic-auth':
				setError(t('error.authNeeded', { auth: 'username:password@host' }));
				setValidating(false);
				break;

			case 'invalid':
				setError(t('error.noValidServerFound'));
				setValidating(false);
				break;

			case 'timeout':
				setError(t('error.connectTimeout'));
				setValidating(false);
				break;
		}
	};

	const handleServerURLChange = ({ currentTarget: { value } }) => {
		setServerURL(value);
		setError(null);
	};

	return {
		serverURL,
		error,
		validating,
		handleSubmit,
		handleServerURLChange,
	};
};

export function LandingView() {
	const openView = useOpenView();
	const isVisible = openView === 'landing';

	const isOffLine = useConnectionStatus();

	const {
		serverURL,
		error,
		validating,
		handleSubmit,
		handleServerURLChange,
	} = useForm();

	const { t } = useTranslation();

	return (
		<Outer isVisible={isVisible}>
			<Inner>
				<RocketChatLogo dark />
				{isOffLine ?
					(
						<OffLineCard>
							{t('error.offline')}
						</OffLineCard>
					) :
					(
						<ConnectToServerForm method='/' onSubmit={handleSubmit}>
							<ConnectToServerLabel>
								{t('landing.inputUrl')}
							</ConnectToServerLabel>

							<ConnectToServerInput
								type='text'
								placeholder={defaultServerURL}
								dir='auto'
								value={serverURL}
								error={error}
								onChange={handleServerURLChange}
							/>

							<Button type='submit' primary disabled={validating}>
								{validating ? t('landing.validating') : t('landing.connect')}
							</Button>

							{error && (
								<ConnectToServerError>
									{error}
								</ConnectToServerError>
							)}
						</ConnectToServerForm>
					)}
			</Inner>
		</Outer>
	);
}
