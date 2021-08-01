import { Meteor } from 'meteor/meteor';
import { Contracts } from '../contracts.js';
import { Blockscon } from '../../blocks/blocks.js';
import { Transactions } from '../../transactions/transactions.js';


publishComposite('secretcontracts.tokenlist', function(limit = 30){
    return {
        find(){
            return Contracts.find({ snip20: true },{sort:{height:-1}, limit:limit})
        }
    }
});