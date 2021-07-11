import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { Contracts } from '/imports/api/contracts/contracts.js';
import List from './List.jsx';

export default ValidatorDetailsContainer = withTracker((props) => {
    let contractsHandle, contracts, contractsExist;
    let loading = true;

    if (Meteor.isClient){
        contractsHandle = Meteor.subscribe('contracts.list', props.limit);
        loading = (!contractsHandle.ready() && props.limit == Meteor.settings.public.initialPageSize);
    }

    if (Meteor.isServer || !loading){
        contracts = Contracts.find({}, {sort:{height:-1}}).fetch();

        if (Meteor.isServer){
            // loading = false;
            contractsExist = !!contracts;
        }
        else{
            contractsExist = !loading && !!contracts;
        }
    }
    
    return {
        loading,
        contractsExist,
        contracts: contractsExist ? contracts : {},
    };
})(List);