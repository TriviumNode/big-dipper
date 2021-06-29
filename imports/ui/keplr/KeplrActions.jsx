import qs from 'querystring';
import Cosmos from "@lunie/cosmos-js"
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import {
    Button, Spinner, TabContent, TabPane, Row, Col, Modal, ModalHeader,
    Form, ModalBody, ModalFooter, InputGroup, InputGroupAddon, Input, Progress,
    UncontrolledTooltip, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Table, Label, FormGroup, FormText, FormFeedback, InputGroupText
} from 'reactstrap';
import { Keplr, DEFAULT_MEMO } from './keplr.js';
//import { Ledger } from '../ledger/ledger.js';
import { txMsgs } from './txMsg.js';
import { Validators } from '/imports/api/validators/validators.js';
import AccountTooltip from '/imports/ui/components/AccountTooltip.jsx';
import Coin from '/both/utils/coins.js';
import numbro from 'numbro';
import TimeStamp from '../components/TimeStamp.jsx';
import moment from 'moment';
import Account from '../components/Account.jsx';
import _ from 'lodash';
import i18n from 'meteor/universe:i18n';
const { SigningCosmWasmClient } = require('secretjs');


const maxHeightModifier = {
    setMaxHeight: {
        enabled: true,
        fn: (data) => {
            return { ...data, styles: { ...data.styles, 'overflowY': 'auto', maxHeight: '80vh' } };
        }
    }
}

const coinSelectionModifier = {
    setMaxHeight: {
        enabled: true,
        fn: (data) => {
            return { ...data, styles: { ...data.styles, 'overflowY': 'auto', maxHeight: '30vh' } };
        }
    }
}


const T = i18n.createComponent();
let coinMaxAvailable = 0;

const Types = {
    DELEGATE: 'delegate',
    REDELEGATE: 'redelegate',
    UNDELEGATE: 'undelegate',
    WITHDRAW: 'withdraw',
    SEND: 'send',
    SUBMITPROPOSAL: 'submitProposal',
    VOTE: 'vote',
    DEPOSIT: 'deposit',
}

const DEFAULT_GAS_ADJUSTMENT = '1.4';



const TypeMeta = {
    [Types.DELEGATE]: {
        button: 'delegate',
        pathPreFix: 'staking/delegators',
        pathSuffix: 'delegations',
        warning: ''
    },
    [Types.REDELEGATE]: {
        button: 'redelegate',
        pathPreFix: 'staking/delegators',
        pathSuffix: 'redelegations',
        warning: (duration, maxEntries) => {
            let dayTime = duration / 1000000;
            let unbondingPeriod = moment.duration(dayTime);

            return `You are only able to redelegate from Validator A to Validator B
                  up to ${maxEntries} times in a ${unbondingPeriod.humanize()} period.
                  Also, There is ${unbondingPeriod.humanize()} cooldown from serial redelegation;
                  Once you redelegate from Validator A to Validator B,
                  you will not be able to redelegate from Validator B to another
                  validator for the next ${unbondingPeriod.humanize()}.`
        }
    },
    [Types.UNDELEGATE]: {
        button: 'undelegate',
        pathPreFix: 'staking/delegators',
        pathSuffix: 'unbonding_delegations',
        warning: (duration) => {
            let dayTime = duration / 1000000;
            let unbondingPeriod = moment.duration(dayTime)
            return `There is a ${unbondingPeriod.humanize()}-day unbonding period.`
        }
    },
    [Types.WITHDRAW]: {
        button: 'withdraw',
        pathPreFix: 'distribution/delegators',
        pathSuffix: 'rewards',
        warning: '',
        gasAdjustment: '2.0'
    },
    [Types.SEND]: {
        button: 'transfer',
        button_other: 'send',
        pathPreFix: 'bank/accounts',
        pathSuffix: 'transfers',
        warning: '',
        gasAdjustment: '1.8'
    },
    [Types.SUBMITPROPOSAL]: {
        button: 'new',
        path: 'gov/proposals',
        gasAdjustment: '1.4'
    },
    [Types.VOTE]: {
        button: 'vote',
        pathPreFix: 'gov/proposals',
        pathSuffix: 'votes',
        gasAdjustment: '2.5'
    },
    [Types.DEPOSIT]: {
        button: 'deposit',
        pathPreFix: 'gov/proposals',
        pathSuffix: 'deposits',
        gasAdjustment: '2'
    }
}

const CoinAmount = (props) => {
    let coin = {};
    if (!props.coin && !props.amount) return null;
    if (!props.denom) {
        coin = new Coin(props.amount).toString(4);
    }
    else {
        let denomFinder = Meteor.settings.public.coins.find(({ denom }) => denom === props.denom);
        let displayDenom = denomFinder ? denomFinder.displayName : null;

        let finder = props.amount.find(({ denom }) => denom === props.denom)
        coin = finder ? new Coin(finder.amount, finder.denom).toString(4) : '0.0000 ' + displayDenom;
    }
    let denom = (props.mint) ? Coin.StakingCoin.denom : Coin.StakingCoin.displayName;

    return <span><span className={props.className || 'coin'}>{coin}</span> </span>
}


const Amount = (props) => {
    if (!props.coin && !props.amount) return null;
    let coin = props.coin || new Coin(props.amount, props.denom).toString(4);
    let amount = (props.mint) ? Math.round(coin.amount) : coin.stakingAmount;
    let denom = (props.mint) ? Coin.StakingCoin.denom : Coin.StakingCoin.displayName;
    return <span><span className={props.className || 'amount'}>{numbro(amount).format("0,0.0000")}</span> <span className='denom'>{denom}</span></span>
}



const Fee = (props) => {
    return <span><CoinAmount mint className='gas' amount={Math.ceil(props.gas * Meteor.settings.public.gasPrice)}/> as fee </span>
}

const isActiveValidator = (validator) => {
    return !validator.jailed && validator.status == 2;
}

