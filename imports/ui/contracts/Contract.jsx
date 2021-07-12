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
                        <title>Contract {tx.label} on Cosmos Hub | The Big Dipper</title>
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
                        <div className="card-header"><T>common.information</T></div>
                        <CardBody>
                            <Row>
                                <Col md={4} className="label"><T>common.address</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.address}</Col>
                                <Col md={4} className="label"><T>contracts.label</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.label}</Col>
                                <Col md={4} className="label"><T>contracts.creator</T></Col>
                                <Col md={8} className="value"><Account address={tx.creator}/></Col>
                                <Col md={4} className="label"><T>contracts.codeId</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.code_id}</Col>
                                {/*
                                <Col md={4} className="label"><T>transactions.executions</T></Col>
                                <Col md={8} className="value">{execs}</Col>
                                
                                <Col md={4} className="label"><T>transactions.memo</T></Col>
                                <Col md={8} className="value"><Markdown markup={tx?.tx?.value?.memo} /></Col>
                                */}

                            </Row>


                        </CardBody>
                    </Card>
                    {tx.token_info?
                    <Card>
                        <div className="card-header"><T>common.snip20info</T></div>
                        <CardBody>
                            <Row>
                                <Col md={4} className="label"><T>common.name</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.token_info.name}</Col>
                                <Col md={4} className="label"><T>common.symbol</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.token_info.symbol}</Col>
                                <Col md={4} className="label"><T>common.decimals</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.token_info.decimals}</Col>
                                <Col md={4} className="label"><T>common.total_supply</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{coinConvert(tx.token_info.total_supply, tx.token_info.decimals, 'human', 4)}</Col>
                            </Row>
                        </CardBody>
                    </Card>:null}
                    {tx.bridge_info?
                    <Card>
                        <div className="card-header"><T>common.brodgeinfo</T></div>
                        <CardBody>
                            <Row>
                                <Col md={4} className="label"><T>common.name</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.bridge_info.name}</Col>
                                <Col md={4} className="label"><T>common.symbol</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.bridge_info.symbol}</Col>
                                <Col md={4} className="label"><T>common.source</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.bridge_info.src_network}</Col>
                                <Col md={4} className="label"><T>common.sourceaddr</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.bridge_info.src_address}</Col>
                            </Row>
                        </CardBody>
                    </Card>:null}
                    {tx.sswap_info?
                    <Card>
                        <div className="card-header"><T>common.swapinfo</T></div>
                        <CardBody>
                            <Row>
                                <Col md={4} className="label"><T>common.name</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.name}</Col>
                                <Col md={4} className="label"><T>common.desc</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.description}</Col>
                                <Col md={4} className="label"><T>common.lptoken</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.sswap_info.lp_token_addr}</Col>
                                <Col md={4} className="label"><T>common.assets</T></Col>
                                <Col md={8} className="value text-nowrap overflow-auto address">{tx.sswap_info.assets[0].address}<br/>{tx.sswap_info.assets[1].address}</Col>
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