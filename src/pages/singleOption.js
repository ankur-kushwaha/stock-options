import React from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import Table, { Column } from '../components/Table';
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

  let {push,query} = useRouter()

  const [state,setState ] = React.useState({
    expiry:"",
    ...query
  });

  // let columns = [
  //   {
  //     name: 'tradingsymbol',   
  //     selector: 'tradingsymbol',    
  //     cell:row=><a href={`/BuySell?tradingsymbol=${row.tradingsymbol}`} target="_blank" rel="noreferrer" >{row.tradingsymbol}</a>
  //   },
  //   {
  //     name: 'expiry',   
  //     selector: 'expiry',    
  //   },
  //   {
  //     name: 'strike',   
  //     selector: 'strike',    
  //   },
  //   {
  //     name: 'price',   
  //     selector: 'price',    
  //   },
  //   {
  //     name: 'breakeven',   
  //     selector: 'breakeven',    
  //     cell:row=><div>
  //       {row.breakeven}<br/>
  //       (<Price threshold={0.7} reverseColoring>{row.beChg}</Price>)
  //     </div>
      
  //   },{
  //     name: 'lotSize',   
  //     selector: 'lotSize',    
  //   },{
  //     name: 'minInvestment',   
  //     selector: 'minInvestment',   
  //     cell:row=><Price>{row.minInvestment}</Price> 
  //   },{
  //     name: 'roi',   
  //     selector: 'roi',
  //     cell:row=><div>
  //       <Price>{
  //         row.futurePrice
  //       }</Price>
  //       <br/>
  //       (<Price small>{row.roi}</Price>%)
  //     </div>
  //   },{
  //     name: 'timeValue',   
  //     selector: 'timeValue',    
  //     cell:row=><div>
  //       <Price reverseColoring>{
  //         row.timeValue
  //       }</Price>
  //       <br/>
  //       (<Price reverseColoring>{row.timeValue2}</Price>)
  //     </div>
  //   },{
  //     name: 'intrinsicValue',   
  //     selector: 'intrinsicValueAmt',   
  //     cell:row=><div><Price>{row.intrinsicValueAmt}</Price><br/>(<Price>{row.intrinsicValuePct}</Price>)</div>
  //   }
  // ].map(item=>{
  //   item.sortable = true;
  //   return item;
  // });

  let expiries = new Set();
  // console.log(optionQuotes);
  let optionsData = Object.values(optionQuotes)
    .map(quote=>{
      let option = options[quote.instrument_token];
      expiries.add(option.expiry);
      let stockPrice = stockQuote.last_price
      let bidPrice = quote.depth.buy[0].price||quote.last_price;
      let offerPrice = quote.depth.sell[0].price||quote.last_price;
      let price = state.transactionType == 'buy'?offerPrice:bidPrice
      let value = price * option.lot_size;
    
      return {
        ...quote,
        ...option,
        stockPrice,
        bidPrice,
        offerPrice,
        price,
        value
      }
    })
    .filter(item=>{
      console.log(item,state.expiry);
      let today = new Date();
      let cond = new Date(item.expiry) > today
      if(state.expiry == ''){
        return cond;
      }else{
        return cond && (new Date(state.expiry) == new Date(item.expiry))
      }
    })
    .map(item=>{
      let breakeven,breakevenChg,timeValue;
      
      let expiryPnl;

      if(item.tradingsymbol.endsWith('CE')){
        breakeven = item.strike + item.price;
        if(state.transactionType == 'buy'){
          timeValue = item.lot_size * Math.max(item.price,item.stockPrice-item.strike-item.price)  
        }else{
          timeValue = item.lot_size * Math.min(item.price,-item.stockPrice+item.strike+item.price)  
        }
      }else {
        breakeven = item.strike - item.price;
        if(state.transactionType == 'buy'){
          timeValue = item.lot_size * Math.max(item.price,item.strike-item.stockPrice-item.price)  
        }else{
          timeValue = item.lot_size * Math.min(item.price,item.stockPrice - item.strike + item.price)  
          expiryPnl = item.value-timeValue
        }
      }

      expiryPnl = expiryPnl || item.value-timeValue 

      return {
        ...item,
        timeValue,
        breakeven,
        breakevenChg,
        expiryPnl
      }
    });

  const handleChange = (key)=>(e)=>{
    setState({
      ...state,
      [key]:e.target.value
    });
    push({
      pathname: '/singleOption',
      query: { 
        ...query,
        [key]:e.target.value
      },
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
              <div className="is-size-7">
                Type
              </div>
              <div className="select is-fullwidth is-small mb-3">
                <select value={state.type} onChange={handleChange('type')}>
                  <option value="">Select Type</option>
                  <option value="CE">CALL</option>
                  <option value="PE">PUT</option>
                </select>
              </div>
              <div className="is-size-7">
                Transaction Type
              </div>
              <div className="select is-fullwidth is-small mb-3">
                <select value={state.transactionType} onChange={handleChange('transactionType')}>
                  <option value="">Select Type</option>
                  <option value="buy">BUY</option>
                  <option value="sell">SELL</option>
                </select>
              </div>
            </div>            

          </div>

          <div className="column">
            <Table data={optionsData}>
              <Column selector="tradingsymbol"></Column>
              <Column selector="strike"></Column>
              <Column selector="expiry"></Column>
              <Column selector="lot_size"></Column>
              <Column selector="bidPrice"></Column>
              <Column selector="offerPrice"></Column>
              <Column selector="price"></Column>
              <Column selector="value"></Column>
              <Column selector="breakeven"></Column>
              <Column selector="timeValue"></Column>
              <Column selector="expiryPnl">
                {row=><div>{row.expiryPnl}<br/>
                  {row.expiryPnl-row.value}
                </div>}
              </Column>
            </Table>
          </div>
        </div>


      </div>
    </div>
  </>
}

export async function getServerSideProps(ctx){
  let {req,query} = ctx;
  let {tradingsymbol,range=10,type} = query; // INFY
  type = type||'CE'
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

  let optionQuotes = await kc.getQuote(Object.values(options).map(item=>item.instrument_token));

  for(let stockCode in quotes){
    let quote = quotes[stockCode];
    delete quote.timestamp;
    delete quote.last_trade_time;
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
