// https://github.com/zondax/cosmos-delegation-js/
// https://github.com/cosmos/ledger-cosmos-js/blob/master/src/index.js
import 'babel-polyfill';
//import Cosmos from "@lunie/cosmos-js"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import CosmosApp from "ledger-cosmos-js"
import { signatureImport } from "secp256k1"
import semver from "semver"
import bech32 from "bech32";
import secp256k1 from "secp256k1";
import sha256 from "crypto-js/sha256"
import ripemd160 from "crypto-js/ripemd160"
import CryptoJS from "crypto-js"
const { SigningCosmWasmClient } = require('secretjs');

// TODO: discuss TIMEOUT value
const INTERACTION_TIMEOUT = 10000
const REQUIRED_KEPLR_APP_VERSION = Meteor.settings.public.keplr?.keplrAppVersion || "0.8.10";
const DEFAULT_DENOM = Meteor.settings.public.bondDenom || 'uscrt';
export const DEFAULT_GAS_PRICE = parseFloat(Meteor.settings.public.ledger?.gasPrice) || parseFloat(Meteor.settings.public.gasPrice) || 0.025;
export const DEFAULT_MEMO = 'Sent via Big Dipper'

/*
HD wallet derivation path (BIP44)
DerivationPath{44, 118, account, 0, index}
*/
//const COINTYPE = Meteor.settings.public.ledger.coinType || 118;
const HDPATH = [44, 529, 0, 0, 0]
const BECH32PREFIX = Meteor.settings.public.bech32PrefixAccAddr

function bech32ify(address, prefix) {
    const words = bech32.toWords(address)
    return bech32.encode(prefix, words)
}

export const toPubKey = (address) => {
    return bech32.decode(Meteor.settings.public.bech32PrefixAccAddr, address);
}

function createCosmosAddress(publicKey) {
    const message = CryptoJS.enc.Hex.parse(publicKey.toString(`hex`))
    const hash = ripemd160(sha256(message)).toString()
    const address = Buffer.from(hash, `hex`)
    const cosmosAddress = bech32ify(address, Meteor.settings.public.bech32PrefixAccAddr)
    return cosmosAddress
}

export class Keplr {
    constructor({ testModeAllowed }) {
        this.testModeAllowed = testModeAllowed
    }

    async getKeplrAppVersion() {
        if (!window.keplr) {
            var appVersion = "0.0.0"
        } else {
            var appVersion = window.keplr.version
        }

        //const version = versionString({ major, minor, patch })
        //console.log(appVersion)
        return appVersion
    }
    async enable() {
        // check if keplr is installed and connect
        if (!window.keplr) {
            throw new Error(`Keplr is not installed: Please install Keplr Extension for Google Chrome.`)
        } else {
            await window.keplr.enable(Meteor.settings.public.chainId);
        }
    }
    async isReady() {
        if (!window.keplr) {
            throw new Error(`Keplr is not installed: Please install Keplr Extension for Google Chrome.`)
        }

        //get app version
        const version = await this.getKeplrAppVersion()

        // check if the version is supported
        if (!semver.gte(version, REQUIRED_KEPLR_APP_VERSION)) {
            const msg = `Outdated version: Please update Keplr Extension to the latest version.`
            throw new Error(msg)
        }

        // throws if not open
        await this.enable()

        return true;
    }
    async connect(timeout = INTERACTION_TIMEOUT) {
        // assume well connection if connected once
        if (this.secretJs) return

        //check version and connect
        await this.isReady()

        const offlineSigner = window.getOfflineSigner(Meteor.settings.public.chainId);
        const enigmaUtils = window.getEnigmaUtils(Meteor.settings.public.chainId);
        const accounts = await offlineSigner.getAccounts();

        const secretJS = new SigningCosmWasmClient(
            //Meteor.settings.remote.lcd,
            "https://bridge-api-manager.azure-api.net/",
            accounts[0].address,
            offlineSigner,
            enigmaUtils
        );

        this.secretJs = secretJS;
        this.accounts = accounts;
    }

    async getPubKey() {
        await this.connect()

        //const response = await this.cosmosApp.publicKey(HDPATH)
        //this.checkLedgerErrors(response)
        response = await window.keplr.getKey(Meteor.settings.public.chainId)
        return response.pubKey
    }
    async getCosmosAddress() {
        await this.connect()
        return this.accounts[0];
        //const pubKey = await this.getPubKey()
        //return { pubKey, address: createCosmosAddress(pubKey) }
    }

    async sign(msgs, fee, chainId, memo, accountNumber, sequence) {
        await this.connect()

        const response = await this.secretJs.signAdapter(msgs, fee, chainId, memo, accountNumber, sequence)
        //console.log(response);

        //const response2 = await this.secretJs.postTx(response)
        //console.log(response2);
        //this.checkLedgerErrors(response)
        // we have to parse the signature from Ledger as it's in DER format
        //const parsedSignature = signatureImport(response.signatures[0].signature)
        return response //.signatures[0].signature
    }