const isBetween = (value, min, max) => {
    if (value instanceof Coin) value = value.amount;
    if (min instanceof Coin) min = min.amount;
    if (max instanceof Coin) max = max.amount;
    return value >= min && value <= max;
}

const startsWith = (str, prefix) => {
    return str.substr(0, prefix.length) === prefix
}

const isAddress = (address) => {
    return address && startsWith(address, Meteor.settings.public.bech32PrefixAccAddr)
}

const isValidatorAddress = (address) => {
    return address && startsWith(address, Meteor.settings.public.bech32PrefixValAddr)
}

const getTotalValue = (params, denomType) => {
    let value = (params).find(({ denom }) => denom === denomType);
    coinMaxAvailable = value ? value.amount : null;
    return coinMaxAvailable
}

const TokenImage = (props) => {
    if (props.collateral === 'uscrt' || props.collateral === 'USCRT'){
        return <img src="/img/scrt-symbol.svg" className="symbol-img" />
    }
    if (props.collateral === 'xrpb' || props.collateral ==='XRPB') {
        return <img src="/img/XRP-symbol.svg" className="symbol-img" />
    }
    else{
        return <img src={`/img/${props?.collateral?.toUpperCase()}-symbol.svg`} className="symbol-img" />
    }
}

const tokenFraction = (collateral) => {
    let collateralDenom = collateral?.toLowerCase()
    let findCoin = Meteor.settings.public.coins.find(({ denom }) => denom === collateralDenom);
    let fraction = findCoin ? findCoin.fraction : 0;
    return fraction;
}

