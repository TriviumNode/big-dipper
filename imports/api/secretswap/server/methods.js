import { Meteor } from 'meteor/meteor';
import { BulkWriteError } from 'meteor/mongo';
import { HTTP } from 'meteor/http';
import { Transactions } from '../../transactions/transactions.js';
import { Contracts, Contract } from '../../contracts/contracts.js';
import { error } from 'jquery';
//import { Validators } from '../../validators/validators.js';

const AddressLength = 40;

Meteor.methods({
    'Contracts.updateContracts': async function () {
        //console.log("Updating contracts...");
        this.unblock();
        if (CTSYNCING)
            return "Updating contracts...";

            
        //const contracts = Transactions.find({ processed: false }, { limit: 500 }).fetch();
        
        const contracts = Transactions.find({
            $and: [{
                $or: [
                        { "tx.value.msg.0.type": "wasm/MsgExecuteContract" },
                        { "tx.msgType": "wasm/MsgMsgClearAdmin" },
                        { "tx.msgType": "wasm/MsgInstantiateContract" },
                        { "tx.msgType": "wasm/MsgMigrateContract" },
                        { "tx.msgType": "wasm/MsgStoreCode" },
                        { "tx.msgType": "wasm/MsgUpdateAdmin" }
                    ]
                },
                { contractProcessed: false }
            ]
            //"code": 0,
            //height: { $lt: height }
        },
        {
            //sort: { height: -1 },
            limit: 10,
            //projection: { 'tx.type': 1 }
        }
        ).fetch();

        try {
            CTSYNCING = true;
            const bulkContracts = Contracts.rawCollection().initializeUnorderedBulkOp();
            const bulkTransactions = Transactions.rawCollection().initializeUnorderedBulkOp();
            for (let i in contracts) {
                let url = "";
                var address = "";
                //TODO: Look at other contract message types
                if (contracts[i].tx.value.msg[0].type.includes("Instantiate") ) {
                    address = contracts[i].logs[0].events[0].attributes[4].value;
                } else {
                    address = contracts[i].tx.value.msg[0].value.contract;
                }
                
                try {
                    url = LCD + '/wasm/contract/' + address;
                    let response = HTTP.get(url);
                    let ct = JSON.parse(response.content || response);
                    //console.log(ct);
                
                    ct.result.advProcessed = false;

                    bulkTransactions.find({ txhash: contracts[i].txhash }).updateOne({ $set: { contractProcessed: true }});
                    bulkContracts.insert(ct.result);
                    //console.log("would insert:");
                    //console.log(ct.result);

                }
                catch (e) {

                    console.log("Getting contract ", address);
                    console.log(contracts[i]);
                    console.log(e);
                    //bulkContracts.find({ txhash: transactions[i].txhash }).updateOne({ $set: { processed: false, missing: true } });
                }
            }
            
            if (bulkContracts.length > 0) {
                console.log("Contracts to insert: %o", bulkContracts.length)
                bulkContracts.execute((err, result) => {
                    if (err) {
                        if (err.code === 11000) {
                            console.log("duplicate contract.")
                        } else {
                            console.log(err);
                        }
                    }
                    if (result) {
                        //console.log(result);
                    }
                });
            }
            
            if (bulkTransactions.length > 0) {
                //console.log("Contract transactions to update: %o", bulkTransactions.length)
                bulkTransactions.execute((err, result) => {
                    if (err) {
                        console.log(err);
                    }
                    if (result) {
                        //console.log(result);
                    }
                });
            }
        }
        catch (e) {
            console.log("caught!:")
            console.log(e);
            CTSYNCING = false;
            return e
        }
        CTSYNCING = false;
        return contracts.length
    },
    'Contracts.showContracts': async function () {
        console.log("Finding contracts...");
        this.unblock();
        if (CTSYNCING)
            return "Updating contracts...";

            
        //const contracts = Transactions.find({ processed: false }, { limit: 500 }).fetch();
        
        const contracts = Contracts.find({},
        {
            //sort: { height: -1 },
            limit: 100,
            //projection: { 'tx.type': 1 }
        }
        ).fetch();
        //console.log(trans);
        //console.log(trans[80].tx.value.msg);
        //console.log("CONTRACTSSSS:", contracts.length);
        return contracts.length;
    },
    'Contracts.executions': function(contractAddress){
        this.unblock();
        if (CTSYNCING)
            return "Updating contracts...";

            
        //const contracts = Transactions.find({ processed: false }, { limit: 500 }).fetch();
        let query = {
            $and: [{ "tx.value.msg.0.type": "wasm/MsgExecuteContract" },
                { "tx.value.msg.0.value.contract":contractAddress }
            ]}
        const contracts = Transactions.find(query).fetch();

        return contracts.length;
    },
    'Contracts.findOne': function(contractAddress){
        this.unblock();
        if (CTSYNCING)
            return false;

        let query = {address:contractAddress}
        const contract = Contracts.findOne({address:contractAddress});

        if (contract) {
            return contract;
        }
        return false;
        
    }
});