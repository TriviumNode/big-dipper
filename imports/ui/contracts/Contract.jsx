import React, { Component } from 'react';
import { Container, Row, Col, Card, CardBody, Alert, Spinner } from 'reactstrap';
import { TxIcon } from '../components/Icons.jsx';
import Activities from '../components/Activities.jsx';
import AccountTransactions from './TransactionsContainer.js';
import CosmosErrors from '../components/CosmosErrors.jsx';
import { Link } from 'react-router-dom';
import { Markdown } from 'react-showdown';
import numbro from 'numbro';
import { Helmet } from 'react-helmet';
import i18n from 'meteor/universe:i18n';
import Coin from '/both/utils/coins.js';
import TimeStamp from '../components/TimeStamp.jsx';
import Account from '../components/Account.jsx';
import { coinConvert } from '@stakeordie/griptape.js'

const T = i18n.createComponent();
export default class Contract extends Component {
    constructor(props) {
        super(props);
        let showdown = require('showdown');
        showdown.setFlavor('github');
        let denom = this.props.denom;
    }

    render() {


        if (this.props.loading) {
            return <Container id="transaction">
                <Spinner type="grow" color="primary" />
            </Container>
        }
        else {
            if (this.props.contractExist) {
                let tx = this.props.contract;
                console.log(tx);
                return <Container id="transaction">
                    <Helmet>
                        <title>Contract {tx.label} on {Meteor.settings.public.chainName} | {Meteor.settings.public.explorerName}</title>
                        <meta name="description" content={"Details of contract " + tx.address} />
                    </Helmet>
                    <h4><T>contracts.contract</T> {tx.address}</h4>
                    {(tx.code) ? <Row><Col xs={{ size: 12, order: "last" }} className="error">
                        <Alert color="danger">
                            <CosmosErrors
                                code={tx.code}
                                codespace={tx.codespace}
                                log={tx.raw_log}
                            />
                        </Alert>
                    </Col></Row> : ''}
                    <Card>
                        <div className="card-header"><T>contracts.contract_info</T></div>
                        <CardBody>
                            <Row>
                                <Col md={3} className="label"><T>common.address</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto address">{tx.address}</Col>
                                <Col md={3} className="label"><T>contracts.creator</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto address"><Account address={tx.creator}/></Col>
                                <Col md={3} className="label"><T>contracts.codeId</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto">{tx.code_id}</Col>
                                <Col md={3} className="label"><T>contracts.label</T></Col>
                                <Col md={9} className="value overflow-auto">{tx.label}</Col>
                                {/*
                                <Col md={3} className="label"><T>transactions.executions</T></Col>
                                <Col md={9} className="value">{execs}</Col>
                                
                                <Col md={3} className="label"><T>transactions.memo</T></Col>
                                <Col md={9} className="value"><Markdown markup={tx?.tx?.value?.memo} /></Col>
                                */}

                            </Row>


                        </CardBody>
                    </Card>
                    {tx.token_info?
                    <Card>
                        <div className="card-header"><T>contracts.token_info</T></div>
                        <CardBody>
                            <Row>
                                <Col md={3} className="label"><T>contracts.name</T></Col>
                                <Col md={9} className="value overflow-auto">{tx.token_info.name}</Col>
                                <Col md={3} className="label"><T>contracts.symbol</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto">{tx.token_info.symbol}</Col>
                                <Col md={3} className="label"><T>contracts.decimals</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto">{tx.token_info.decimals}</Col>
                                {contracts.total_supply?
                                    <Col md={3} className="label"><T>contracts.total_supply</T></Col>
                                    : null }
                                {contracts.total_supply?
                                    <Col md={9} className="value text-nowrap overflow-auto">{coinConvert(tx.token_info.total_supply, tx.token_info.decimals, 'human', 4)}</Col>
                                : null }
                            </Row>
                        </CardBody>
                    </Card>:null}
                    {tx.bridge_info?
                    <Card>
                        <div className="card-header"><T>contracts.bridge_info</T></div>
                        <CardBody>
                            <Row>
                                <Col md={3} className="label"><T>contracts.name</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto">{tx.bridge_info.name}</Col>
                                <Col md={3} className="label"><T>contracts.symbol</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto">{tx.bridge_info.symbol}</Col>
                                <Col md={3} className="label"><T>contracts.source_network</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto">{tx.bridge_info.src_network}</Col>
                                <Col md={3} className="label"><T>contracts.sourceaddr</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto address">{tx.bridge_info.src_address}</Col>
                            </Row>
                        </CardBody>
                    </Card>:null}
                    {tx.sswap_info?
                    <Card>
                        <div className="card-header"><T>contracts.secretswap_info</T></div>
                        <CardBody>
                            <Row>
                                <Col md={3} className="label"><T>contracts.name</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto address">{tx.name}</Col>
                                {/*
                                <Col md={3} className="label"><T>contracts.desc</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto address">{tx.description}</Col>
                                */}
                                <Col md={3} className="label"><T>contracts.lptoken</T></Col>
                                <Col md={9} className="value text-nowrap overflow-auto address"><Account address={tx.sswap_info.lp_token_addr}/></Col>
                                <Col md={3} className="label"><T>contracts.swap_tokens</T></Col>
                                <Col md={2}  className="value text-nowrap overflow-auto address">{tx.sswap_info.assets[0].symbol}<br/>{tx.sswap_info.assets[1].symbol}</Col>
                                <Col md={7} className="value text-nowrap overflow-auto address"><Account address={tx.sswap_info.assets[0].address}/><br/><Account address={tx.sswap_info.assets[1].address}/></Col>
                            </Row>
                        </CardBody>
                    </Card>:null}

                    <AccountTransactions address={tx.address} limit={100} activeTab="tx-contract"/>
                </Container>
            }
            else {
                return <Container id="transaction"><div><T>transactions.noTxFound</T></div></Container>
            }
        }
    }
}