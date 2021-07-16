import { Meteor } from 'meteor/meteor';
import { BulkWriteError } from 'meteor/mongo';
import { HTTP } from 'meteor/http';
import { Transactions } from '../../transactions/transactions.js';
import { Contracts, Contract } from '../../contracts/contracts.js';
import { error } from 'jquery';
//import { Validators } from '../../validators/validators.js';
//const { EnigmaUtils } = require('secretjs');

const AddressLength = 40;
const infoQuery = {"token_info":{}};
const queryProxy = "http://anode1.trivium.xiphiar.com/queryProxy.php"
const bridgeAPI = "https://api-bridge-mainnet.azurewebsites.net"
//const secretjs = new CosmWasmClient(Meteor.settings.remote.lcd);
//const enigmautils = new EnigmaUtils(Meteor.settings.remote.lcd);


Meteor.methods({
    'secretswaps.swaplist': async function () {
        //console.log("Counting tokens...");
        this.unblock();            
        //const contracts = Transactions.find({ processed: false }, { limit: 500 }).fetch();
        
        const contracts = Contracts.find({ secretSwapPair: true },
        ).fetch();
        //console.log(contracts[22]);
        //console.log(trans[80].tx.value.msg);
        //console.log("CONTRACTSSSS:", contracts.length);
        return contracts;
    },
    'secretswaps.userSwaps': async function (userAddress) {
        console.log("USERSWAPS...");
        this.unblock();            
        //const contracts = Transactions.find({ processed: false }, { limit: 500 }).fetch();
        var usedSwaps = [];
        let swaps = Meteor.call('secretswaps.swaplist');
        for (let i in swaps) {
            let yes = Transactions.find({$and: [
                    { "tx.value.msg.0.value.contract": swaps[i].address },
                    { "tx.value.msg.0.value.sender": userAddress }
                ]}, { limit: 1}).fetch();
            //console.log(yes.length);

            if (yes.length > 0) {
                usedSwaps.push(swaps[i]);
                //console.log(usedSwaps.length);
            }
        }

        //const contracts = Contracts.find({ secretSwapPair: true },
        //).fetch();
        //console.log(contracts[22]);
        //console.log(trans[80].tx.value.msg);
        //console.log("CONTRACTSSSS:", contracts.length);
        return usedSwaps;
    },
    /*
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
    */
});