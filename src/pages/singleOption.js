import React from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import Table from '../components/Table';
import { fetchOptions } from '../helpers/dbHelper';
// import getTicks from '../helpers/getTicks';
import { getKiteClient } from '../helpers/kiteConnect';
import Price from '../components/Price'
import useZerodha from '../helpers/useZerodha';
import { useRouter } from 'next/router'
import useNotifications from '../helpers/useNotificaiton';
import date from 'date-and-time';


export default function options2({
  options,
  profile,
  stockQuote,
  type,
  optionQuotes
}) {

  const [state,setState ] = React.useState({
    expiry:""
  });

  let columns = [
    {
      name: 'tradingsymbol',   
      selector: 'tradingsymbol',    
      cell:row=><a href={`/BuySell?tradingsymbol=${row.tradingsymbol}`} target="_blank" rel="noreferrer" >{row.tradingsymbol}</a>
    },
    {
      name: 'expiry',   
      selector: 'expiry',    
    },
    {
      name: 'strike',   
      selector: 'strike',    
    },
    {
      name: 'price',   
      selector: 'price',    
    },
    {
      name: 'breakeven',   
      selector: 'breakeven',    
      cell:row=><div>
        {row.breakeven}<br/>
        (<Price threshold={0.7} reverseColoring>{row.beChg}</Price>)
      </div>
      
    },{
      name: 'lotSize',   
      selector: 'lotSize',    
    },{
      name: 'minInvestment',   
      selector: 'minInvestment',   
      cell:row=><Price>{row.minInvestment}</Price> 
    },{
      name: 'roi',   
      selector: 'roi',
      cell:row=><div>
        <Price>{
          row.futurePrice
        }</Price>
        <br/>
        (<Price small>{row.roi}</Price>%)
      </div>
    },{
      name: 'timeValue',   
      selector: 'timeValue',    
      cell:row=><div>
        <Price reverseColoring>{
          row.timeValue
        }</Price>
        <br/>
        (<Price reverseColoring>{row.timeValue2}</Price>)
      </div>
    },{
      name: 'intrinsicValue',   
      selector: 'intrinsicValueAmt',   
      cell:row=><div><Price>{row.intrinsicValueAmt}</Price><br/>(<Price>{row.intrinsicValuePct}</Price>)</div>
    }
  ].map(item=>{
    item.sortable = true;
    return item;
  });

  let expiries = new Set();

  let optionsData = Object.values(optionQuotes).map(quote=>{
    let price = (quote.depth.sell[0].price) || quote.last_price;
    let stockPrice = stockQuote.last_price
    
    let option = options[quote.instrument_token]
    
    expiries.add(option.expiry);

    let breakeven = option.strike+price;
    if(type=='PE'){
      breakeven = option.strike - price;
    }
    let beChg =(breakeven-stockPrice)/stockPrice*100;

    let minInvestment = price * option.lot_size;
    let today = new Date();
    let expiryDate  = date.parse(option.expiry,'YYYY-MM-DD') //2025-12-24',

    
    let daysDiff = Math.ceil((expiryDate-today) / (1000 * 60 * 60 * 24)) 

    let intrinsicValue = Math.max(stockPrice-option.strike,0);
    let intrinsicValueAmt = intrinsicValue * option.lot_size;
    let intrinsicValuePct = intrinsicValue/price*100;
    let timeValue  = (breakeven-stockPrice)*option.lot_size;
    let timeValue2  = (breakeven-stockPrice)/price*100;

    if(type=='PE'){
      timeValue = Math.min(price,(price - (option.strike - stockPrice)))* option.lot_size;
      timeValue2 = (price - (option.strike - stockPrice))/price*100
      minInvestment = timeValue
    }

    let futurePrice = price - ((timeValue*price/daysDiff)/100) + (stockPrice*0.01);
    let roi = (futurePrice - price) / price * 100;

    
    
    return {
      ...quote,
      ...option,
      price,
      beChg,
      lotSize:option.lot_size,
      timeValue,
      intrinsicValueAmt,
      intrinsicValuePct,
      timeValue2,
      futurePrice,
      roi,
      minInvestment,
      daysDiff,
      breakeven
    }
  })
    .filter(item=>{
      let cond =  item.price
      && item.daysDiff < 60 
      && item.daysDiff>0
    
      if(state.expiry.length>0){
        cond = cond && item.expiry ==state.expiry
      }
      return cond;

    }).sort((a,b)=>-a.breakeven+b.breakeven);

  const handleChange = (key)=>(e)=>{
    setState({
      ...state,
      [key]:e.target.value
    })
  }

  return <>
    <div>
      
      <Header userProfile={profile}/>
      
      <div className="mt-6 container">
        <div className="columns">
          
          <div className="column is-3">

            <div className="box">

              <div className="is-size-7">
              Stock Price: {stockQuote?.last_price}
              </div>
              <hr />

              <div className="is-size-7">
                Expiry
              </div>
              <div className="select is-fullwidth is-small mb-3">
                <select value={state.expiry} onChange={handleChange('expiry')}>
                  <option value="">Select Expiry</option>
                  {Array.from(expiries).map(item=><option key={item}>{item}</option>)}
                </select>
              </div>
            </div>            

          </div>

          <div className="column">
            <Table columns={columns} data={optionsData}/>
          </div>
        </div>


      </div>
    </div>
  </>
}

export async function getServerSideProps(ctx){
  let {req,query} = ctx;
  let {tradingsymbol,range=10,type='CE'} = query; // INFY
  let kc = await getKiteClient(req.cookies);
  
  let stockCodeId = `NSE:${tradingsymbol}`
  if(tradingsymbol == 'NIFTY'){
    stockCodeId = 'NSE:NIFTY 50'
  }
  let quotes = await kc.getQuote([stockCodeId]);
  let stockQuote = quotes[stockCodeId];

  let profile = await kc.getProfile();

  let options = await fetchOptions({
    tradingsymbol:tradingsymbol,
    instrumentType:type
  });

  // console.log(options)
  let stockPrice = stockQuote.last_price;
  // console.log('stockPrice',stockPrice)
  let upperRange = stockPrice + (stockPrice*range/100)
  let lowerRange = stockPrice - (stockPrice*range/100)

  for(let option of Object.values(options)){
    
    if( option.strike < lowerRange || option.strike > upperRange){
      delete options[option.instrument_token];
    }
  }

  console.log(Object.values(options).map(option=>option.strike));

  let optionQuotes = await kc.getQuote(Object.values(options).map(item=>item.instrument_token));

  for(let stockCode in quotes){
    let quote = quotes[stockCode];
    delete quote.timestamp;
    delete quote.last_trade_time;

    // let code = stockCode.split(":")[1]
    // stockQuotes[code]=quote;
  }
  for(let stockCode in optionQuotes){
    let quote = optionQuotes[stockCode];
    delete quote.timestamp;
    delete quote.last_trade_time;
  }

  return {
    props:{
      type,
      stockQuote,
      options,
      profile,
      optionQuotes
    }
  }
}
