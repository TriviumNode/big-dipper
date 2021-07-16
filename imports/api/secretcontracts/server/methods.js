import { Meteor } from 'meteor/meteor';
import { BulkWriteError } from 'meteor/mongo';
import { HTTP } from 'meteor/http';
import { Transactions } from '../../transactions/transactions.js';
import { Contracts, Contract } from '../../contracts/contracts.js';
import { error } from 'jquery';
//import { Validators } from '../../validators/validators.js';
//const { EnigmaUtils } = require('secretjs');

const AddressLength = 40;
const infoQuery = {"token_info":{}};
const queryProxy = "http://anode1.trivium.xiphiar.com/queryProxy.php"
const bridgeAPI = "https://api-bridge-mainnet.azurewebsites.net"
//const secretjs = new CosmWasmClient(Meteor.settings.remote.lcd);
//const enigmautils = new EnigmaUtils(Meteor.settings.remote.lcd);


Meteor.methods({
    'SecretContracts.updateContracts': async function () {
        console.log("Updating token_info...");
        this.unblock();
        if (SCTSYNCING)
            return "Already updating token_info...";

            
        //const contracts = Transactions.find({ processed: false }, { limit: 500 }).fetch();
        
        const contracts = Contracts.find({ advProcessed: false },
        {
            //sort: { height: -1 },
            limit: 10,
            //projection: { 'tx.type': 1 }
        }
        ).fetch();

        try {
            SCTSYNCING = true;
            const bulkContracts = Contracts.rawCollection().initializeUnorderedBulkOp();
            for (let i in contracts) {
                //console.log(contracts[i])
                let url = "";
                var address = contracts[i].address;

                //secretjs.queryContractSmart(contracts[i].address, infoQuery).then(result => {
                //    console.log(result);
                //})
                
                try {
                    url = queryProxy + '?query=token_info&contract=' + address;
                    //console.log(url);
                    let response = HTTP.get(url);
                    let tinfo = JSON.parse(response.content || response);
                    if (tinfo) {
                        if (tinfo.symbol?.includes("SPY")) {
                            try {
                                url1 = queryProxy + '?query=reward_token&contract=' + address;
                                let response1 = HTTP.get(url1);
                                let rwtoken = JSON.parse(response1.content || response1);

                                url2 = queryProxy + '?query=incentivized_token&contract=' + address;
                                let response2 = HTTP.get(url2);
                                let ivtoken = JSON.parse(response2.content || response2);

                                if (rwtoken.reward_token.token.address.includes("secret15l9cqgz5uezgydrglaak5ahfac69kmx2qpd6xt")) {
                                    tinfo.token_info.decimals = 6;
                                    bulkContracts.find({ address: contracts[i].address }).updateOne({ $set: {
                                        advProcessed: true,
                                        snip20: true,
                                        incentivized_token: ivtoken.incentivized_token.token.address,
                                        token_info:  tinfo.token_info
                                    }});

                                    bulkContracts.find({ address: ivtoken.incentivized_token.token.address }).updateOne({ $set: {
                                        advProcessed: true,
                                        snip20: true,
                                        spy_token: contracts[i].address,
                                        token_info:  tinfo.token_info
                                    }});

                                } else {
                                    bulkContracts.find({ address: contracts[i].address }).updateOne({ $set: {
                                        advProcessed: true,
                                        snip20: true,
                                        token_info:  tinfo.token_info
                                    }});
                                }

                            } catch {
                                
                                console.log(contracts[i]);
                                console.log("Error processing SPY contract ", address);
                                console.log(e);

                            }
                            
                        } else {
                            //console.log(tinfo.token_info);
                            bulkContracts.find({ address: contracts[i].address }).updateOne({ $set: {
                                advProcessed: true,
                                snip20: true,
                                token_info:  tinfo.token_info
                            }});
                        }
                    } else {
                        bulkContracts.find({ address: contracts[i].address }).updateOne({ $set: {
                            advProcessed: true,
                            snip20: false
                        }});
                    }

                
                    //tinfo.result.advProcessed = false;

                    //bulkContracts.insert(ct.result);
                    //bulkContracts.find({ address: contracts[i].address }).updateOne({ $set: { contractProcessed: true }});
                    //console.log("would insert:");
                    //console.log(ct.result);

                }
                catch (e) {

                    console.log(contracts[i]);
                    console.log("Processing contract token_info ", address);
                    console.log(e);
                    //bulkContracts.find({ txhash: transactions[i].txhash }).updateOne({ $set: { processed: false, missing: true } });
                }
                
            }
            
            if (bulkContracts.length > 0) {
                console.log("Contracts to update with token_info: %o", bulkContracts.length)
                bulkContracts.execute((err, result) => {
                    if (err) {
                        if (err.code === 11000) {
                            //console.log("duplicate contract.")
                        } else {
                            console.log(err);
                        }
                    }
                    if (result) {
                        //console.log(result);
                    }
                });
            }
        }
        catch (e) {
            console.log("caught!:")
            console.log(e);
            SCTSYNCING = false;
            return e
        }
        SCTSYNCING = false;
        return contracts.length
    },

    'SecretContracts.ensureContract': async function (address) {
        this.unblock();

        const bulkContracts = Contracts.rawCollection().initializeUnorderedBulkOp();

        try {
            //get basic info from LCD
            url = LCD + '/wasm/contract/' + address;
            let response = HTTP.get(url);
            let ct = JSON.parse(response.content || response);
            ct.result.advProcessed = false;
            //console.log(ct);

            //insert into db
            bulkContracts.insert(ct.result);
            //console.log("would insert:");
            //console.log(ct.result);
        }
        catch (e) {
            console.log("Error ensuring contract ", address);
            console.log(e);
            console.log(ct);
        }

        //process DB insert
        if (bulkContracts.length > 0) {
            //console.log("Contracts to insert: %o", bulkContracts.length)
            bulkContracts.execute((err, result) => {
                if (err) {
                    if (err.code === 11000) {
                        //console.log("duplicate contract.")
                    } else {
                        console.log(err);
                    }
                }
                if (result) {
                    //console.log(result);
                }
            });
        }

    },

    'SecretContracts.ensureContracts': async function (addresses) {
        this.unblock();

        for (let i in addresses) {
            Meteor.call('SecretContracts.ensureContract', addresses[i]);
        }

    },

    'SecretContracts.bridgeTokenSync': async function () {
        console.log("Syncing bridge token info from Bridge API...");
        this.unblock();

        try {
            url = bridgeAPI + '/tokens';
            let response = HTTP.get(url);
            let res = JSON.parse(response.content || response);
            let bridgeTokens = res.tokens;
            if (bridgeTokens) {
                const bulkContracts = Contracts.rawCollection().initializeUnorderedBulkOp();
                for (let i in bridgeTokens) {
                    let bridge_info = {};
                    //dstAddr = bridgeTokens[i].dst_address;
                    //console.log(bridgeTokens[i]);

                    bridge_info.src_network = bridgeTokens[i].src_network;
                    bridge_info.src_coin = bridgeTokens[i].src_coin;
                    bridge_info.src_address = bridgeTokens[i].src_address;
                    bridge_info.name = bridgeTokens[i].name;
                    bridge_info.image = bridgeTokens[i].display_props.image;
                    bridge_info.symbol = bridgeTokens[i].display_props.symbol;
                    //console.log(bridge_info);


                    bulkContracts.find({ address: bridgeTokens[i].dst_address, snip20: true }).updateOne({ $set: {
                        bridged: true,
                        bridge_info: bridge_info
                    }});


                }

                if (bulkContracts.length > 0) {
                    console.log("Tokens to sync with bridge: %o", bulkContracts.length)
                    bulkContracts.execute((err, result) => {
                        if (err) {
                            if (err.code === 11000) {
                                //console.log("duplicate contract.")
                            } else {
                                console.log(err);
                            }
                        }
                        if (result) {
                            console.log(result);
                        }
                    });
                }


            }

        
            //tinfo.result.advProcessed = false;

            //bulkContracts.insert(ct.result);
            //bulkContracts.find({ address: contracts[i].address }).updateOne({ $set: { contractProcessed: true }});
            //console.log("would insert:");
            //console.log(ct.result);

        }
        catch (e) {

            console.log("Error Syncing bridge tokens");
            console.log(e);
            //bulkContracts.find({ txhash: transactions[i].txhash }).updateOne({ $set: { processed: false, missing: true } });
        }

    },

    'SecretContracts.sswapTokenSync': async function () {
        if (SSSYNCING)
            return "Already syncing from SecretSwap...";

        console.log("Syncing SecretSwap token info from Bridge API...");
        this.unblock();

        try {
            SSSYNCING = true;
            url = bridgeAPI + '/secretswap_pairs';
            let response = HTTP.get(url);
            let res = JSON.parse(response.content || response);
            let sswapTokens = res.pairs;
            if (sswapTokens) {
                const bulkContracts = Contracts.rawCollection().initializeUnorderedBulkOp();
                for (let i in sswapTokens) {
                    let swap_info = {};

                    if (sswapTokens[i].asset_infos[0].token?.contract_addr) {
                        asset0 = sswapTokens[i].asset_infos[0].token.contract_addr;
                        Meteor.call('SecretContracts.ensureContract', asset0);
                    } else {
                        asset0 = sswapTokens[i].asset_infos[0].native_token.denom;
                    }

                    if (sswapTokens[i].asset_infos[1].token?.contract_addr) {
                        asset1 = sswapTokens[i].asset_infos[1].token.contract_addr;
                        Meteor.call('SecretContracts.ensureContract', asset1);
                    } else {
                        asset1 = sswapTokens[i].asset_infos[1].native_token.denom;
                    }

                    Meteor.call('SecretContracts.ensureContract', sswapTokens[i].contract_addr);
                    Meteor.call('SecretContracts.ensureContract', sswapTokens[i].liquidity_token);
                    
                    

                    let a0contract = Meteor.call('Contracts.findOne', asset0);
                    let a1contract = Meteor.call('Contracts.findOne', asset1);

                    //console.log(a0contract);
                    let assets = [{
                        address:asset0,
                        symbol: a0contract.token_info?.symbol
                    },
                    {
                        address:asset1,
                        symbol: a1contract.token_info?.symbol
                    }];

                    swap_info.contract_addr = sswapTokens[i].contract_addr;
                    swap_info.lp_token_addr = sswapTokens[i].liquidity_token;
                    swap_info.assets = assets;
                    //console.log(swap_info);


                    //update Swap Contract
                    if (swap_info.assets[0].symbol && swap_info.assets[1].symbol) {
                        var name = "SecretSwap: " + swap_info.assets[0].symbol + "-" + swap_info.assets[1].symbol;
                        var desc = "SecretSwap pair for tokens: " + assets[0].address + " (" + assets[0].symbol + ") and " + assets[1].address + " (" + assets[1].symbol + ")";
                    } else {
                        var name;

                    }
                    console.log(name, desc);
                    bulkContracts.find({ address: sswapTokens[i].contract_addr }).updateOne({ $set: {
                        secretSwapPair: true,
                        name: name,
                        description: desc,
                        sswap_info: swap_info
                    }});

                    //update LP Contract
                    let lpname = "SSWAP-LP " + swap_info.assets[0].symbol + "-" + swap_info.assets[1].symbol;
                    let lpdesc = "SecretSwap LP Token for swap " + swap_info.contract_addr + " (" + swap_info.assets[0].symbol + "-" + swap_info.assets[1].symbol + ")";
                    //console.log(lpname, lpdesc);
                    
                    bulkContracts.find({ address: sswapTokens[i].liquidity_token }).updateOne({ $set: {
                        name: lpname,
                        description: lpdesc
                    }});

                    console.log(bulkContracts.length);


                }

                if (bulkContracts.length > 0) {
                    console.log("Tokens to sync with bridge: %o", bulkContracts.length)
                    bulkContracts.execute((err, result) => {
                        if (err) {
                            if (err.code === 11000) {
                                //console.log("duplicate contract.")
                            } else {
                                console.log(err);
                            }
                        }
                        if (result) {
                            console.log(result);
                        }
                    });
                }


            }

        
            //tinfo.result.advProcessed = false;

            //bulkContracts.insert(ct.result);
            //bulkContracts.find({ address: contracts[i].address }).updateOne({ $set: { contractProcessed: true }});
            //console.log("would insert:");
            //console.log(ct.result);

        }
        catch (e) {

            console.log("Error Syncing SecretSwap tokens");
            console.log(e);
            SSSYNCING = false;
            //bulkContracts.find({ txhash: transactions[i].txhash }).updateOne({ $set: { processed: false, missing: true } });
        }
        SSSYNCING = false;
    },

    'SecretContracts.tokensCount': async function () {
        //console.log("Counting tokens...");
        this.unblock();            
        //const contracts = Transactions.find({ processed: false }, { limit: 500 }).fetch();
        
        const contracts = Contracts.find({ snip20: true },
        ).fetch();
        //console.log(contracts[22]);
        //console.log(trans[80].tx.value.msg);
        //console.log("CONTRACTSSSS:", contracts.length);
        return contracts.length;
    },
    /*
    'Contracts.executions': function(contractAddress){
        this.unblock();
        if (CTSYNCING)
            return "Updating contracts...";

            
        //const contracts = Transactions.find({ processed: false }, { limit: 500 }).fetch();
        let query = {
            $and: [{ "tx.value.msg.0.type": "wasm/MsgExecuteContract" },
                { "tx.value.msg.0.value.contract":contractAddress }
            ]}
        const contracts = Transactions.find(query).fetch();

        return contracts.length;
    },
    'Contracts.findOne': function(contractAddress){
        this.unblock();
        if (CTSYNCING)
            return false;

        let query = {address:contractAddress}
        const contract = Contracts.findOne({address:contractAddress});

        if (contract) {
            return contract;
        }
        return false;
        
    }
    */
});