class KeplrButton extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: '2',
            errorMessage: '',
            user: localStorage.getItem(CURRENTUSERADDR),
            pubKey: localStorage.getItem(CURRENTUSERPUBKEY),
            //wallet: localStorage.getItem(CURRENTUSERWALLET),
            memo: DEFAULT_MEMO
        };
        this.keplr = new Keplr({ testModeAllowed: false });
        
    }

    close = () => {
        this.setState({
            activeTab: '2',
            errorMessage: '',
            isOpen: false,
            actionType: undefined,
            loading: undefined,
            loadingBalance: undefined,
            currentUser: undefined,
            delegateAmount: undefined,
            transferTarget: '',
            transferAmount: undefined,
            success: undefined,
            targetValidator: undefined,
            simulating: undefined,
            gasEstimate: undefined,
            txMsg: undefined,
            params: undefined,
            price: 0,
            proposalTitle: undefined,
            proposalDescription: undefined,
            depositAmount: undefined,
            voteOption: undefined,
            memo: DEFAULT_MEMO,
            swapID: undefined,
            swapRandomNumber: undefined,
            modal: false,



        });
    }
    static getDerivedStateFromProps(props, state) {
        if (state.user !== localStorage.getItem(CURRENTUSERADDR)) {
            return {
                user: localStorage.getItem(CURRENTUSERADDR),
                pubKey: localStorage.getItem(CURRENTUSERPUBKEY)
                //wallet: localStorage.getItem(CURRENTUSERWALLET)
            };
        }
        return null;
    }

    initStateOnLoad = (action, state) => {
        this.setState({
            loading: true,
            [action]: true,
            ...state,
        })
    }

    setStateOnSuccess = (action, state) => {
        this.setState({
            loading: false,
            [action]: false,
            errorMessage: '',
            ...state,
        });
    }

    setStateOnError = (action, errorMsg, state = {}) => {
        this.setState({
            loading: false,
            [action]: false,
            errorMessage: errorMsg,
            ...state,
        });
    }

    componentDidUpdate(prevProps, prevState) {

        this.autoOpenModal();
        if ((this.state.isOpen && !prevState.isOpen) || (this.state.user && this.state.user != prevState.user)) {
            if (!this.state.success)
                this.tryConnect();
            this.getBalance();
        }

    }

    componentDidMount() {
        this.autoOpenModal()
    }

    autoOpenModal = () => {
        let query = this.props.history && this.props.history.location.search.substr(1)
        if (query && !this.state.isOpen) {
            let params = qs.parse(query)
            if (params.signin == undefined && params.action && this.supportAction(params.action)) {
                this.props.history.push(this.props.history.location.pathname)
                this.openModal(params.action, this.filterParams(params))
            }
        }
    }

    supportAction() {
        return false
    }

    filterParams() {
        return {}
    }

    getBalance = () => {
        if (this.state.loadingBalance) return

        this.initStateOnLoad('loadingBalance', {
            loading: this.state.actionType === Types.DELEGATE || this.state.actionType === Types.WITHDRAW,
            loadingRedelegations: this.state.actionType === Types.REDELEGATE
        });

        if (this.state.actionType === Types.REDELEGATE) {
            Meteor.call('accounts.getAllRedelegations', this.state.user, this.props.validator.operator_address, (error, result) => {
                try {
                    if (result)
                        this.setStateOnSuccess('loadingRedelegations', { redelegations: result })
                    if (!result || error) {
                        this.setStateOnError('loadingRedelegations')
                    }
                } catch (e) {
                    this.setStateOnError('loadingRedelegations', e.message);
                }
            })
        }

        Meteor.call('accounts.getAccountDetail', this.state.user, (error, result) => {
            try {
                if (result) {
                    let coin, coinList;
                    coin = result.coins[0] ? (new Coin(result.coins[0].amount, result.coins[0].denom)) : (new Coin(0));
                    coinList = result.coins;
                    this.setStateOnSuccess('loadingBalance', {
                        currentUser: {
                            accountNumber: result.account_number,
                            sequence: result.sequence || 0,
                            availableCoin: coin,
                            coinList: coinList
                        }
                    })
                }
                if (!result || error) {
                    this.setStateOnError(
                        'loadingBalance',
                        `Failed to get account info for ${this.state.user}`,
                        { activeTab: '0' }
                    )
                }
            } catch (e) {
                this.setStateOnError('loadingBalance', e.message);
            }
        })
    }

    getUSDPrice = (collateralDenom) =>{
        // Skip BNB coin
        let market;
        if(collateralDenom.length > 3){
            if ((collateralDenom.endsWith('B') || collateralDenom.endsWith('b'))){
                market = collateralDenom.substring(0, collateralDenom.length - 1)?.toLowerCase()
            }
            else if ((collateralDenom.startsWith('U') || collateralDenom.startsWith('u'))){
                market = collateralDenom.substring(1)?.toLowerCase()
            }
            else{
                market = collateralDenom?.toLowerCase();
            }
        }
        else {
            market = collateralDenom?.toLowerCase();
        }
        Meteor.call('cdp.getCDPPrice', `${market}:usd`, (error, result) => {
            if (error) {
                // console.warn(error);
                this.setState({
                    loading: true,
                    price: 0
                })
            }

            if (result) {
                this.setState({
                    price: result,
                    loading: false
                })
            }
        });
    }

    tryConnect = () => {
        this.keplr.getCosmosAddress().then((res) => {
            if (res.address == this.state.user)
                this.setState({
                    success: true,
                    activeTab: this.state.activeTab === '1' ? '2' : this.state.activeTab
                })
            else {
                if (this.state.isOpen) {
                    this.setState({
                        success: false,
                        activeTab: '0',
                        errorMessage: `Currently logged in as another user ${this.state.user}`
                    })
                }
            }
        }, (err) => this.setState({
            success: false,
            activeTab: '1'
        }));
    }

    getTxContext = () => {
        return {
            chainId: Meteor.settings.public.chainId,
            bech32: this.state.user,
            accountNumber: this.state.currentUser.accountNumber,
            sequence: this.state.currentUser.sequence,
            denom: Coin.StakingCoin.denom,
            pk: this.state.pubKey,
            path: [44, 529, 0, 0, 0],
            memo: this.state.memo
        }
    }

    createMessage = (callback) => {
        let txMsg
        switch (this.state.actionType) {
        case Types.DELEGATE:
            txMsg = txMsgs.createDelegate(
                this.getTxContext(),
                this.props.validator.operator_address,
                this.state.delegateAmount.amount)
            break;
        case Types.REDELEGATE:
            txMsg = txMsgs.createRedelegate(
                this.getTxContext(),
                this.props.validator.operator_address,
                this.state.targetValidator.operator_address,
                this.state.delegateAmount.amount)
            break;
        case Types.UNDELEGATE:
            txMsg = txMsgs.createUndelegate(
                this.getTxContext(),
                this.props.validator.operator_address,
                this.state.delegateAmount.amount);
            break;
        case Types.SEND:
            txMsg = txMsgs.createTransfer(
                this.getTxContext(),
                this.state.transferTarget,
                this.state.transferAmount.amount);
            break;
        case Types.SUBMITPROPOSAL:
            txMsg = txMsgs.createSubmitProposal(
                this.getTxContext(),
                this.state.proposalTitle,
                this.state.proposalDescription,
                this.state.depositAmount.amount);
            break;
        case Types.VOTE:
            txMsg = txMsgs.createVote(
                this.getTxContext(),
                this.props.proposalId,
                this.state.voteOption);
            break;
        case Types.DEPOSIT:
            txMsg = txMsgs.createDeposit(
                this.getTxContext(),
                this.props.proposalId,
                this.state.depositAmount.amount);
            break;
        }
        callback(txMsg, this.getSimulateBody(txMsg))
    }

    getSimulateBody(txMsg) {
        return (txMsg && txMsg.value && txMsg.value.msg &&
            txMsg.value.msg.length && txMsg.value.msg[0].value) || {}
    }

    getPath = () => {
        let meta = TypeMeta[this.state.actionType];
        return `${meta.pathPreFix}/${this.state.user}/${meta.pathSuffix}`;
    }

    simulate = () => {
        if (this.state.simulating) return
        this.initStateOnLoad('simulating')
        try {
            this.createMessage(this.runSimulatation);
        } catch (e) {
            this.setStateOnError('simulating', e.message)
        }
    }

    /*
    runSimulatation = (txMsg, simulateBody) => {
        let gasAdjustment = TypeMeta[this.state.actionType].gasAdjustment || DEFAULT_GAS_ADJUSTMENT;
        Meteor.call('transaction.simulateKeplr', simulateBody, this.state.user, this.state.currentUser.accountNumber, this.state.currentUser.sequence, this.getPath(), gasAdjustment, (err, res) => {
            if (res) {
                if (res === '0') {
                    res = '300000'
                }
                Keplr.applyGas(txMsg, res, Meteor.settings.public.gasPrice, Coin.StakingCoin.denom);
                this.setStateOnSuccess('simulating', {
                    gasEstimate: res,
                    activeTab: '3',
                    txMsg: txMsg
                })
            }
            else {
                console.log(err)
                this.setStateOnError('simulating', 'something went wrong')
            }
        })
        /*
        Meteor.call('transaction.simulateKeplr', simulateBody, this.state.user, this.state.currentUser.accountNumber, this.state.currentUser.sequence, this.getPath(), gasAdjustment, (err, res) => {
            if (res) {
                if (res === '0') {
                    res = '300000'
                }
                Keplr.applyGas(txMsg, res, Meteor.settings.public.gasPrice, Coin.StakingCoin.denom);
                this.setStateOnSuccess('simulating', {
                    gasEstimate: res,
                    activeTab: '3',
                    txMsg: txMsg
                })
            }
            else {
                console.log(err)
                this.setStateOnError('simulating', 'something went wrong')
            }
        })
    }
*/
    runSimulatation = (txMsg, simulateBody) => {
        let gasAdjustment = TypeMeta[this.state.actionType].gasAdjustment || DEFAULT_GAS_ADJUSTMENT;
        Meteor.call('transaction.simulate', simulateBody, this.state.user, this.getPath(), gasAdjustment, (err, res) =>{
            if (res){
                Keplr.applyGas(txMsg, res, Meteor.settings.public.gasPrice, Coin.StakingCoin.denom);
                this.setStateOnSuccess('simulating', {
                    gasEstimate: res,
                    activeTab: '3',
                    txMsg: txMsg
                })
            }
            else {
                this.setStateOnError('simulating', 'something went wrong')
            }
        })
    }

    sign = () => {
        //do nothing if signing
        if (this.state.signing) return

        //otherwise set state to signing
        this.initStateOnLoad('signing')

        try {
            let txMsg = this.state.txMsg;
            const txContext = this.getTxContext();
            //const bytesToSign = Keplr.getBytesToSign(txMsg, txContext);
            this.keplr.sign(txMsg.value.msg, txMsg.value.fee, txContext.chainId, txMsg.value.memo, txContext.accountNumber.toString(), txContext.sequence.toString()).then((signed) => {
                try {
                    //this.keplr.getBytesToSign(txMsg, txContext, (err, res) => {
                    
                    //submit tx on backend
                    Meteor.call('transaction.submitKeplr', signed, (err, res) => {
                        if (err) {
                            console.log(err);
                            this.setStateOnError('signing', err.reason)
                        } else if (res) {
                            this.setStateOnSuccess('signing', {
                                txHash: res,
                                activeTab: '4'
                            })
                        }
                    })
                } catch (e) {
                    console.log("errors submiting via backend")
                    console.log(e)
                    this.setStateOnError('signing', e.message)
                }
            }).catch((err) => {
                this.setStateOnError('signing', err.message)
            })
        } catch (e) {
            this.setStateOnError('signing', e.message)
        }
    }

    handleInputChange = (e) => {
        let target = e.currentTarget;
        let dataset = target.dataset;
        let value;

        switch (dataset.type) {
        case 'validator':
            value = { moniker: dataset.moniker, operator_address: dataset.address }
            break;
        case 'coin':
            value = new Coin(target.value, target.nextSibling.innerText)
            break;
        case 'hash':
            value = target?.value?.toUpperCase()
            break;
        default:
            value = target.value;
        }
        this.setState({ [target.name]: value })
    }

    redirectToSignin = () => {
        let params = {
            ...this.state.params,
            ...this.populateRedirectParams(),
        };
        this.close()
        this.props.history.push(this.props.history.location.pathname + '?signin&' + qs.stringify(params))
    }

    populateRedirectParams = () => {
        return { action: this.state.actionType }
    }

    isDataValid = () => {
        return this.state.currentUser != undefined;
    }

    getActionButton = () => {
        if (this.state.activeTab === '0')
            return <Button color="primary" onClick={this.redirectToSignin}>Sign in With Keplr</Button>
        if (this.state.activeTab === '1')
            return <Button color="primary" onClick={this.tryConnect}>Continue</Button>
        if (this.state.activeTab === '2')
            return <Button color="primary" disabled={this.state.simulating || !this.isDataValid()} onClick={this.simulate}>
                {(this.state.errorMessage !== '') ? 'Retry' : 'Next'}
            </Button>
        if (this.state.activeTab === '3')
            return <Button color="primary" disabled={this.state.signing} onClick={this.sign}>
                {(this.state.errorMessage !== '') ? 'Retry' : 'Sign'}
            </Button>
    }

    getCancelButton = () => {
        if (this.state.activeTab < '4')
            return <Button color="secondary" disabled={this.state.signing} onClick={this.close}>Cancel</Button>
        if (this.state.activeTab === '4')
            return <Button color="secondary" disabled={this.state.signing} onClick={this.close}>Close</Button>
    }

    openModal = (type, params = {}) => {
        if (!TypeMeta[type]) {
            console.warn(`action type ${type} not supported`)
            return;
        }
        this.setState({
            ...params,
            actionType: type,
            isOpen: true,
            params: params
        })
    }

    getValidatorOptions = () => {
        let activeValidators = Validators.find(
            { "jailed": false, "status": 2 },
            { "sort": { "description.moniker": 1 } }
        );
        let redelegations = this.state.redelegations || {};
        let maxEntries = (this.props.stakingParams && this.props.stakingParams.max_entries) ? this.props.stakingParams.max_entries : 7;
        return <UncontrolledDropdown direction='down' size='sm' className='redelegate-validators'>
            <DropdownToggle caret={true}>
                {this.state.targetValidator ? this.state.targetValidator.moniker : 'Select a Validator'}
            </DropdownToggle>
            <DropdownMenu modifiers={maxHeightModifier}>
                {activeValidators.map((validator, i) => {
                    if (validator.address === this.props.validator.address) return null

                    let redelegation = redelegations[validator.operator_address]
                    let disabled = redelegation && (redelegation.count >= maxEntries);
                    let completionTime = disabled ? <TimeStamp time={redelegation.completionTime} /> : null;
                    let id = `validator-option${i}`
                    return <div id={id} className={`validator disabled-btn-wrapper${disabled ? ' disabled' : ''}`} key={i}>
                        <DropdownItem name='targetValidator'
                            onClick={this.handleInputChange} data-type='validator' disabled={disabled}
                            data-moniker={validator.description.moniker} data-address={validator.operator_address}>
                            <Row>
                                <Col xs='12' className='moniker'>{validator.description.moniker}</Col>
                                <Col xs='3' className="voting-power data">
                                    <i className="material-icons">power</i>
                                    {validator.tokens ? numbro(validator.tokens / Meteor.settings.public.powerReduction).format('0,0') : 0}
                                </Col>

                                <Col xs='4' className="commission data">
                                    <i className="material-icons">call_split</i>
                                    {numbro(validator.commission.rate).format('0.00%')}
                                </Col>
                                <Col xs='5' className="uptime data">
                                    <Progress value={validator.uptime} style={{ width: '80%' }}>
                                        {validator.uptime ? numbro(validator.uptime / 100).format('0%') : 0}
                                    </Progress>
                                </Col>
                            </Row>
                        </DropdownItem>
                        {disabled ? <UncontrolledTooltip placement='bottom' target={id}>
                            <span>You have {maxEntries} regelegations from {this.props.validator.description.moniker}
                                 to {validator.description.moniker},
                                you cannot redelegate until {completionTime}</span>
                        </UncontrolledTooltip> : null}
                    </div>
                })}
            </DropdownMenu>
        </UncontrolledDropdown>
    }

    getWarningMessage = () => {
        return null
    }

    renderConfirmationTab = () => {
        if (!this.state.actionType) return;
        return <TabPane tabId="3">
            <div className='action-summary-message'>{this.getConfirmationMessage()}</div>
            <div className='warning-message'>{this.getWarningMessage()}</div>
            <div className='confirmation-message'>If that's correct, please click next and confirm on the Keplr popup.</div>
        </TabPane>
    }

    renderModal = () => {
        return <Modal isOpen={this.state.isOpen} toggle={this.close} className="ledger-modal">
            <ModalBody >
                <TabContent className='ledger-modal-tab' activeTab={this.state.activeTab}>
                    <TabPane tabId="0"></TabPane>
                    <TabPane tabId="1">
                        Please connect your unlock your Keplr wallet.
                    </TabPane>
                    {this.renderActionTab()}
                    {this.renderConfirmationTab()}
                    <TabPane tabId="4">
                        <div>Transaction is broadcasted.  Verify it at
                            <Link to={`/transactions/${this.state.txHash}?new`}> transaction page. </Link>
                        </div>
                        <div>See your activities at <Link to={`/account/${this.state.user}`}>your account page</Link>.</div>
                    </TabPane>
                </TabContent>
                {this.state.loading ? <Spinner type="grow" color="primary" /> : ''}
                <p className="error-message">{this.state.errorMessage}</p>
            </ModalBody>
            <ModalFooter>
                {this.getActionButton()}
                {this.getCancelButton()}
            </ModalFooter>
        </Modal>
    }
}

