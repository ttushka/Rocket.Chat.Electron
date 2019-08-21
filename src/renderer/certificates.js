import { remote } from 'electron';
import { parse as parseURL } from 'url';
import { reportError } from '../errorHandling';
import { readUserDataFile, writeUserDataFile } from './userData';


const { app } = remote;

const certificatesFileName = 'certificate.json';
const certificateTrustRequests = {};
let certificates = {};
let props = {
	certificateTrustRequestHandler: null,
};

const loadCertificates = async () => {
	try {
		certificates = await readUserDataFile(certificatesFileName, 'json') || {};
	} catch (error) {
		reportError(error);
		certificates = {};
	}
};

const persistCertificates = async () => {
	try {
		await writeUserDataFile(certificatesFileName, certificates);
	} catch (error) {
		reportError(error);
	}
};

const clearCertificates = async () => {
	certificates = {};
	await persistCertificates();
};

const serializeCertificate = ({ issuerName, data }) => `${ issuerName }\n${ data.toString() }`;

const addTrustedCertificate = (certificateUrl, certificate) => {
	const { host } = parseURL(certificateUrl);
	certificates[host] = serializeCertificate(certificate);
	persistCertificates();
};

const hasTrustedCertificateFor = (certificateUrl) => {
	const { host } = parseURL(certificateUrl);
	return certificates.hasOwnProperty(host);
};

const isCertificateTrusted = (certificateUrl, certificate) => {
	const { host } = parseURL(certificateUrl);
	if (!hasTrustedCertificateFor(certificateUrl)) {
		return false;
	}

	return certificates[host] === serializeCertificate(certificate);
};

const handleAppCertificateError = async (event, webContents, certificateUrl, error, certificate, callback) => {
	if (isCertificateTrusted(certificateUrl, certificate)) {
		callback(true);
		return;
	}

	const { fingerprint } = certificate;

	if (certificateTrustRequests[fingerprint]) {
		certificateTrustRequests[fingerprint].push(callback);
		return;
	}

	certificateTrustRequests[fingerprint] = [callback];
	const isReplacing = hasTrustedCertificateFor(certificateUrl);

	const { certificateTrustRequestHandler } = props;

	const isTrusted = certificateTrustRequestHandler
		? await certificateTrustRequestHandler(webContents, certificateUrl, error, certificate, isReplacing)
		: false;

	if (isTrusted) {
		addTrustedCertificate(certificateUrl, certificate);
	}

	for (const callback of certificateTrustRequests[fingerprint] || []) {
		callback(isTrusted);
	}
	delete certificateTrustRequests[fingerprint];
};

const setupCertificates = () => {
	loadCertificates();

	app.addListener('certificate-error', handleAppCertificateError);

	window.addEventListener('beforeunload', () => {
		app.removeListener('certificate-error', handleAppCertificateError);
	}, false);
};

let mounted = false;
const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	if (mounted) {
		return;
	}

	setupCertificates();
	mounted = true;
};

export default {
	setProps,
	clear: clearCertificates,
};
