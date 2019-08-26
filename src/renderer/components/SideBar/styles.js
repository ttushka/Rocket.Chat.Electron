import styled, { css } from 'styled-components';


export const Container = styled.aside`
	flex: 0 0 64px;
	${ (
		process.platform === 'darwin'
			? css`padding: 20px 0 0;`
			: css`padding: 0;`
	) }
	${ ({ visible }) => !visible && css`
		margin-left: -64px;
	` }
	display: flex;
	flex-flow: column nowrap;
	align-items: stretch;
	user-select: none;
	color: var(--color, #ffffff);
	background:
		linear-gradient(rgba(0, 0, 0, .1), rgba(0, 0, 0, .1)),
		var(--background, var(--color-dark));
	z-index: 10;
	transition: margin 300ms;
	-webkit-app-region: drag;
	--background: ${ ({ background }) => background };
	--color: ${ ({ color }) => color };
`;

export const Tooltip = styled.span`
	position: fixed;
	left: 64px;
	visibility: hidden;
	padding: 0.5rem 1rem;
	transition: all 300ms ease-out 300ms;
	transform: translateX(20px);
	white-space: nowrap;
	pointer-events: none;
	opacity: 0;
	color: #ffffff;
	border-radius: 4px;
	background-color: #1f2329;
	font-size: 0.875rem;
	line-height: normal;
`;