class KeplrDelegationButtons extends KeplrButton {
    constructor(props) {
        super(props);
    }


    getDelegatedToken = (currentDelegation) => {
        if (currentDelegation && currentDelegation.shares && currentDelegation.tokenPerShare) {
            return new Coin(currentDelegation.shares * currentDelegation.tokenPerShare);
        }
        return null
    }

    supportAction(action) {
        return action === Types.DELEGATE || action === Types.REDELEGATE || action === Types.UNDELEGATE;
    }

    isDataValid = () => {
        if (!this.state.currentUser) return false;
        let maxAmount;
        if (this.state.actionType === Types.DELEGATE) {
            maxAmount = getTotalValue(this.state.currentUser.coinList, Meteor.settings.public.bondDenom);
        } else {
            maxAmount = this.getDelegatedToken(this.props.currentDelegation);
        }
        let isValid = isBetween(this.state.delegateAmount, 1, maxAmount)

        if (this.state.actionType === Types.REDELEGATE)
            isValid = isValid || (this.state.targetValidator &&
                this.state.targetValidator.operator_address &&
                isValidatorAddress(this.state.targetValidator.operator_address))
        return isValid
    }

    renderActionTab = () => {
        if (!this.state.currentUser) return null
        let action;
        let target;
        let maxAmount;
        let availableStatement;

        let moniker = this.props.validator.description && this.props.validator.description.moniker;
        let validatorAddress = <span className='ellipic'>this.props.validator.operator_address</span>;
        switch (this.state.actionType) {
        case Types.DELEGATE:
            action = 'Delegate to';
            maxAmount = this.state.currentUser.availableCoin;
            //maxAmount = getTotalValue(this.state.currentUser.coinList, Meteor.settings.public.bondDenom);
            availableStatement = 'Available balance:'
            break;
        case Types.REDELEGATE:
            action = 'Redelegate from';
            target = this.getValidatorOptions();
            maxAmount = this.getDelegatedToken(this.props.currentDelegation);
            availableStatement = 'your delegated tokens:'
            break;
        case Types.UNDELEGATE:
            action = 'Undelegate from';
            maxAmount = this.getDelegatedToken(this.props.currentDelegation);
            availableStatement = 'your delegated tokens:'
            break;
        }
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pb-4 pt-3">{action} {moniker ? moniker : validatorAddress} {target ? 'to' : ''} {target}</h3>
            <FormGroup>
                <Label for="tx" className="mb-n4"><T>validators.amount</T></Label>
                <FormText className="coin-available mb-n5 float-right">{availableStatement} {<Amount coin={maxAmount} />}</FormText>
                <InputGroup className="modal-for-ledger py-n5">
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-for-ledger"><img src="/img/scrt-symbol.svg" className="symbol-img" /> </InputGroupText>
                    </InputGroupAddon>
                    <Input name="delegateAmount" onChange={this.handleInputChange} data-type='coin'
                        placeholder="Amount" min={Coin.MinStake} max={maxAmount} type="number"
                        invalid={this.state.delegateAmount != null && !isBetween(this.state.delegateAmount, 1, maxAmount)} className="modal-for-ledger " />
                    <InputGroupAddon addonType="append" className="mb-1">{Coin.StakingCoin.displayName}</InputGroupAddon>
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <Label for="memo"><T>transactions.memo</T></Label>
                <InputGroup className="modal-for-ledger py-n5">
                    <Input name="memo" onChange={this.handleInputChange}
                        placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
                </InputGroup>
            </FormGroup>

        </TabPane>
    }

