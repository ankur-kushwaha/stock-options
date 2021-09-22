import React from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import Table from '../components/Table';
import { fetchOptions } from '../helpers/dbHelper';
import getTicks from '../helpers/getTicks';
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
  optionQuotes
}) {
  // console.log(
  //   optionQuotes[0],
  //   options
  // )

  const [ticks,setTicks ] = React.useState([]);
  const [state,setState ] = React.useState({
    range:5,
    beChg:2
  });

  React.useEffect(()=>{
    let instruments = [...Object.keys(options), stockQuote.instrument_token];
    getTicks(instruments,function(data){
      console.log(data)
      setTicks([]);
    })
  },[])

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
      name: 'minInvestment',   
      selector: 'minInvestment',    
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
      name: 'intrinsicValueDiff',   
      selector: 'intrinsicValueDiff',   
      cell:row=><Price>{row.intrinsicValueDiff}</Price>
    }
  ].map(item=>{
    item.sortable = true;
    return item;
  });

  let optionsData = Object.values(optionQuotes).map(quote=>{
    let price = (quote.depth.sell[0].price) || quote.last_price;
    let stockPrice = stockQuote.last_price

    if(ticks[quote.instrument_token]){
      let latestQuote = ticks[quote.instrument_token];
      price = (latestQuote.depth.sell[0].price) || latestQuote.last_price;
    }
    
    if(ticks[stockQuote.instrument_token]){
      stockPrice = ticks[stockQuote.instrument_token].last_price;
    }

    let option = options[quote.instrument_token]
    let breakeven = option.strike+price;
    let beChg =(breakeven-stockPrice)/stockPrice*100;

    let minInvestment = price * option.lot_size;
    let today = new Date();
    let expiryDate  = date.parse(option.expiry,'YYYY-MM-DD') //2025-12-24',

    
    let daysDiff = Math.ceil((expiryDate-today) / (1000 * 60 * 60 * 24)) 

    let intrinsicValue = (Math.max(stockPrice-option.strike,0))/price*100;
    let timeValue  = 100-intrinsicValue;

    let futurePrice = price - ((timeValue*price/daysDiff)/100) + (stockPrice*0.01);
    let roi = (futurePrice - price) / price * 100;

    
   

    let updateStockPrice = stockPrice+ 0.01*stockPrice;

    let intrinsicValue2 = (Math.max(updateStockPrice-option.strike,0))/price*100;
    let timeValue2  = 100 - intrinsicValue2;

    let intrinsicValueDiff = intrinsicValue2- intrinsicValue;

    return {
      ...quote,
      ...option,
      price,
      intrinsicValueDiff,
      beChg,
      timeValue,
      intrinsicValue,
      timeValue2,
      futurePrice,
      intrinsicValue2,
      roi,
      minInvestment,
      daysDiff,
      breakeven
    }
  })
    .filter(item=>{
      return item.price
    && item.daysDiff < 60 
    && item.daysDiff>0
    && item.intrinsicValue2 >0

    }).sort((a,b)=>-a.roi+b.roi);

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
          
          {/* <div className="column">

            <div className="box">
              <div>

                <label htmlFor="volume">Range</label>
                <br />
                <input type="range" id="volume" name="volume" onChange={handleChange('range')} 
                  min="5" max="50" step={5} value={state.range}/>
                {state.range}

              </div>
              <div>

                <label htmlFor="volume">Breakeven Change</label>
                <br />
                <input type="range" id="volume" name="volume" onChange={handleChange('beChg')} 
                  min="0" max="10" step={1} value={state.beChg}/>
                {state.beChg}
              </div>
            </div>            

          </div> */}

          <div className="column">
            Stock Price: {stockQuote?.last_price}
            <Table columns={columns} data={optionsData}/>
          </div>
        </div>


      </div>
    </div>
  </>
}

export async function getServerSideProps(ctx){
  let {req} = ctx;
  let {tradingsymbol,range=10} = req.query; // INFY
  let kc = await getKiteClient(req.cookies);
  
  let stockCodeId = `NSE:${tradingsymbol}`
  if(tradingsymbol == 'NIFTY'){
    stockCodeId = 'NSE:NIFTY 50'
  }
  let quotes = await kc.getQuote([stockCodeId]);
  let stockQuote = quotes[stockCodeId];


  let profile = await kc.getProfile();

  let options = await fetchOptions({
    tradingsymbol:tradingsymbol
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

  
  // let instruments = tradingsymbols.map(item=>`NSE:${item}`);
  
  // let quotes = await kc.getQuote([`NSE:${tradingsymbol}`]);
  // let stockQuotes = {};

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
      stockQuote,
      options,
      profile,
      optionQuotes
    }
  }
}
