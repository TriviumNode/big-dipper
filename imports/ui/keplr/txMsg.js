export const DEFAULT_MEMO = 'Sent via Big Dipper'

export class txMsgs {
    constructor({ testModeAllowed }) {
        this.testModeAllowed = testModeAllowed
    }

    // Creates a new tx skeleton
    static createSkeleton(txContext, msgs = []) {
        if (typeof txContext === 'undefined') {
            throw new Error('undefined txContext');
        }
        if (typeof txContext.accountNumber === 'undefined') {
            throw new Error('txContext does not contain the accountNumber');
        }
        if (typeof txContext.sequence === 'undefined') {
            throw new Error('txContext does not contain the sequence value');
        }
        const txSkeleton = {
            type: 'cosmos-sdk/StdTx',
            value: {
                msg: msgs,
                fee: '',
                memo: txContext.memo || DEFAULT_MEMO,
                signatures: [{
                    signature: 'N/A',
                    account_number: txContext.accountNumber.toString(),
                    sequence: txContext.sequence.toString(),
                    pub_key: {
                        type: 'tendermint/PubKeySecp256k1',
                        value: txContext.pk || 'PK',
                    },
                }],
            },
        };
        //return txMsg.applyGas(txSkeleton, DEFAULT_GAS);
        return txSkeleton
    }

    // Returns fraction value of a token
    static coinFraction(coin) {
        let coinName = coin?.toLowerCase()
        let findCoin = Meteor.settings.public.coins.find(({ denom }) => denom === coinName);
        let fraction = findCoin ? findCoin.fraction : 0;
        return fraction;
    }

    // Creates a new delegation tx based on the input parameters
    // the function expects a complete txContext
    static createDelegate(
        txContext,
        validatorBech32,
        uatomAmount
    ) {
        const txMsg = {
            type: 'cosmos-sdk/MsgDelegate',
            value: {
                amount: {
                    amount: uatomAmount.toString(),
                    denom: txContext.denom,
                },
                delegator_address: txContext.bech32,
                validator_address: validatorBech32,
            },
        };
        return txMsgs.createSkeleton(txContext, [txMsg]);
    }

    // Creates a new undelegation tx based on the input parameters
    // the function expects a complete txContext
    static createUndelegate(
        txContext,
        validatorBech32,
        uatomAmount
    ) {
        const txMsg = {
            type: 'cosmos-sdk/MsgUndelegate',
            value: {
                amount: {
                    amount: uatomAmount.toString(),
                    denom: txContext.denom,
                },
                delegator_address: txContext.bech32,
                validator_address: validatorBech32,
            },
        };

        return txMsgs.createSkeleton(txContext, [txMsg]);
    }

    // Creates a new redelegation tx based on the input parameters
    // the function expects a complete txContext
    static createRedelegate(
        txContext,
        validatorSourceBech32,
        validatorDestBech32,
        uatomAmount
    ) {
        const txMsg = {
            type: 'cosmos-sdk/MsgBeginRedelegate',
            value: {
                amount: {
                    amount: uatomAmount.toString(),
                    denom: txContext.denom,
                },
                delegator_address: txContext.bech32,
                validator_dst_address: validatorDestBech32,
                validator_src_address: validatorSourceBech32,
            },
        };

        return txMsgs.createSkeleton(txContext, [txMsg]);
    }

    // Creates a new transfer tx based on the input parameters
    // the function expects a complete txContext
    static createTransfer(
        txContext,
        toAddress,
        amount
    ) {
        const txMsg = {
            type: 'cosmos-sdk/MsgSend',
            value: {
                amount: [{
                    amount: amount.toString(),
                    denom: txContext.denom
                }],
                from_address: txContext.bech32,
                to_address: toAddress
            }
        };

        return txMsgs.createSkeleton(txContext, [txMsg]);
    }

    static createSubmitProposal(
        txContext,
        title,
        description,
        deposit
    ) {
        const txMsg = {
            type: 'cosmos-sdk/MsgSubmitProposal',
            value: {
                content: {
                    type: "cosmos-sdk/TextProposal",
                    value: {
                        description: description,
                        title: title
                    }
                },
                initial_deposit: [{
                    amount: deposit.toString(),
                    denom: txContext.denom
                }],
                proposer: txContext.bech32
            }
        };

        return txMsgs.createSkeleton(txContext, [txMsg]);
    }

    static createVote(
        txContext,
        proposalId,
        option,
    ) {
        const txMsg = {
            type: 'cosmos-sdk/MsgVote',
            value: {
                option,
                proposal_id: proposalId.toString(),
                voter: txContext.bech32
            }
        };

        return txMsgs.createSkeleton(txContext, [txMsg]);
    }

    static createDeposit(
        txContext,
        proposalId,
        amount,
    ) {
        const txMsg = {
            type: 'cosmos-sdk/MsgDeposit',
            value: {
                amount: [{
                    amount: amount.toString(),
                    denom: txContext.denom
                }],
                depositor: txContext.bech32,
                proposal_id: proposalId.toString()
            }
        };

        return txMsgs.createSkeleton(txContext, [txMsg]);
    }
}