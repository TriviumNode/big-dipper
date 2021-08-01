import { Meteor } from 'meteor/meteor';
import { Contracts } from '../contracts.js';
import { Blockscon } from '../../blocks/blocks.js';
import { Transactions } from '../../transactions/transactions.js';


//todo: do something useful here
publishComposite('secretswap.list', function(limit = 30){
    return {
        find(){
            return Contracts.find({},{sort:{height:-1}, limit:limit})
        }
    }
});

publishComposite('secretswap.findOne', function(addr){
    return {
        find(){
            return Contracts.find({address:addr})
        }
    }
})