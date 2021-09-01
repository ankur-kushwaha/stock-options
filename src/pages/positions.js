import React from 'react'
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

  // console.log('quotes',quotes);
  // console.log('tickerquotes',tickerQuotes);
  // console.log('positions',positions);

  let totalProfit =0,
    totalInvestment=0,
    netCurrentValue=0,
    netExpiryPnl=0;

  let data = positions
    .map(item=>{
      let stock = getStockCode(item.tradingsymbol);
      let stockCode = stock.stockCode;
      let strike  = stock.strike;
      let stockPrice=0,stockPriceChg=0;
      let currPrice,offerPrice,stockInstrumentToken,
        optionInstrumentToken = item.instrument_token;
      if(tickerQuotes){
        stockInstrumentToken = quotes[`NSE:${stockCode}`].instrument_token
        let stockQuote = tickerQuotes[stockInstrumentToken];
        stockPrice = stockQuote.last_price;
        stockPriceChg = stockQuote.change;
        let optionTicker = tickerQuotes[item.instrument_token]
        currPrice = optionTicker.depth.buy[0].price || optionTicker.last_price;
        offerPrice = optionTicker.depth.sell[0].price;
      }
    
      let buyPrice = item.buy_price
      let breakeven = strike+buyPrice;
      let minTimeValue = -stockPrice + (strike + currPrice);
      let maxTimeValue = (-stockPrice + (strike + offerPrice))/stockPrice;
      let breakevenDiff = stockPrice - breakeven;
      let breakevenChg = breakevenDiff*100/stockPrice;
      let quantity = item.quantity;
      let buyValue = item.buy_value;
      let currValue = Number((currPrice * quantity).toFixed(2));
      let pnl = currValue - buyValue;
      let expiryPnL = (breakevenDiff) * quantity;

      totalProfit += pnl;
      totalInvestment += buyValue;
      netCurrentValue += currValue;
      netExpiryPnl += expiryPnL;

      return {
        optionInstrumentToken,
        pnl,
        expiryPnL,
        offerPrice,
        buyValue,
        bidPrice:currPrice,
        buyPrice,
        stockInstrumentToken,
        currValue,
        quantity,
        stockPriceChg,
        breakevenChg,
        tradingsymbol:item.tradingsymbol,
        stockCode, 
        breakeven,
        stockPrice,
        timeValue: minTimeValue,
        maxTimeValue
      }
    }).sort((a,b)=>a.pnl-b.pnl)

  

  let columns = [
    {
      name: 'Option',
      wrap:false,
      grow:3,
      selector: 'tradingsymbol',
      sortable: true,
      cell:row=><a className={"has-text-link"} href={'/options2?tradingsymbols='+row.stockCode} target="_blank" rel="noreferrer">{row.tradingsymbol}</a>
      
    },
    {
      name: 'Stock',
      selector: 'stockCode',
      sortable: true,
      grow:2,
      cell:row=><><a className="has-text-link	" href={`https://kite.zerodha.com/chart/web/ciq/NSE/${row.stockCode}/${row.stockInstrumentToken}`} 
        target="_blank" rel="noreferrer">{row.stockCode}</a></>
    },
    {
      name: 'Stock Price(Day Change)',
      selector: 'stockPriceChg',
      sortable: true,
      cell:row=><div>{row.stockPrice}<br/>(<Price>{row.stockPriceChg}</Price>)</div>
    },
    {
      name: 'Breakeven',
      selector: 'breakevenChg',
      wrap:true,
      sortable: true,
      cell:row=><div>{row.breakeven}<br/>(<Price>{row.breakevenChg}</Price>)</div>
    },
    {
      name: 'Quantity',
      selector: 'quantity',wrap:true,
      sortable: true
    },
   
    {
      name: 'Buy Value',
      selector: 'buyValue',wrap:true,
      sortable: true
    },
    {
      name: 'TimeValue',
      wrap:true,
      selector: 'maxTimeValue',
      sortable: true,
      cell:row=><div>
        <a target="_blank" href={`https://kite-client.web.app/?orderConfig=${row.tradingsymbol}:${row.lotSize}:${row.buyPrice}&variety=regular
`} rel="noreferrer"><Price reverseColoring>{row.maxTimeValue}</Price></a>

       
      </div>
    },
    {
      name: 'Bid Price',
      selector: 'bidPrice',wrap:true,
      sortable: true,
      cell:row=><div>
        <a className="has-text-link	" onClick={createOrder({
          transactionType:"SELL",tradingsymbol:row.tradingsymbol,quantity:row.quantity,price:(row.bidPrice)
        })}>{row.bidPrice}</a> <br/>
        (
        <span className={"is-size-7 "+(row.bidPrice>row.buyPrice?'has-text-success':'has-text-danger')}>{((row.bidPrice-row.buyPrice)*100/row.buyPrice).toFixed(2)}%</span>)</div>
    },
    {
      name: 'Buy Price',wrap:true,
      selector: 'buyPrice',
      sortable: true
    },
    {
      name: 'Offer Price',
      selector: 'offerPrice',wrap:true,
      sortable: true,
      cell:row=><div><a className="has-text-link	" onClick={createOrder({
        transactionType:"SELL",tradingsymbol:row.tradingsymbol,quantity:row.quantity,price:(row.offerPrice-0.5)
      })}>{row.offerPrice}</a>  <br/>
      (<Price small>{(row.offerPrice-row.buyPrice)*100/row.buyPrice}</Price>)
      </div>
    },

    {
      name: 'P&L (Expiry)',
      selector: 'pnl',
      sortable: true,wrap:true,
      cell:row=><div>
        <Price>{row.pnl}</Price><br/>
        <Price>{row.expiryPnL}</Price>
      </div>
    },  
  ]

  

  return (
    <div >
      <Header userProfile={userProfile} tab="positions"></Header>

      <div className="container mt-4">

        <article className="message is-info">
          <div className="message-body">
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
          </div>
        </article>

       
      
      </div>

      <div className="container mt-5">

        <div className="columns">
   
          <div className="column">
            <Table data={data} columns={columns} />
          </div>
        </div>
      </div> 
      
    </div>
  )
}

function getStockCode(tradingsymbol){
  const regex = /([A-Z]*)+(\w{5})(\d*)[C|P]E/;
  let out = tradingsymbol.match(regex);
  let stockCode;
  try{
    stockCode = out[1];
    if(stockCode == 'NIFTY'){
      stockCode = 'NIFTY 50';
    }
  }catch(e){
    console.log('tradingsymbol',tradingsymbol);
    throw e;
  }
  let strike = Number(out[3]);
  return {
    stockCode,
    strike
  }
}

export async function getServerSideProps(ctx) {
  let { req,res } = ctx;
  let userProfile,positions={},quotes=[];
  let kc
  try{
    kc = await getKiteClient(req.cookies);
    userProfile = await kc.getProfile();
  }catch(e){
    console.log('error')
  }
  
  if(!userProfile){
    res.writeHead(307, { Location: `/api/login`})
    return res.end()
  }

  try{
    positions = await kc.getPositions();
    positions = positions.net.filter(item=>item.exchange=='NFO' && item.quantity > 0);
    
    let stockCodes = Array.from(new Set(positions
      .map(item=>{
        return getStockCode(item.tradingsymbol).stockCode
      }))).map(item=>`NSE:${item}`);
    
    let instruments = [...positions.map(item=>item.instrument_token),...stockCodes]
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
      positions:positions,
      quotes
    }
  }
}
