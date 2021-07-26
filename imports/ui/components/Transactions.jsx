import React, { Component } from 'react';
import { Card, CardHeader, CardBody, Container, Row, Col, Spinner } from 'reactstrap';
import TransactionTabs from '../transactions/TransactionTabs.jsx';
import i18n from 'meteor/universe:i18n';
import { Keplr } from '../keplr/keplr.js';
const cloneDeep = require('lodash/cloneDeep');


const T = i18n.createComponent();

export default class ValidatorTransactions extends Component{
    constructor(props){
        super(props);
        this.WKeplr = new Keplr({ testModeAllowed: false });
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
                var decryptedContractTxs = [];
                if (this.props.contractTxs.length > 0) {
                    
                    for (let i in this.props.contractTxs) {
                        //console.log(this.props.contractTxs[i]);
                        this.WKeplr.decryptTx(this.props.contractTxs[i]).then((decrypted) => {
                            //console.log(decrypted);

                            //let newTxs = cloneDeep(this.state.contractTxs)
                            //newTxs[i] = decrypted;
                            //newTxs[i]['decrypted'] = true;
                            //console.log(newTxs);
                            //this.setState({
                            //    contractTxs: newTxs
                            //})

                            decryptedContractTxs[i] = decrypted;
                        })
                    } 



                }

                this.setState({
                    transferTxs: this.props.transferTxs,
                    contractTxs: this.props.contractTxs,
                    decryptedContractTxs: decryptedContractTxs,
                    stakingTxs: this.props.stakingTxs,
                    distributionTxs: this.props.distributionTxs,
                    governanceTxs: this.props.governanceTxs,
                    slashingTxs: this.props.slashingTxs
                })
                // console.log("have txs.");

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
                decryptedContractTxs={this.state.decryptedContractTxs}
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