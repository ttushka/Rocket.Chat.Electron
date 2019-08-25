import React, { useEffect, useMemo } from 'react';
import landingView from '../landingView';
import { useServers, useServersActions, useServerValidation } from './services/ServersProvider';


const Markup = React.memo(() =>
	<section className='landing-view'>
		<div className='wrapper'>
			<header>
				<img className='logo' src='./images/logo-dark.svg' />
			</header>

			<div className='loading-indicator'>
				<span className='dot'></span>
				<span className='dot'></span>
				<span className='dot'></span>
			</div>

			<form id='login-card' method='/'>
				<header>
					<h2 className='connect__prompt'>Enter your server URL</h2>
				</header>
				<div className='fields'>
					<div className='input-text active'>
						<input type='text' name='host' placeholder='https://open.rocket.chat' dir='auto' />
					</div>
				</div>

				<div id='invalidUrl' style={{ display: 'none' }} className='alert alert-danger'>No valid server found</div>

				<div className='connect__error alert alert-danger only-offline'>Check connection</div>

				<div className='submit'>
					<button type='submit' data-loading-text='Connecting...' className='button primary login'>Connect</button>
				</div>
			</form>
		</div>
	</section>
);
Markup.displayName = 'Markup';

export function LandingView() {
	const servers = useServers();
	const visible = useMemo(() => servers.some(({ isActive }) => isActive), [servers]);

	const { addServer } = useServersActions();
	const validateServerURL = useServerValidation();

	useEffect(() => {
		landingView.setProps({
			visible,
			addServer,
			validateServerURL,
		});
	});

	return <Markup />;
}
