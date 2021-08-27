import React from 'react'
import io from 'socket.io-client'
import Header from '../components/Header';
import Table from '../components/Table';
import useZerodha from '../helpers/useZerodha';
import { getKiteClient } from '../helpers/kiteConnect';
import currencyFormatter from 'currency-formatter';


export default function holdings({userProfile}) {

  const {createOrder} = useZerodha();

  const [state, setState] = React.useState({
    positions: []
  });
  const [ticks, setTicks] = React.useState([]);
 
  React.useEffect(() => {
    fetch('/api/positions').then(res => res.json())
      .then(res => {
        let reg = new RegExp("([A-Z]*)")
        setState({
          ...state,
          positions: res.positions.net
            .filter(item => item.exchange == 'NFO' && item.quantity != 0)
            .map(item=>{
              item.stockCode = reg.exec(item.tradingsymbol)[0];
              return item;
            })
        })
      })
      .catch(e => console.log(e));
  }, [])

 

  async function getQuotes(tradingSymbols){
    return fetch('/api/getQuote?instruments='+tradingSymbols)
      .then(res=>res.json())
      .then(res=>res.quotes)
      .catch(e=>console.log(e));
  }

  React.useEffect(async () => {

    let stocks = [];
    let positions = state.positions.map(item=>{
      
      stocks.push(item.stockCode);
      return item
    });
    if (positions.length == 0) {
      return;
    }
    console.log(1,stocks);

    let tradingSymbols = state.positions.map(item=>item.tradingsymbol).map(item => `NFO:${item}`);
    tradingSymbols = tradingSymbols.concat(stocks.map(stock=>`NSE:${stock}`));

    let quotes = await getQuotes(tradingSymbols.join(","));
    console.log(2,quotes);

    let optionPositions = Object.values(quotes)
      .map(item => item.instrument_token)
    const socket = io()

    socket.on('connect', () => {
      console.log('connect')

      // const urlSearchParams = new URLSearchParams(window.location.search);
      // const params = Object.fromEntries(urlSearchParams.entries());

      socket.emit('initPositions', {
        instrumentToken: optionPositions
      })
    })

    socket.on('ticks', data => {
    //   console.log("ticks", data);
      setTicks(data.ticks);
    })

    socket.on('disconnect', () => {
      console.log('disconnect')
    })

    setState({
      ...state,
      quotes
    })

  }, [state.positions])

  React.useEffect(() => {
    let newDepth = ticks.reduce((a,b)=>{
      a[b.instrument_token] = b;
      return a;
    },{})
    let optionDepth = {...state.optionDepth,...newDepth}

    setState({
      ...state,
      optionDepth
    })
  }, [ticks])

  if(!state.quotes){
    return <></>
  }

  let totalProfit = 0,totalInvestment=0,netCurrentValue=0,netExpiryPnl=0;
  let data = state.positions.map(item => {
    let optionDepth,stockPrice,stockPriceChg

    if(state.optionDepth){
      optionDepth =state.optionDepth[item.instrument_token].depth
      stockPriceChg = state.optionDepth[state.quotes[`NSE:${item.stockCode}`].instrument_token].change.toFixed(2);
      stockPrice = state.optionDepth[state.quotes[`NSE:${item.stockCode}`].instrument_token].last_price.toFixed(2);
    }else{
      stockPrice = state.quotes[`NSE:${item.stockCode}`].last_price;
      stockPriceChg = state.quotes[`NSE:${item.stockCode}`].last_price;
      optionDepth= state.quotes[`NFO:${item.tradingsymbol}`].depth    
    }

    const regex = /([A-Z]*)+(\w{5})(\d*)CE/;
    let strike = Number(item.tradingsymbol.match(regex)[3]);
    let breakeven = strike+item.buy_price;
    let intrinsicValue = stockPrice-breakeven;
    let breakevenChg = ((intrinsicValue)*100/stockPrice).toFixed(2)
    let expiryPnL = intrinsicValue*item.quantity;

    let bidPrice = optionDepth.buy[0].price
    let offerPrice = optionDepth.sell[0].price;
    let currValue = Number((item.quantity*bidPrice).toFixed(2))
    let pnl = currValue - item.buy_value;
    totalProfit+=pnl;
    totalInvestment += item.buy_value;
    netCurrentValue += currValue;
    netExpiryPnl += expiryPnL;
    
    // price,tradingsymbol,lotSize,buyPrice,sellPrice
    return {
      expiryPnL,
      breakeven,
      breakevenChg,
      stockCode:item.stockCode,
      stockPrice,
      stockPriceChg,
      tradingsymbol: item.tradingsymbol,
      quantity: item.quantity,
      buyValue: item.buy_value,
      buyPrice: item.buy_price,
      sellPrice: state.quotes[`NFO:${item.tradingsymbol}`].depth.buy[0].price,
      bidPrice,
      currValue,
      offerPrice,
      pnl
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
      cell:row=><div>{row.stockPrice}<br/><span className={row.stockPriceChg>0?'has-text-success':'has-text-danger'}>&nbsp;({row.stockPriceChg})</span></div>
    },
    {
      name: 'breakeven',
      selector: 'breakevenChg',
      wrap:true,
      sortable: true,
      cell:row=><div>{row.breakeven}<br/> <span className={row.breakevenChg>0?'has-text-success':'has-text-danger'}>&nbsp;({row.breakevenChg})</span></div>
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
        <span className={(row.expiryPnL>0?'has-text-success':'has-text-danger')}>
          {row.expiryPnL.toFixed(2)}</span></div>
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

export async function getServerSideProps(ctx) {
  let { req, res, query } = ctx;
  let userProfile = {};
  try{
    let kt = await getKiteClient(req.cookies);
    userProfile = await kt.getProfile()
  }catch(e){
    console.log(e)
  }
  return {
    props:{
      userProfile
    }
  }
}
