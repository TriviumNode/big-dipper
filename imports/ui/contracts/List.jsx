import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Alert, Spinner } from 'reactstrap';
import { TxIcon } from '../components/Icons.jsx';
import Activities from '../components/Activities.jsx';
import CosmosErrors from '../components/CosmosErrors.jsx';
import TimeAgo from '../components/TimeAgo.jsx';
import numbro from 'numbro';
import { ContractRow } from './ContractRow.jsx';
import i18n from 'meteor/universe:i18n';

const T = i18n.createComponent();
export default class Contracts extends Component {
    constructor(props) {
        super(props);
        this.state = {
            cts: ""
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props != prevProps) {
            if (this.props.contracts.length > 0) {
                this.setState({
                    cts: this.props.contracts.map((ct, i) => {
                        return <ContractRow
                            key={i}
                            index={i}
                            ct={ct}
                        />
                    })
                })
            }
        }
    }

    render() {
        if (this.props.loading) {
            return <Spinner type="grow" color="primary" />
        }
        else if (!this.props.contractsExist) {
            return <div><T>transactions.notFound</T></div>
        }
        else {
            return <div className="transactions-list">
                <Row className="header text-nowrap d-none d-lg-flex">
                    <Col xs={12} lg={5}><i className="material-icons">message</i> <span className="d-none d-md-inline-block"><T>contracts.label</T></span></Col>
                    <Col xs={4} lg={3}><i className="material-icons">monetization_on</i> <span className="d-none d-md-inline-block"><T>common.address</T></span></Col>
                    <Col xs={4} lg={1}><i className="fas fa-database"></i> <span className="d-none d-md-inline-block"><T>contracts.codeId</T></span></Col>
                    <Col xs={4} lg={3}><i className="material-icons">monetization_on</i> <span className="d-none d-md-inline-block"><T>contracts.creator</T></span></Col>
                </Row>
                {this.state.cts}
            </div>
        }
    }
}