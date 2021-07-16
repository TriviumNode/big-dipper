
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Alert, UncontrolledPopover, PopoverHeader, PopoverBody } from 'reactstrap';
import { TxIcon } from '../components/Icons.jsx';
import Activities from '../components/Activities.jsx';
import CosmosErrors from '../components/CosmosErrors.jsx';
import TimeAgo from '../components/TimeAgo.jsx';
import numbro from 'numbro';
import Coin from '/both/utils/coins.js'
import SentryBoundary from '../components/SentryBoundary.jsx';
import { Markdown } from 'react-showdown';

let showdown = require('showdown');
showdown.setFlavor('github');

export const ContractRow = (props) => {

    return <SentryBoundary><Row className="tx-info"> {/*className={(tx.code) ? "tx-info invalid" : "tx-info"}*/}
        
        <Col xs={12} lg={5}>
            <Link to={"/contracts/"+props.ct.address}>{props.ct.name?props.ct.name:props.ct.label}</Link>
        </Col>

        <Col xs={5} lg={3} className="address text-truncate">
            <span>{props.ct.address}</span>
        </Col>

        <Col xs={2} lg={1}>
            <span>{props.ct.code_id}</span>
        </Col>

        <Col xs={5} lg={3} className="address text-truncate">
            <span>{props.ct.creator}</span>
        </Col>
    </Row></SentryBoundary>
}