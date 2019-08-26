import React, { forwardRef } from 'react';
import { Outer, Inner } from './View.styles';


export const View = forwardRef(function View({ isVisible, ...props }, ref) {
	return (
		<Outer ref={ref} isVisible={isVisible}>
			<Inner {...props} />
		</Outer>
	);
});

View.displayName = 'View';
