import React from 'react';
import { useEffect } from 'react'

import Sidebar from '../components/Sidebar';
import Map from '../components/Map';
import Table from '../components/Table'
import { postData } from '../helpers';
import Cell from '../components/Cell';
import useTickConnect from '../helpers/useTickConnect';

export default function socketIO() {

  let {state,params,handleChange,
    handleSymbolChange,
    tradingsymbols} = useTickConnect();

  if (!state.ticks) {
    return <></>
  }

  // let stockData = state.ticks[0].stockData;
  // let stockPrice = Object.values(stockData)[0].last_price;



  let stockPrice = state.stockPrice;



  let tableData = Object.values(state.ticks)
    .filter(item => item.tick.depth.sell[0].price != 0
      && item.tick.depth.sell[0].price * item.instrument.lot_size < 200000)
    .map(item => {
      let diff = ((item.instrument.strike + item.tick.depth?.sell[0].price) - stockPrice).toFixed(2);
      let avgPrice = (item.tick.depth?.sell[0].price+item.tick.depth?.buy[0].price)/2;
      let avgDiff = ((item.instrument.strike + avgPrice) - stockPrice);
      let sellPrice = item.tick.depth?.sell[0].price;
      let diffRatio = diff*100/sellPrice;
      let returnRatio = stockPrice/sellPrice;

      let ratio = diff*100/stockPrice;
      let buySellDiff = item.tick.depth?.sell[0].price - item.tick.depth?.buy[0].price;

      let avgDiffRatio = avgDiff*100/stockPrice;
      let breakeven = item.instrument.strike + avgPrice
      let breakevenChg = (breakeven-stockPrice)*100/stockPrice;
      
      return {
        stockPrice,
        isLiquid: buySellDiff < stockPrice*0.02,
        tradingsymbol: item.instrument.tradingsymbol,
        strike: item.instrument.strike,
        buyPrice: item.tick.depth?.buy[0].price,
        sellPrice,
        lotSize: item.instrument.lot_size,
        investment: item.tick.depth?.sell[0].price * item.instrument.lot_size,
        diff: Number(diff),
        ratio,
        instrumentToken:item.instrument.instrument_token,
        avgDiffRatio,
        breakeven,
        breakevenChg 
      }
    })
    .filter(a => a.isLiquid)    
    .sort((a, b) => a.diff - b.diff)


  return <div>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css" />

    <section className="hero">
      <div className="hero-body">
     
        <div className=" is-pulled-right is-small">
          Expiry:
          <div className="select is-small" >
            <select value={params.expiry} onChange={handleChange}>
              <option>2021-10-28</option>
              <option>2021-09-30</option>
              <option>2021-08-26</option>
            </select>
          </div>
        </div>
        &nbsp;
        <div className=" is-pulled-right is-small">
          Stock:
          <div className="select is-small" >
            <select value={params.tradingsymbol} onChange={handleSymbolChange}>
              {tradingsymbols.map(symbol=><option key={symbol}>{symbol}</option>)}
            </select>
          </div>
        </div>  
        <p className="title">
          {state.stockName}

        </p>
        <p className="subtitle">
          <Cell value={state.stockPrice}/>
        </p>
        
      </div>
    </section>

    <div className="columns">
      <div className="column  is-two-thirds" >

        <Table data={tableData}></Table>

      </div>
      <div className="column">
        <Map tradingSymbol={state.stockName} />
      </div>
    </div>



  </div>
}