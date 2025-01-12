import React, { Component } from 'react';
import { Card, CardHeader, CardBody, Container, Row, Col, Spinner } from 'reactstrap';
import TransactionTabs from '../transactions/TransactionTabs.jsx';
import i18n from 'meteor/universe:i18n';

const T = i18n.createComponent();

export default class ValidatorTransactions extends Component{
    constructor(props){
        super(props);
        this.state = {
            activeTab: this.props.activeTab || "tx-transfer",
            transferTxs: {},
            contractTxs: {},
            stakingTxs: {},
            distributionTxs: {},
            governanceTxs: {},
            slashingTxs: {},
        };  
    }

    componentDidUpdate(prevProps){
        if (this.props != prevProps){
            if (this.props.transactionsExist){
                // console.log("have txs.");
                this.setState({
                    transferTxs: this.props.transferTxs,
                    contractTxs: this.props.contractTxs,
                    stakingTxs: this.props.stakingTxs,
                    distributionTxs: this.props.distributionTxs,
                    governanceTxs: this.props.governanceTxs,
                    slashingTxs: this.props.slashingTxs
                })
            }
        }
    }

    render(){
        if (this.props.loading){
            return <Spinner color="primary" type="glow" />
        }
        else if (this.props.transactionsExist){
            return <TransactionTabs 
                activeTab={this.state.activeTab}
                transferTxs={this.state.transferTxs}
                contractTxs={this.state.contractTxs}
                stakingTxs={this.state.stakingTxs}
                distributionTxs={this.state.distributionTxs}
                governanceTxs={this.state.governanceTxs}
                slashingTxs={this.state.slashingTxs}
            />
        }
        else {
            return <Card body>
                <T>transactions.noValidatorTxsFound</T>
            </Card>
        }
    }
}