    getWarningMessage = () => {
        let duration = this.props.stakingParams ? (this.props.stakingParams.params.unbonding_time) : null;
        let maxEntries = this.props.stakingParams ? this.props.stakingParams.params.max_entries : null;
        let warning = TypeMeta[this.state.actionType].warning;
        return warning && warning(duration, maxEntries);
    }

    getConfirmationMessage = () => {
        switch (this.state.actionType) {
        case Types.DELEGATE:
            return <span>You are going to <span className='action'>delegate</span> <Amount coin={this.state.delegateAmount} /> to <br/><AccountTooltip address={this.props.validator.operator_address} sync /> with <Fee gas={this.state.gasEstimate} />.</span>
        case Types.REDELEGATE:
            return <span>You are going to <span className='action'>redelegate</span> <Amount coin={this.state.delegateAmount} /> from <br/><AccountTooltip address={this.props.validator.operator_address} sync /> to <AccountTooltip address={this.state.targetValidator && this.state.targetValidator.operator_address} sync /> with <Fee gas={this.state.gasEstimate} />.</span>
        case Types.UNDELEGATE:
            return <span>You are going to <span className='action'>undelegate</span> <Amount coin={this.state.delegateAmount} /> from <br/><AccountTooltip address={this.props.validator.operator_address} sync /> with <Fee gas={this.state.gasEstimate} />.</span>
        }
    }

