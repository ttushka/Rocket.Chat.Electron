import React from 'react';
import { LoadingIndicator } from './LoadingIndicator';
import { RocketChatLogo } from './RocketChatLogo';
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
