import { Mongo } from 'meteor/mongo';
import { Blockscon } from '../blocks/blocks.js';
import { TxIcon } from '../../ui/components/Icons.jsx';
import { string } from 'prop-types';

export const Contracts = new Mongo.Collection('contracts');

Contracts.helpers({
    block(){
        return Blockscon.findOne({height:this.height});
    }
})