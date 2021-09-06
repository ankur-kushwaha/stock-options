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

export default function options2({stockOptions,stockQuotes,profile,stocks}) {
  const router = useRouter()
  const {pushNotification} = useNotifications();

  let selectedStocks
  if(router.query.tradingsymbols){
    selectedStocks = router.query.tradingsymbols.split(",");
  }else{
    selectedStocks = stocks;
  }
  

  let defaults =  {
    stocks,
    maxInvestment:160000,
    minInvestment:10000,
    breakevenThreshold:0.5,
    maxTimeloss:10000,
    selectedStocks
  }
  let [tickerQuotes,setTickerQuotes] = React.useState();
  let [filters,setFilters] = React.useState(defaults);
  const {createOrder} = useZerodha();
  
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
      if(stock=='NIFTY'){
        stock = 'NIFTY 50'
      }
      let stockInstrumentToken = stockQuotes[stock].instrument_token
      let stockTickerQuote = tickerQuotes[stockInstrumentToken];
      let optionTickerQuote = tickerQuotes[item.instrument_token];
      
      let stockPrice = stockTickerQuote.last_price;
      //option price
      let itemPrice = optionTickerQuote.depth.sell[0].price;
      let itemBidPrice = optionTickerQuote.depth.buy[0].price;
      let isLiquid = true;
      if(itemPrice-itemBidPrice > itemPrice/70){
        isLiquid = false;
      }
      let breakeven = item.strike+itemPrice;
      let timeValue = breakeven-stockPrice;
      let breakevenChg = Number((timeValue*100/stockPrice).toFixed(2));
      let lotSize = item.lot_size;
      let investment = item.lot_size * itemPrice;
      let timeLoss = item.lot_size * timeValue;

      let highlight = false;
      if(investment>Number(filters.minInvestment) 
      && investment<Number(filters.maxInvestment)  
      && timeLoss < filters.maxTimeloss
      && itemPrice > 0){
        highlight = true;
      }

      // console.log(highlight);
      
      return {
        isLiquid,
        stockInstrumentToken,
        itemBidPrice,
        lotSize,
        highlight,
        strike:item.strike,
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

        if(filters.shouldRemoveFiltered){
          return item.investment>Number(filters.minInvestment) 
          && item.investment<Number(filters.maxInvestment)  
          && item.timeLoss < filters.maxTimeloss
          && item.itemPrice > 0
          && item.isLiquid
          && filters.selectedStocks.includes(item.stock)
        }else{
          return item.itemPrice > 0 
          && item.isLiquid
          && filters.selectedStocks.includes(item.stock)
        }
        
      }) 
      .sort((a,b)=>a.breakevenChg-b.breakevenChg);
  }

  if(options && options.length>0){
    let best = options[0];
    if(best.timeLoss < 3000  ){
      pushNotification({
        body:`${best.tradingsymbol} has timeloss ${best.timeLoss}`
      });    
    }
    
  }
  

  

  let columns = [{
    name: 'Option',
    selector: 'tradingsymbol',
    sortable: true,
    grow: 1,
    cell:row=><a className={"has-text-link"} href={`https://kite.zerodha.com/chart/ext/ciq/NFO-OPT/${row.tradingsymbol}/${row.optionInstrumentToken}`} target="_blank" rel="noreferrer">{row.tradingsymbol}</a>
  },
  {
    name: 'Stock',   
    selector: 'stock',
    cell:row=><><a className="has-text-link	" href={`https://kite.zerodha.com/chart/web/ciq/NSE/${row.stock}/${row.stockInstrumentToken}`} 
      target="_blank" rel="noreferrer">{row.stock}</a></>
  }
  ,{
    name: 'Stock Price',   
    selector: 'stockPrice'
  },
  {
    name: 'Breakeven',   
    selector: 'breakeven'
  },{
    name: 'Bid Price',   
    selector: 'itemBidPrice',
    cell:row=><div><a className="has-text-link" 
      href={`https://kite-client.web.app/?orderConfig=${row.tradingsymbol}:${row.lotSize}:${row.itemBidPrice+0.5}:NFO&variety=regular
    `} target="_blank" rel="noreferrer">{row.itemBidPrice}</a>
    <br/>
    <span className="is-size-7"><Price>{(row.stockPrice-(row.itemBidPrice+row.strike))*row.lotSize}</Price></span>
    </div>
  },
  {
    name: 'Option Price',   
    selector: 'itemPrice',
    cell:row=><div><a className="has-text-link" 
      href={`https://kite-client.web.app/?orderConfig=${row.tradingsymbol}:${row.lotSize}:${((row.itemBidPrice+row.itemPrice)/2).toFixed(1)}:NFO&variety=regular
    `} target="_blank" rel="noreferrer">{row.itemPrice}</a>
    <br />
    <span className="is-size-7"><Price>{(row.stockPrice-(row.itemPrice+row.strike))*row.lotSize}</Price></span>
    </div>
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
  let {instrumentType,expiry,tradingsymbols} = req.query;
  let defaultStocks = ['VEDL','TCS', 'INFY', 'TECHM', 'TATASTEEL', 'APOLLOHOSP','BAJAJFINSV', 'WIPRO','TATAPOWER'];
  if(tradingsymbols){
    tradingsymbols = defaultStocks.concat(tradingsymbols.split(","));
  }else{
    tradingsymbols = defaultStocks;
  }

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
      profile,
      stocks:tradingsymbols.sort()
    }
  }
}
