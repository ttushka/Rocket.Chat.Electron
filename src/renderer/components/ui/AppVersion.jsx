import React from 'react';
import {
	Outer,
	Inner,
} from './AppVersion.styles';


export function AppVersion({ label, version, current = false }) {
	return (
		<Outer>
			<div>{label}</div>
			<Inner current={current}>
				{version || 'x.y.z'}
			</Inner>
		</Outer>
	);
}
