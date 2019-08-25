import { Button } from '@rocket.chat/fuselage';
import { t } from 'i18next';
import React, { useEffect, useMemo, useState } from 'react';
import { useServersActions, useServerValidation } from '../services/ServersProvider';
import { useOpenView } from '../services/OpenViewState';
import { RocketChatLogo } from '../ui/RocketChatLogo';


const defaultServerURL = 'https://open.rocket.chat';

export function LandingView() {
	const { addServer } = useServersActions();
	const validateServerURL = useServerValidation();

	const [serverURL, setServerURL] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	const [isValidating, setValidating] = useState(false);

	const openView = useOpenView();
	const visible = useMemo(() => !openView || openView === 'landing', [openView]);

	const tryValidation = (_serverURL = serverURL.trim()) => (resolve, reject) => {
		setServerURL(_serverURL);
		setErrorMessage('');

		if (!_serverURL) {
			setValidating(false);
			resolve();
			return;
		}

		setValidating(true);

		validateServerURL(_serverURL)
			.then(() => {
				setValidating(false);
				resolve();
			})
			.catch((status) => {
				if (status === 'basic-auth') {
					setErrorMessage(t('error.authNeeded', { auth: 'username:password@host' }));
					setValidating(false);
					reject();
					return;
				}

				if (/^https?:\/\/.+/.test(_serverURL)) {
					if (status === 'invalid') {
						setErrorMessage(t('error.noValidServerFound'));
					} else if (status === 'timeout') {
						setErrorMessage(t('error.connectTimeout'));
					} else {
						setErrorMessage(status.message || String(status));
					}

					setValidating(false);
					reject();
					return;
				}

				if (!/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(_serverURL)) {
					return tryValidation(`https://${ _serverURL }.rocket.chat`)(resolve, reject);
				}

				if (!/^https?:\/\//.test(_serverURL)) {
					return tryValidation(`https://${ _serverURL }`)(resolve, reject);
				}
			});
	};

	const validate = () => new Promise(tryValidation(serverURL));

	const handleFormSubmit = async (event) => {
		event.preventDefault();
		event.stopPropagation();

		await validate();

		addServer(serverURL || defaultServerURL);

		setServerURL('');
	};

	const handleInputBlur = () => {
		validate();
	};

	const handleInputChange = (event) => {
		setServerURL(event.currentTarget.value);
	};

	const [isOffline, setOffline] = useState(false);

	useEffect(() => {
		const handleConnectionChange = () => {
			setOffline(!navigator.onLine);
		};

		window.addEventListener('online', handleConnectionChange);
		window.addEventListener('offline', handleConnectionChange);

		handleConnectionChange();

		return () => {
			window.removeEventListener('online', handleConnectionChange);
			window.removeEventListener('offline', handleConnectionChange);
		};
	}, []);

	useEffect(() => {
		document.body.classList.toggle('offline', isOffline);
	}, [isOffline]);

	return <section className={['landing-view', !visible && 'hide'].filter(Boolean).join(' ')}>
		<div className='wrapper'>
			<RocketChatLogo dark />
			<form id='login-card' method='/' onSubmit={handleFormSubmit}>
				<header>
					<h2 className='connect__prompt'>{errorMessage ? t('landing.invalidUrl') : t('landing.inputUrl')}</h2>
				</header>
				<div className='fields'>
					<div className='input-text active'>
						<input type='text' name='host' placeholder={defaultServerURL} dir='auto' onBlur={handleInputBlur} value={serverURL} onChange={handleInputChange} className={errorMessage ? 'wrong' : undefined} />
					</div>
				</div>

				<div id='invalidUrl' style={{ display: errorMessage ? 'block' : 'none' }} className='alert alert-danger'>{errorMessage}</div>

				<div className='connect__error alert alert-danger only-offline'>{t('error.offline')}</div>

				<Button type='submit' primary disabled={isValidating} className='login'>{isValidating ? t('landing.validating') : t('landing.connect')}</Button>
			</form>
		</div>
	</section>;
}
