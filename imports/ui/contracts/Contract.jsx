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
                                <Col md={8} className="value">
                                    <Link to={"/address/" + tx.creator}>{tx.creator}</Link>
                                </Col>
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
                    <AccountTransactions address={tx.address} limit={100} activeTab="tx-contract"/>
                </Container>
            }
            else {
                return <Container id="transaction"><div><T>transactions.noTxFound</T></div></Container>
            }
        }
    }
}