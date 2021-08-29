import React from 'react'
import io from 'socket.io-client'
import Header from '../components/Header';
import Table from '../components/Table';
import useZerodha from '../helpers/useZerodha';
import { getKiteClient } from '../helpers/kiteConnect';
import currencyFormatter from 'currency-formatter';
import getTicks from '../helpers/getTicks';
import Price from '../components/Price';


export default function holdings({
  userProfile,
  positions,
  quotes}) {

  console.log(positions);

  let [tickerQuotes,setTickerQuotes] = React.useState();

  React.useEffect(()=>{
    let quotesInstruments = Object.values(quotes).map(item=>item.instrument_token);
    
    getTicks(quotesInstruments,(ticks)=>{
      setTickerQuotes(ticks);
    });
  },[])

  const {createOrder} = useZerodha();

  console.log('quotes',quotes);
  console.log('tickerquotes',tickerQuotes);
  console.log('positions',positions);

  let totalProfit =0,
    totalInvestment=0,
    netCurrentValue=0,
    netExpiryPnl=0;

  let data = positions.map(item=>{
    let stock = getStockCode(item.tradingsymbol);
    let stockCode = stock.stockCode;
    let strike  = stock.strike;
    let stockPrice=0,stockPriceChg=0;
    let currPrice,offerPrice;
    if(tickerQuotes){
      let stockQuote = tickerQuotes[quotes[`NSE:${stockCode}`].instrument_token];
      stockPrice = stockQuote.last_price;
      stockPriceChg = stockQuote.change;
      let optionTicker = tickerQuotes[item.instrument_token]
      currPrice = optionTicker.depth.buy[0].price || optionTicker.last_price;
      offerPrice = optionTicker.depth.sell[0].price;
    }
    
    let buyPrice = item.buy_price
    let breakeven = strike+buyPrice;
    let timeValue = stockPrice - breakeven;
    let breakevenChg = timeValue*100/stockPrice;
    let quantity = item.buy_quantity;
    let buyValue = item.buy_value;
    let currValue = currPrice * quantity;
    let pnl = currValue - buyValue;
    let expiryPnL = (timeValue) * quantity;

    totalProfit += pnl;
    totalInvestment += buyValue;
    netCurrentValue += currValue;
    netExpiryPnl += expiryPnL;

    return {
      pnl,
      expiryPnL,
      offerPrice,
      buyValue,
      bidPrice:currPrice,
      buyPrice,
      currValue,
      quantity,
      stockPriceChg,
      breakevenChg,
      tradingsymbol:item.tradingsymbol,
      stockCode, 
      breakeven,
      stockPrice
    }
  })

  

  let columns = [
    {
      name: 'tradingsymbol',
      wrap:true,
      selector: 'tradingsymbol',
      sortable: true
    },
    {
      name: 'stockCode',
      selector: 'stockCode',
      wrap:true,
      sortable: true,
    },
    {
      name: 'stockPrice',
      selector: 'stockPriceChg',
      
      sortable: true,
      cell:row=><div>{row.stockPrice}<br/>(<Price>{row.stockPriceChg}</Price>)</div>
    },
    {
      name: 'breakeven',
      selector: 'breakevenChg',
      wrap:true,
      sortable: true,
      cell:row=><div>{row.breakeven}<br/>(<Price>{row.breakevenChg}</Price>)</div>
    },
    {
      name: 'quantity',
      selector: 'quantity',wrap:true,
      sortable: true
    },
   
    {
      name: 'buyValue',
      selector: 'buyValue',wrap:true,
      sortable: true
    },
    {
      name: 'currValue',
      wrap:true,
      selector: 'currValue',
      sortable: true,
    },
    {
      name: 'bidPrice',
      selector: 'bidPrice',wrap:true,
      sortable: true,
      cell:row=><div>
        <a onClick={createOrder({
          transactionType:"SELL",tradingsymbol:row.tradingsymbol,quantity:row.quantity,price:(row.bidPrice)
        })}>{row.bidPrice}</a> <br/>
        (
        <span className={"is-size-7 "+(row.bidPrice>row.buyPrice?'has-text-success':'has-text-danger')}>{((row.bidPrice-row.buyPrice)*100/row.buyPrice).toFixed(2)}%</span>)</div>
    },
    {
      name: 'buyPrice',wrap:true,
      selector: 'buyPrice',
      sortable: true
    },
    {
      name: 'offerPrice',
      selector: 'offerPrice',wrap:true,
      sortable: true,
      cell:row=><div><a onClick={createOrder({
        transactionType:"SELL",tradingsymbol:row.tradingsymbol,quantity:row.quantity,price:(row.offerPrice-0.5)
      })}>{row.offerPrice}</a>  <br/>
      (<span className={"is-size-7 "+(row.offerPrice>row.buyPrice?'has-text-success':'has-text-danger')}>
        {((row.offerPrice-row.buyPrice)*100/row.buyPrice).toFixed(2)}%</span>)</div>
    },
    {
      name: 'P&L',
      selector: 'pnl',
      sortable: true,wrap:true,
      cell:row=><div>
        {row.pnl}<br/>
        (<span className={"is-size-7 "+(row.bidPrice>row.buyPrice?'has-text-success':'has-text-danger')}>
          {(row.pnl*100/row.buyValue).toFixed(2)}%</span>)</div>
    }, 
    {
      name: 'expiryPnL',
      selector: 'expiryPnL',
      sortable: true,wrap:true,
      cell:row=><div>
        <Price>{row.expiryPnL}</Price></div>
    }, 
  ]

  

  return (
    <div >
      <Header userProfile={userProfile} tab="positions"></Header>
      <div className="container">
        <Table title={"Open Positions"} data={data} columns={columns} />
        <footer>
          
          <div>
          Net Investment: <span className={(totalProfit>0)?'has-text-success':'has-text-danger'}>{currencyFormatter.format(totalInvestment, { code: 'INR' })}</span>
          </div>
          <div>
          Current Value: <span className={(totalProfit>0)?'has-text-success':'has-text-danger'}>{currencyFormatter.format(netCurrentValue, { code: 'INR' })}</span>
          </div>
          <div>
          Net PnL: <span className={(totalProfit>0)?'has-text-success':'has-text-danger'}>{currencyFormatter.format(totalProfit, { code: 'INR' })}</span>
          </div>
          <div>
          Net PnL (Expiry): <span className={(totalProfit>0)?'has-text-success':'has-text-danger'}>{currencyFormatter.format(netExpiryPnl, { code: 'INR' })}</span>
          
          </div>
        </footer>
      </div> 
      
    </div>
  )
}

function getStockCode(tradingsymbol){
  const regex = /([A-Z]*)+(\w{5})(\d*)CE/;
  let out = tradingsymbol.match(regex);
  let stockCode = out[1];
  let strike = Number(out[3]);
  return {
    stockCode,
    strike
  }
}

export async function getServerSideProps(ctx) {
  let { req } = ctx;
  let userProfile = {},positions={},quotes=[];
  try{
    let kc = await getKiteClient(req.cookies);
    userProfile = await kc.getProfile();
    positions = await kc.getPositions();
    
    
    let stockCodes = Array.from(new Set(positions.net.map(item=>{
      return getStockCode(item.tradingsymbol).stockCode
    }))).map(item=>`NSE:${item}`);
    
    let instruments = [...positions.net.map(item=>item.instrument_token),...stockCodes]
    quotes = (await kc.getQuote(instruments))
    
    Object.values(quotes).map(item=>{
      delete item.timestamp
      delete item.last_trade_time;
    });

  } catch(e) {
    console.log(e)
  }

  return {
    props:{
      userProfile,
      positions:positions.net,
      quotes
    }
  }
}
