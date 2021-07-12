import { Meteor } from 'meteor/meteor';
import { Contracts } from '../contracts.js';
import { Blockscon } from '../../blocks/blocks.js';
import { Transactions } from '../../transactions/transactions.js';


publishComposite('contracts.list', function(limit = 30){
    return {
        find(){
            return Contracts.find({},{sort:{height:-1}, limit:limit})
        }
    }
});

publishComposite('contracts.findOne', function(addr){
    return {
        find(){
            return Contracts.find({address:addr})
        }
    }
})

publishComposite('contracts.executions', function(contractAddress){
    let query = {
        $and: [{ "tx.value.msg.0.type": "wasm/MsgExecuteContract" },
            { "tx.value.msg.0.value.contract":contractAddress }
        ]}
        return {
            find(){
                return Transactions.find(query).length
            }
        }
})

publishComposite('contracts.transactions', function(contractAddress, limit=100){
    let query = {};
    query = {"tx.value.msg.0.value.contract":contractAddress}


    return {
        find(){
            return Transactions.find(query, {sort:{height:-1}, limit:limit})
        },
        children:[
            {
                find(tx){
                    return Blockscon.find(
                        {height:tx.height},
                        {fields:{time:1, height:1}}
                    )
                }
            }
        ]
    }
})