    renderRedelegateButtons = () => {
        let delegation = this.props.currentDelegation;
        if (!delegation) return null;
        let completionTime = delegation.redelegationCompletionTime;
        let isCompleted = !completionTime || new Date() >= completionTime;
        let maxEntries = this.props.stakingParams ? this.props.stakingParams.max_entries : 7;
        let canUnbond = !delegation.unbonding || maxEntries > delegation.unbonding;
        return <span>
            <div id='redelegate-button' className={`disabled-btn-wrapper${isCompleted ? '' : ' disabled'}`}>
                <Button color="danger" size="sm" disabled={!isCompleted}
                    onClick={() => this.openModal(Types.REDELEGATE)}>
                    {TypeMeta[Types.REDELEGATE].button}
                </Button>
                {isCompleted ? null : <UncontrolledTooltip placement='bottom' target='redelegate-button'>
                    <span>You have incompleted redelegation to this validator,
                        you can't redelegate until <TimeStamp time={completionTime} />
                    </span>
                </UncontrolledTooltip>}
            </div>
            <div id='undelegate-button' className={`disabled-btn-wrapper${canUnbond ? '' : ' disabled'}`}>
                <Button color="warning" size="sm" disabled={!canUnbond}
                    onClick={() => this.openModal(Types.UNDELEGATE)}>
                    {TypeMeta[Types.UNDELEGATE].button}
                </Button>
                {canUnbond ? null : <UncontrolledTooltip placement='bottom' target='undelegate-button'>
                    <span>You reached maximum {maxEntries} unbonding delegation entries,
                        you can't delegate until the first one matures at <TimeStamp time={delegation.unbondingCompletionTime} />
                    </span>
                </UncontrolledTooltip>}
            </div>
        </span>
    }

    render = () => {
        return <span className="ledger-buttons-group float-right">
            {isActiveValidator(this.props.validator) ? <Button color="success"
                size="sm" onClick={() => this.openModal(Types.DELEGATE)}>
                {TypeMeta[Types.DELEGATE].button}
            </Button> : null}
            {this.renderRedelegateButtons()}
            {this.renderModal()}
        </span>;
    }
}

class KeplrWithdrawButton extends KeplrButton {

    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            allRewards: [],
            allCommission: [],
            userHasCommission: false
        }
    }


    static getDerivedStateFromProps(nextProps, prevState) {
        let allRewards = [];
        let allCommission = [];
        let hasCommission = false;

        if (nextProps.rewards) {
            nextProps.rewards.forEach((row, index) =>
                allRewards[index] = new Coin(row.amount, row.denom).convertToString()
            )
        }

        if (nextProps.commission && nextProps.commission.length > 0) {
            for (let index = 0; index < nextProps.commission.length; index++) {
                allCommission[index] = new Coin(nextProps.commission[index].amount, nextProps.commission[index].denom),
                (nextProps.commission[index].amount > 0 ? hasCommission = true : hasCommission = false)
            }
        }

        return { allRewards: allRewards, allCommission: allCommission, userHasCommission: hasCommission }

    }

    createMessage = (callback) => {
        Meteor.call('transaction.executeKeplr', { from: this.state.user }, this.getPath(), (err, res) => {
            if (res) {
                Meteor.call('isValidator', this.state.user, (error, result) => {
                    if (result && result.address) {
                        res.value.msg.push({
                            type: 'cosmos-sdk/MsgWithdrawValidatorCommission',
                            value: { validator_address: result.address }
                        })
                    }
                    callback(res, res)
                })
            }
            else {
                console.log(err)
                this.setState({
                    loading: false,
                    simulating: false,
                    errorMessage: 'something went wrong'
                })
            }
        })
    }

    supportAction(action) {
        return action === Types.WITHDRAW;
    }

    renderActionTab = () => {
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pt-3">Withdraw <img src="/img/scrt-symbol.svg" className="symbol-img mb-1" /> SCRT rewards from </h3>
            <h3 className="text-center pb-4"> all delegations</h3>
            {this.props.rewards ? <div className="px-4">Your current rewards amount is: <span className="coin">{Array(this.state.allRewards).toString(6).split(",").join("\n")} </span></div> : ''}
            {this.state.userHasCommission ? <div className="px-4">Your current commission amount is: <span className="coin">{Array(this.state.allCommission).toString(6).split(",").join("\n")} </span></div> : ''}
        </TabPane>
    }

    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>withdraw</span> rewards <span className="coin">{Array(this.state.allRewards).toString(6).split(",").join("\n")} </span>
            {this.state.userHasCommission ? <span> and commission <span className="coin">{Array(this.state.allCommission).toString(6).split(",").join("\n")} </span></span> : null}
            <span> with  <Fee gas={this.state.gasEstimate} />.</span>
        </span>
    }

    render = () => {
        return <span className="ledger-buttons-group float-right px-2">
            <Button color="success" size="sm" disabled={!this.props.rewards}
                onClick={() => this.openModal(Types.WITHDRAW)}>
                {TypeMeta[Types.WITHDRAW].button}
            </Button>
            {this.renderModal()}
        </span>;
    }
}

