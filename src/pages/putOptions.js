import React from 'react'
import useTickConnect from '../helpers/useTickConnect';
import Table from '../components/Table'


export default function PutOptions() {
  let {state,params,handleChange,
    handleSymbolChange,
    tradingsymbols} = useTickConnect({
    instrumentType:"PE"
  });

  if(!state.ticks){
    return <></>;
  }

  let tableData = Object.values(state.ticks)
    .filter(a => a.tick.depth.sell[0].price != 0)
    .map(item => {
      let stockPrice= state.stockPrice;
      
      let buyPrice = item.tick.depth?.buy[0].price;
      let sellPrice = item.tick.depth?.sell[0].price;
      let buySellDiff = sellPrice-buyPrice;
      let strike  = item.instrument.strike;
      // let timeValue = stockPrice - (strike - buyPrice)
      let intrinsicValue = Math.max(0,strike-stockPrice)
      let premium = (item.tick.depth?.buy[0].price - intrinsicValue) * item.instrument.lot_size;
      let breakeven = strike-premium;

      return {
        isLiquid: buySellDiff < stockPrice*0.02,
        tradingsymbol: item.instrument.tradingsymbol,
        strike,
        buyPrice,
        sellPrice,
        lotSize: item.instrument.lot_size,
        investment: item.tick.depth?.buy[0].price * item.instrument.lot_size,
        diff: Number(premium.toFixed(2)),
      }
    })
    .filter(a => a.isLiquid)    
    .sort((a, b) => a.diff - b.diff)

    
      
  return (
    <div>
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
            {state.stockPrice}
          </p>
    
        </div>
      </section>
      <Table data={tableData}></Table>
    </div>
  )
}
