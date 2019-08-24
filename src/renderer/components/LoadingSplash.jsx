import React from 'react';
import { LoadingIndicator } from './ui/LoadingIndicator';
import { RocketChatLogo } from './ui/RocketChatLogo';
import { Outer, Inner } from './LoadingSplash.styles';


export function LoadingSplash({ visible, ...props }) {
	return (
		<Outer>
			<Inner {...props}>
				<RocketChatLogo dark />
				<LoadingIndicator />
			</Inner>
		</Outer>
	);
}
