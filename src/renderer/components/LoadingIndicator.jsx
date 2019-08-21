import React from 'react';
import { Container, Dot } from './LoadingIndicator.styles';


export function LoadingIndicator(props) {
	return (
		<Container {...props}>
			{Array.from({ length: 3 }, (_, order) => (
				<Dot key={order} order={order} />
			))}
		</Container>
	);
}
