import { HTTP } from 'meteor/http';

Meteor.methods({
    'transaction.submitKeplr': function (txInfo) {
        this.unblock();
        const url = `${LCD}/txs`;
        data = {
            "tx": txInfo,
            "mode": "sync"
        }
        const timestamp = new Date().getTime();
        console.log(`submitting transaction${timestamp} ${url} with data ${JSON.stringify(data)}`)

        let response = HTTP.post(url, { data });
        console.log(`response for transaction${timestamp} ${url}: ${JSON.stringify(response)}`)
        if (response.statusCode == 200) {
            let data = response.data
            if (data.code)
                throw new Meteor.Error(data.code, JSON.parse(data.raw_log).message)
            return response.data.txhash;
        }
    },
    'transaction.executeKeplr': function(body, path) {
        this.unblock();
        const url = `${LCD}/${path}`;
        data = {
            "base_req": {
                ...body,
                "chain_id": Meteor.settings.public.chainId,
                "simulate": false
            }
        };
        let response = HTTP.post(url, {data});
        if (response.statusCode == 200) {
            return JSON.parse(response.content);
        }
    },
    'transaction.simulateKeplr': function(txMsg, from, path, adjustment='1.2') {
        console.log(txMsg)
        console.log(from)
        console.log(path)
        this.unblock();
        const url = `${LCD}/${path}`;
        console.log(url)
        data = {...txMsg,
            "base_req": {
                "from": from,
                "chain_id": Meteor.settings.public.chainId,
                "gas_adjustment": adjustment,
                "simulate": true
            }
        };
        let response = HTTP.post(url, {data});
        if (response.statusCode == 200) {
            return JSON.parse(response.content).gas_estimate;
        }
    },
})