import React from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import Table from '../components/Table';
import { fetchOptions } from '../helpers/dbHelper';
import getTicks from '../helpers/getTicks';
import { getKiteClient } from '../helpers/kiteConnect';
import Price from '../components/Price'

export default function options2({stockOptions,stockQuotes,profile}) {
  let stocks = ['TCS', 'INFY', 'TECHM', 'TATASTEEL', 'COFORGE', 'MPHASIS', 'APOLLOHOSP','BAJAJFINSV', 'WIPRO','HINDUNILVR','TATAPOWER'];
  let defaults =  {
    stocks,
    maxInvestment:100000,
    minInvestment:10000,
    breakevenThreshold:0.5,
    maxTimeloss:10000,
    selectedStocks:stocks
  }
  let [tickerQuotes,setTickerQuotes] = React.useState();
  let [filters,setFilters] = React.useState(defaults);
  
  
  React.useEffect(()=>{
    let stockInstruments = Object.values(stockQuotes).map(item=>item.instrument_token);
    let instruments = [...Object.keys(stockOptions),...stockInstruments]
    getTicks(instruments,(ticks)=>{
      setTickerQuotes(ticks);
    });
  },[]);

  

  let options;
  if(tickerQuotes){

  
    options= Object.values(stockOptions).map(item=>{
      let instrument = stockOptions[item.instrument_token];
      let optionInstrumentToken = item.instrument_token;
      let stock = instrument.name;
      let stockTickerQuote = tickerQuotes[stockQuotes[stock].instrument_token];
      let optionTickerQuote = tickerQuotes[item.instrument_token];
      
      let stockPrice = stockTickerQuote.last_price;
      //option price
      let itemPrice = optionTickerQuote.depth.sell[0].price||optionTickerQuote.last_price;
      let breakeven = item.strike+itemPrice;
      let timeValue = breakeven-stockPrice;
      let breakevenChg = Number((timeValue*100/stockPrice).toFixed(2));
      let investment = item.lot_size * itemPrice;
      let timeLoss = item.lot_size * timeValue;
      
      return {
        investment,
        optionInstrumentToken,
        stockPrice,
        itemPrice,
        breakeven,
        timeValue,
        timeLoss,
        stock,
        tradingsymbol:instrument.tradingsymbol,
        breakevenChg
      }
    })
      .filter(item=>{
        return item.investment>filters.minInvestment 
        && item.investment<filters.maxInvestment  
        && item.timeLoss < filters.maxTimeloss
        && filters.selectedStocks.includes(item.stock)
        && item.itemPrice > 0
      }) 
      .sort((a,b)=>a.breakevenChg-b.breakevenChg);
  }

  

  let columns = [{
    name: 'Option',
    selector: 'tradingsymbol',
    sortable: true,
    grow: 1,
    cell:row=><a className={"has-text-link"} href={`https://kite.zerodha.com/chart/ext/ciq/NSE/${row.tradingsymbol}/${row.optionInstrumentToken}`} target="_blank" rel="noreferrer">{row.tradingsymbol}</a>
  },
  {
    name: 'Stock',   
    selector: 'stock'
  }
  ,{
    name: 'Stock Price',   
    selector: 'stockPrice'
  },
  {
    name: 'Breakeven',   
    selector: 'breakeven'
  },{
    name: 'Option Price',   
    selector: 'itemPrice'
  },
  {
    name: 'Time Value',   
    selector: 'timeValue',
    cell:row=><Price reverseColoring>{row.timeValue}</Price>
  },
  {
    name: 'Time Loss',   
    selector: 'timeLoss',
    cell:row=><Price reverseColoring>{row.timeLoss}</Price>
  },
  {
    name: 'Min Investment',   
    selector: 'investment'
  },
  {
    name: 'Breakeven Change',   
    selector: 'breakevenChg',
    cell:row=><Price threshold={0.5} reverseColoring>{row.breakevenChg}</Price>,
    sortable: true,
  },
  ]

  function handleFiltersUpdate(filters){
    console.log(filters);
    setFilters(filters);
  }

  return (
    <div>
      
      <Header userProfile={profile}/>
      
      <div className="mt-6 container">
        <div className="columns">
          <div className="column is-3">
            <Sidebar defaults={defaults} onFiltersUpdate={handleFiltersUpdate}></Sidebar>
          </div>
          
          <div className="column">
            <Table columns={columns} data={options}/>
          </div>
        </div>


      </div>
    </div>
  )
}

export async function getServerSideProps(ctx){
  let {req} = ctx;
  let {instrumentType,expiry} = req.query;

  let tradingsymbols = ['TCS', 'INFY', 'TECHM', 'TATASTEEL', 'COFORGE', 'MPHASIS', 'APOLLOHOSP','BAJAJFINSV', 'WIPRO','HINDUNILVR','TATAPOWER'];

  let kc = await getKiteClient(req.cookies);
  let profile = await kc.getProfile();
  let instruments = tradingsymbols.map(item=>`NSE:${item}`);
  
  let quotes = await kc.getQuote(instruments);
  let stockQuotes = {};

  for(let stockCode in quotes){
    let quote = quotes[stockCode];
    delete quote.timestamp;
    delete quote.last_trade_time;

    let code = stockCode.split(":")[1]
    stockQuotes[code]=quote;
  }

  let stockOptions = await fetchOptions({
    tradingsymbol:tradingsymbols,
    expiry:expiry||"2021-09-30",
    instrumentType:instrumentType||'CE'
  });

  return {
    props:{
      stockQuotes,
      stockOptions,
      profile
    }
  }
}
