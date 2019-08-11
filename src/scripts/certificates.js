import { remote } from 'electron';
import jetpack from 'fs-jetpack';
import { parse as parseURL } from 'url';
import { reportError } from '../errorHandling';
import i18n from '../i18n';
import ipc from '../ipc';
import { showMessageBox } from './dialogs';


const { app } = remote;

const readUserDataFile = (path, returnAs = 'utf8') =>
	jetpack.cwd(app.getPath('userData')).readAsync(path, returnAs);

const writeUserDataFile = (path, data) =>
	jetpack.cwd(app.getPath('userData')).writeAsync(path, data, { atomic: true });

const certificatesFileName = 'certificate.json';
const certificateTrustRequests = {};
let certificates = {};

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

export const clearCertificates = async () => {
	certificates = {};
	await persistCertificates();
};

const serializeCertificate = ({ issuerName, data }) => `${ issuerName }\n${ data.toString() }`;

export const addTrustedCertificate = (certificateUrl, certificate) => {
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

const handleAppCertificateError = (event, webContents, certificateUrl, error, certificate, callback) => {
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

	ipc.emit('certificates/request-trust', webContents.id, certificateUrl, error, certificate, isReplacing);
};

const handleCertificateTrustRequest = async (webContentsId, certificateUrl, error, certificate, isReplacing) => {
	const { fingerprint, issuerName } = certificate || {};

	const title = i18n.__('dialog.certificateError.title');
	const message = i18n.__('dialog.certificateError.message', {
		issuerName,
	});
	let detail = `URL: ${ certificateUrl }\nError: ${ error }`;
	if (isReplacing) {
		detail = i18n.__('error.differentCertificate', { detail });
	}

	const { response } = await showMessageBox({
		title,
		message,
		detail,
		type: 'warning',
		buttons: [
			i18n.__('dialog.certificateError.yes'),
			i18n.__('dialog.certificateError.no'),
		],
		cancelId: 1,
	});

	const isTrusted = response === 0;

	if (isTrusted) {
		addTrustedCertificate(certificateUrl, certificate);

		ipc.emit('certificates/added', webContentsId, certificateUrl, error, certificate, isReplacing);
	}

	for (const callback of certificateTrustRequests[fingerprint] || []) {
		callback(response === 0);
	}
	delete certificateTrustRequests[fingerprint];
};

export const setupCertificates = () => {
	loadCertificates();

	ipc.connect('certificates/request-trust', handleCertificateTrustRequest);

	app.addListener('certificate-error', handleAppCertificateError);

	window.addEventListener('beforeunload', () => {
		app.removeListener('certificate-error', handleAppCertificateError);
	}, false);
};
