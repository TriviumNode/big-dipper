import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import Contract from './Contract.jsx';

export default ContractContainer = withTracker((props) => {
    let ctAddr = props.match.params.address;
    let contractsHandle, contract, contractExist;
    let loading = false;

    if (Meteor.isClient){
        contractsHandle = Meteor.subscribe('contracts.findOne', ctAddr);
        loading = !contractsHandle.ready();
    }

    if (Meteor.isServer || !loading){
        contract = Contracts.findOne({address: ctAddr});

        if (Meteor.isServer){
            loading = false;
            contractExist = !!contract;
        }
        else{
            contractExist = !loading && !!contract;
        }
        if (props.location.search === '?new' && !contractExist) {
            loading = true;
        }
    }

    return {
        loading,
        contractExist,
        contract: contractExist ? contract : {}
    };
})(Contract);