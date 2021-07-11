import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Link } from 'react-router-dom';
import { Validators } from '/imports/api/validators/validators.js';
import { Contracts } from '/imports/api/contracts/contracts.js';

const AddressLength = 40;

export default class Account extends Component{
    constructor(props){
        super(props);

        this.state = {
            link: `/account/${this.props.address}`,
            address: this.props.address,
            moniker: this.props.address,
            validator: null,
            contract: false
        }
    }

    getFields() {
        return {address:1, description:1, operator_address:1, delegator_address:1, profile_url:1};
    }

    //this shit doesnt even run
    getAccount = () => {
        let address = this.props.address;
        let caddress = this.props.address;
        console.log(this.props.address);
        let validator = Validators.findOne(
            {$or: [{operator_address:address}, {delegator_address:address}, {address:address}]},
            {fields: this.getFields() });
        if (validator)
            this.setState({
                link: `/validator/${validator.address}`,
                address: validator.address,
                moniker: validator.description?validator.description.moniker:validator.operator_address,
                validator: validator,
                contract: false
            });
        else
            console.log(this.state)
            if (this.state.contract) //i dont fucking know
                this.setState({
                    link: `/contracts/${address}`,
                    address: address,
                    moniker: address,
                    validator: null,
                    contract: true
                });
            else
                this.setState({
                    link: `/aaccount/${address}`,
                    address: address,
                    moniker: address,
                    validator: null,
                    contract: false
                });
    }

    updateAccount = () => {
        let address = this.props.address;
        Meteor.call('Transactions.findUser', this.props.address, this.getFields(), (error, result) => {
            if (result){
                // console.log(result);
                this.setState({
                    link: `/validator/${result.address}`,
                    address: result.address,
                    moniker: result.description?result.description.moniker:result.operator_address,
                    validator: result,
                    contract: false
                });
            }
        })
        Meteor.call('Contracts.findOne', this.props.address, (error, result) => {
            if (error) {
                console.log(error);
            }
            if (result) {
                this.setState({
                    link: `/contracts/${result.address}`,
                    address: result.address,
                    moniker: result.address,
                    validator: null,
                    contract: true
                });
            }
        })
    }
    componentDidMount(){
        if (this.props.sync)
            this.getAccount();
        else
            this.updateAccount();
    }

    componentDidUpdate(prevProps){      
        if (this.props.address != prevProps.address){
            if (this.props.sync) {
                this.getAccount();
            }
            if (this.state.contract) {
                this.setState({
                    link: `/contracts/${this.props.address}`,
                    address: this.props.address,
                    moniker: this.props.address,
                    validator: null,
                    contract: true
                });
            }
            else {
                this.setState({
                    link: `/account/${this.props.address}`,
                    address: this.props.address,
                    moniker: this.props.address,
                    validator: null,
                    contract: false
                });
                this.updateAccount();
            }
        }
    }

    userIcon(){
        let signedInAddress = localStorage.getItem(CURRENTUSERADDR);
        if (signedInAddress === this.props.address) {
            return <i className="material-icons account-icon">account_box</i>
        }
    }

    render(){
        return <span className={(this.props.copy)?"address overflow-auto d-inline-block copy":"address overflow-auto d-inline"} >
            <Link to={this.state.link}>{this.userIcon()}{this.state.moniker}</Link>
        </span>
    }
}