class KeplrTransferButton extends KeplrButton {

    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            total: props.total,
            transferTarget: props.address
        }
    }



    // componentDidMount() {
    //     if (!this.state.currentUser) return null;
    //     getTotalValue(this.state.currentUser.coinList, Meteor.settings.public.bondDenom);
    // }




    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        coinMaxAvailable = getTotalValue(this.state.currentUser.coinList, Meteor.settings.public.bondDenom);

        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pb-4 pt-3">Transfer <img src="/img/scrt-symbol.svg" className="symbol-img  mb-1" /> {Coin.StakingCoin.displayName}</h3>
            <FormGroup>
                <Label for="deposit" className="mb-n4"><T>common.address</T></Label>
                <InputGroup className="modal-for-ledger py-n5">
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-for-ledger"><i className="fas fa-user px-1"></i></InputGroupText>
                    </InputGroupAddon>
                    <Input name="transferTarget" onChange={this.handleInputChange}
                        placeholder="Send to" type="text"
                        value={this.state.transferTarget}
                        invalid={this.state.transferTarget != null && !isAddress(this.state.transferTarget)} className="modal-for-ledger " />
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <Label for="address" className="mb-n4"><T>validators.amount</T></Label>
                <FormText className="coin-available mb-n5 float-right">Max {new Coin(coinMaxAvailable).toString(4)}</FormText>
                <InputGroup className="modal-for-ledger py-n5" >
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-for-ledger"><img src="/img/scrt-symbol.svg" className="symbol-img " /> </InputGroupText>
                    </InputGroupAddon>
                    <Input name="transferAmount" onChange={this.handleInputChange} data-type='coin'
                        placeholder="Amount"
                        min={Coin.MinStake} max={coinMaxAvailable / Meteor.settings.public.coins[0].fraction} type="number"
                        invalid={this.state.transferAmount != null && !isBetween(this.state.transferAmount, Coin.MinStake, coinMaxAvailable)} className="modal-for-ledger " />

                    <InputGroupAddon addonType="append">
                        <InputGroupText className=" modal-for-ledger font-weight-bold">{Coin.StakingCoin.displayName}</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <InputGroup className="modal-for-ledger py-n5">
                    <Input name="memo" onChange={this.handleInputChange}
                        placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
                </InputGroup>
            </FormGroup>
        </TabPane>
    }

    supportAction(action) {
        return action === Types.SEND;
    }

    filterParams(params) {
        return {
            transferTarget: params.transferTarget
        }
    }

    isDataValid = () => {
        if (!this.state.currentUser) return false
        return isBetween(this.state.transferAmount, Coin.MinStake, coinMaxAvailable)
    }

    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>send</span> <Amount coin={this.state.transferAmount} /> to {this.state.transferTarget}
            <span> with <Fee gas={this.state.gasEstimate} />.</span>
        </span>
    }

    render = () => {
        let params = {};
        let button = TypeMeta[Types.SEND].button;
        if (this.props.address !== this.state.user) {
            params = { transferTarget: this.props.address }
            button = TypeMeta[Types.SEND].button_other
        }
        return <span className="ledger-buttons-group float-right px-2">
            <Button color="info" size="sm" onClick={() => this.openModal(Types.SEND, params)}> {button} </Button>
            {this.renderModal()}
        </span>;
    }
}

class KeplrSubmitProposalButton extends KeplrButton {

    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        coinMaxAvailable = getTotalValue(this.state.currentUser.coinList, Meteor.settings.public.bondDenom);
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pb-4 pt-3">Submit A New Proposal</h3>
            <FormGroup>
                <Label for="proposalTitle" className="mb-n4"><T>proposals.title</T></Label>
                <InputGroup className="modal-for-ledger py-n5">
                    <Input name="proposalTitle" onChange={this.handleInputChange}
                        placeholder="Title" type="text"
                        value={this.state.proposalTitle} className="modal-for-ledger " />
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <Label for="depositAmount" className="mb-n4"><T>proposals.amount</T></Label>
                <FormText className="coin-available mb-n5 float-right">Max {(new Coin(coinMaxAvailable)).toString(4)}</FormText>
                <InputGroup className="modal-for-ledger py-n5">
                    <Input name="depositAmount" onChange={this.handleInputChange}
                        data-type='coin' placeholder="Amount"
                        min={Coin.MinStake} max={coinMaxAvailable} type="number"
                        invalid={this.state.depositAmount != null && !isBetween(this.state.depositAmount, 1, coinMaxAvailable)} className="modal-for-ledger " />
                    <InputGroupAddon addonType="append">
                        <InputGroupText className=" modal-for-ledger font-weight-bold">{Coin.StakingCoin.displayName}</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <Label for="proposalDescription" className="mb-n4"><T>proposals.description</T></Label>
                <FormText className="coin-available mb-n5 float-right">Max 5000 characters</FormText>
                <InputGroup className="modal-for-ledger py-n5">
                    <Input name="proposalDescription" onChange={this.handleInputChange}
                        placeholder="Description" type="textarea" value={this.state.proposalDescription}
                        className="modal-for-ledger " />
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <Label for="memo"><T>transactions.memo</T></Label>
                <InputGroup className="modal-for-ledger py-n5">
                    <Input name="memo" onChange={this.handleInputChange}
                        placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
                </InputGroup>
            </FormGroup>
        </TabPane>
    }

    getSimulateBody(txMsg) {
        txMsg = (txMsg && txMsg.value && txMsg.value.msg &&
            txMsg.value.msg.length && txMsg.value.msg[0].value) || {}
        return {
            ...txMsg.content.value,
            initial_deposit: txMsg.initial_deposit,
            proposer: txMsg.proposer,
            proposal_type: "text"
        }
    }

    getPath = () => {
        return TypeMeta[Types.SUBMITPROPOSAL].path
    }

    supportAction(action) {
        return action === Types.SUBMITPROPOSAL;
    }


    isDataValid = () => {
        if (!this.state.currentUser) return false
        return this.state.proposalTitle != null && this.state.proposalDescription != null && this.state.proposalDescription.length <= 5000 && isBetween(this.state.depositAmount, Coin.MinStake, coinMaxAvailable)
    }

    getConfirmationMessage = () => {

        return <div className="modal-confirmation">
            <div className="text-center mb-3"> <h4>You are going to <span className='action'>submit</span> a new proposal.</h4></div>
            <div>
                <div className="d-flex"><h5><T>proposals.title</T>: </h5> <h5 className="font-weight-normal pl-1"> {this.state.proposalTitle} </h5> </div>
                <div className="d-flex"> <h5 ><T>proposals.description</T>: </h5><h5 className="font-weight-normal pl-1"> {this.state.proposalDescription}</h5> </div>
                <div className="d-flex"> <h5 ><T>proposals.initialDeposit</T>: </h5><h5 className="font-weight-normal pl-1"> <Amount coin={this.state.depositAmount} /></h5></div>
                <div className="d-flex"> <h5 ><T>proposals.fee</T>: </h5> <h5 className="font-weight-normal pl-1"> <Fee gas={this.state.gasEstimate} /></h5></div>
            </div>
        </div>
    }

    render = () => {
        return <span className="ledger-buttons-group float-right">
            <Button color="info" size="sm" onClick={() => this.openModal(Types.SUBMITPROPOSAL, {})}> {TypeMeta[Types.SUBMITPROPOSAL].button} </Button>
            {this.renderModal()}
        </span>;
    }
}

