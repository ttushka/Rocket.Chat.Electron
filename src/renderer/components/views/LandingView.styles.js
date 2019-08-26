import styled, { css, keyframes } from 'styled-components';
import { View } from '../ui/View';


export const Outer = styled(View)`
	background-color: var(--color-dark);
	align-items: center;
	justify-content: center;
	overflow-y: auto;
	-webkit-app-region: drag;
`;

export const Inner = styled.div`
	display: flex;
	flex-flow: column nowrap;
	align-items: center;
	justify-content: center;
	width: 100vw;
	max-width: 30rem;
	padding: 0 1rem;
	-webkit-app-region: no-drag;
`;

export const OffLineCard = styled.div`
	display: flex;
	flex-flow: column nowrap;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 14rem;
	margin: 1rem 0;
	padding: 1rem;
	border-radius: 2px;
	color: var(--color-red);
	background-color: var(--color-white);
	box-shadow:
		0 0 2px 0 rgba(47, 52, 61,.08),
		0 0 12px 0 rgba(47, 52, 61,.12);
`;

export const ConnectToServerForm = styled.form`
	display: flex;
	flex-flow: column nowrap;
	align-items: center;
	justify-content: center;
	width: 100%;
	margin: 1rem 0;
	padding: 1rem;
	border-radius: 2px;
	background-color: var(--color-white);
	box-shadow:
		0 0 2px 0 rgba(47, 52, 61,.08),
		0 0 12px 0 rgba(47, 52, 61,.12);
`;

export const ConnectToServerLabel = styled.h2`
	margin: 1rem 0;
	font-size: 1.25rem;
	font-weight: normal;
	text-transform: uppercase;
	color: var(--color-dark-70);
	line-height: 1.5;
`;

export const ConnectToServerInput = styled.input`
	width: 100%;
	padding: 0.5rem;
	margin: 1rem 0;
	border-width: 0;
	border-bottom: 1px solid var(--color-dark-20);
	background-color: transparent;
	box-shadow: 0 0 0;
	font-family: var(--font-family);
	font-size: 1.75rem;
	font-weight: normal;
	${ ({ error }) => error && css`
		animation: ${ keyframes`
			0%,
			100% {
				transform: translate3d(0, 0, 0);
			}
			10%,
			30%,
			50%,
			70%,
			90% {
				transform: translate3d(-10px, 0, 0);
			}
			20%,
			40%,
			60%,
			80% {
				transform: translate3d(10px, 0, 0);
			}
		` } 1s;
	` }
 	&:-webkit-autofill {
		color: var(--color-white);
		background-color: transparent;
		box-shadow: 0 0 0 1000px var(--color-dark-05) inset;
	}
`;

export const ConnectToServerError = styled.div`
	margin: 1rem 0;
	color: var(--color-red);
`;
