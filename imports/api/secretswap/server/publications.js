import { Meteor } from 'meteor/meteor';
import { Contracts } from '../contracts.js';
import { Blockscon } from '../../blocks/blocks.js';
import { Transactions } from '../../transactions/transactions.js';


publishComposite('secretswaps.list', function(limit = 250){
    return {
        find(){
            return Contracts.find({secretSwapPair: true},{sort:{height:-1}, limit:limit})
        }
    }
});

publishComposite('secretswaps.findOne', function(addr){
    return {
        find(){
            return Contracts.find({address:addr})
        }
    }
})