import { Meteor } from 'meteor/meteor';
import { BulkWriteError } from 'meteor/mongo';
import { HTTP } from 'meteor/http';
import { Transactions } from '../../transactions/transactions.js';
import { Contracts, Contract } from '../../contracts/contracts.js';
import { error } from 'jquery';
//import { Validators } from '../../validators/validators.js';

const AddressLength = 40;

Meteor.methods({
    //todo: do something useful here
    'secretswap.showSwaps': async function () {
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
    'secretswap.findOne': function(contractAddress){
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