class KeplrProposalActionButtons extends KeplrButton {

    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        coinMaxAvailable = getTotalValue(this.state.currentUser.coinList, Meteor.settings.public.bondDenom);

        let inputs;
        let title;
        switch (this.state.actionType) {
        case Types.VOTE:
            title = `Vote on Proposal ${this.props.proposalId}`
            inputs = (<FormGroup>
                <Label for="proposalTitle" className="mb-n4"><T>messageTypes.vote</T></Label>
                <InputGroup className="modal-for-ledger py-n5">
                    <Input type="select" name="voteOption" onChange={this.handleInputChange} defaultValue='' placeholder="Vote" className="modal-for-ledger">
                        <option value='' disabled>Vote Option</option>
                        <option value='Yes'>Yes</option>
                        <option value='Abstain'>Abstain</option>
                        <option value='No'>No</option>
                        <option value='NoWithVeto'>No with veto</option>
                    </Input>
                </InputGroup>
            </FormGroup>
            )
            break;
        case Types.DEPOSIT:
            title = (<div>Deposit <img src="/img/scrt-symbol.svg" className="symbol-img mb-1" /> SCRT to Proposal {this.props.proposalId} </div>)
            inputs = (<FormGroup>
                <Label for="depositAmount" className="mb-n4"><T>common.amount</T></Label>
                <FormText className="coin-available mb-n5 float-right">Max {(new Coin(coinMaxAvailable)).toString(4)}</FormText>
                <InputGroup className="modal-for-ledger py-n5">
                    <Input name="depositAmount" onChange={this.handleInputChange}
                        data-type='coin' placeholder="Amount"
                        min={Coin.MinStake} max={coinMaxAvailable} type="number"
                        invalid={this.state.depositAmount != null && !isBetween(this.state.depositAmount, 1, coinMaxAvailable)} className="modal-for-ledger" />
                    <InputGroupAddon addonType="append">
                        <InputGroupText className=" modal-for-ledger font-weight-bold">{Coin.StakingCoin.displayName}</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </FormGroup>)
            break;
        }
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pb-4 pt-3">{title}</h3>
            {inputs}
            <FormGroup>
                <Label for="memo"><T>transactions.memo</T></Label>
                <InputGroup className="modal-for-ledger py-n5">
                    <Input name="memo" onChange={this.handleInputChange}
                        placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
                </InputGroup>
            </FormGroup>
        </TabPane>

    }

    /*getSimulateBody (txMsg) {
        txMsg = txMsg && txMsg.value && txMsg.value.msg &&
            txMsg.value.msg.length && txMsg.value.msg[0].value || {}
        return {...txMsg.content.value,
            initial_deposit: txMsg.initial_deposit,
            proposer: txMsg.proposer,
            proposal_type: "text"
        }
    }*/

    getPath = () => {
        let { pathPreFix, pathSuffix } = TypeMeta[this.state.actionType];
        return `${pathPreFix}/${this.props.proposalId}/${pathSuffix}`
    }

    supportAction(action) {
        return action === Types.VOTE || action === Types.DEPOSIT;
    }


    isDataValid = () => {
        if (!this.state.currentUser) return false
        if (this.state.actionType === Types.VOTE) {
            return ['Yes', 'No', 'NoWithVeto', 'Abstain'].indexOf(this.state.voteOption) !== -1;
        } else {
            return isBetween(this.state.depositAmount, Coin.MinStake, coinMaxAvailable)
        }
    }

    getConfirmationMessage = () => {
        switch (this.state.actionType) {
        case Types.VOTE:
            return <span>You are <span className='action'>voting</span> <strong>{this.state.voteOption}</strong> on proposal {this.props.proposalId}
                <span> with <Fee gas={this.state.gasEstimate} />.</span>
            </span>
            break;
        case Types.DEPOSIT:
            return <span>You are going to <span className='action'>deposit</span> <Amount coin={this.state.depositAmount} /> to proposal {this.props.proposalId}
                <span> with <Fee gas={this.state.gasEstimate} />.</span>
            </span>
            break;
        }
    }

    render = () => {
        return <span className="ledger-buttons-group float-right">
            <Row>
                <Col><Button color="secondary" size="sm"
                    onClick={() => this.openModal(Types.VOTE, {})}>
                    {TypeMeta[Types.VOTE].button}
                </Button></Col>
                <Col><Button color="success" size="sm"
                    onClick={() => this.openModal(Types.DEPOSIT, {})}>
                    {TypeMeta[Types.DEPOSIT].button}
                </Button></Col>
            </Row>
            {this.renderModal()}
        </span>;
    }
}


export {
    KeplrDelegationButtons,
    KeplrWithdrawButton,
    KeplrTransferButton,
    KeplrSubmitProposalButton,
    KeplrProposalActionButtons
}