    static getBytesToSign(tx, txContext) {
        if (typeof txContext === 'undefined') {
            throw new Error('txContext is not defined');
        }
        if (typeof txContext.chainId === 'undefined') {
            throw new Error('txContext does not contain the chainId');
        }
        if (typeof txContext.accountNumber === 'undefined') {
            throw new Error('txContext does not contain the accountNumber');
        }
        if (typeof txContext.sequence === 'undefined') {
            throw new Error('txContext does not contain the sequence value');
        }

        const txFieldsToSign = {
            account_number: txContext.accountNumber.toString(),
            chain_id: txContext.chainId,
            fee: tx.value.fee,
            memo: tx.value.memo,
            msgs: tx.value.msg,
            sequence: txContext.sequence.toString(),
        };

        this.sign(tx.value.msg, tx.value.fee, txContext.chainId, tx.value.memo, txContext.accountNumber.toString(), txContext.sequence.toString());
        return JSON.stringify(canonicalizeJson(txFieldsToSign));
    }

    
    /* istanbul ignore next: maps a bunch of errors */
    checkLedgerErrors(
        { error_message, device_locked },
        {
            timeoutMessag = "Connection timed out. Please try again.",
            rejectionMessage = "User rejected the transaction"
        } = {}
    ) {
        if (device_locked) {
            throw new Error(`Ledger's screensaver mode is on`)
        }
        switch (error_message) {
        case `U2F: Timeout`:
            throw new Error(timeoutMessag)
        case `Cosmos app does not seem to be open`:
            // hack:
            // It seems that when switching app in Ledger, WebUSB will disconnect, disabling further action.
            // So we clean up here, and re-initialize this.cosmosApp next time when calling `connect`
            this.cosmosApp.transport.close()
            this.cosmosApp = undefined
            throw new Error(`Cosmos app is not open`)
        case `Command not allowed`:
            throw new Error(`Transaction rejected`)
        case `Transaction rejected`:
            throw new Error(rejectionMessage)
        case `Unknown error code`:
            throw new Error(`Ledger's screensaver mode is on`)
        case `Instruction not supported`:
            throw new Error(
                `Your Cosmos Ledger App is not up to date. ` +
                    `Please update to version ${REQUIRED_KEPLR_APP_VERSION}.`
            )
        case `No errors`:
            // do nothing
            break
        default:
            throw new Error(error_message)
        }
    }


    static applyGas(unsignedTx, gas, gasPrice = DEFAULT_GAS_PRICE, denom = DEFAULT_DENOM) {
        if (typeof unsignedTx === 'undefined') {
            throw new Error('undefined unsignedTx');
        }
        if (typeof gas === 'undefined') {
            throw new Error('undefined gas');
        }

        // eslint-disable-next-line no-param-reassign
        unsignedTx.value.fee = {
            amount: [{
                amount: Math.ceil(gas * gasPrice).toString(),
                denom: denom,
            }],
            gas: gas.toString(),
        };
        return unsignedTx;
    }

    static applySignature(unsignedTx, txContext, secp256k1Sig) {
        if (typeof unsignedTx === 'undefined') {
            throw new Error('undefined unsignedTx');
        }
        if (typeof txContext === 'undefined') {
            throw new Error('undefined txContext');
        }
        if (typeof txContext.pk === 'undefined') {
            throw new Error('txContext does not contain the public key (pk)');
        }
        if (typeof txContext.accountNumber === 'undefined') {
            throw new Error('txContext does not contain the accountNumber');
        }
        if (typeof txContext.sequence === 'undefined') {
            throw new Error('txContext does not contain the sequence value');
        }

        const tmpCopy = Object.assign({}, unsignedTx, {});

        tmpCopy.value.signatures = [
            {
                signature: secp256k1Sig.toString('base64'),
                account_number: txContext.accountNumber.toString(),
                sequence: txContext.sequence.toString(),
                pub_key: {
                    type: 'tendermint/PubKeySecp256k1',
                    value: txContext.pk//Buffer.from(txContext.pk, 'hex').toString('base64'),
                },
            },
        ];
        return tmpCopy;
    }
}


function versionString({ major, minor, patch }) {
    return `${major}.${minor}.${patch}`
}

function canonicalizeJson(jsonTx) {
    if (Array.isArray(jsonTx)) {
        return jsonTx.map(canonicalizeJson);
    }
    if (typeof jsonTx !== 'object') {
        return jsonTx;
    }
    const tmp = {};
    Object.keys(jsonTx).sort().forEach((key) => {
        // eslint-disable-next-line no-unused-expressions
        jsonTx[key] != null && (tmp[key] = jsonTx[key]);
    });

    return tmp;
}
