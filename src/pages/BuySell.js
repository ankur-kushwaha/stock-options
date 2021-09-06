import React from 'react'
import Header from '../components/Header';
import Table from '../components/Table';
import useZerodha from '../helpers/useZerodha';
import { getKiteClient } from '../helpers/kiteConnect';
import currencyFormatter from 'currency-formatter';
import getTicks from '../helpers/getTicks';
import Price from '../components/Price';
import { useRouter } from 'next/router'
import date from 'date-and-time';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   


export default function holdings({
  positions,  
  userProfile
}) {
  let {query} = useRouter();
  let {tradingsymbol} = query;

  let {createOrder2} = useZerodha();
  let [tickerQuotes,setTickerQuotes] = React.useState();
  // let [stockTrades,setStockTrades] = React.useState(trades);
  let [history,setHistory] = React.useState([]);
  let maxOrder = 3;
  let minTarget = 10;
  let quantity = 100;
  let [state,setState] = React.useState({
    currTrend:"",
    profit:0,
    profitArr:[],
    tradeCount:0,
    orders:[],
    
  });
  

  React.useEffect(()=>{
    let quotesInstruments = Object.values(positions.map(item=>item.instrument_token));
    console.log('positions',positions)
    getTicks(quotesInstruments,(ticks)=>{
      setTickerQuotes(ticks);
    });
  },[positions])

  React.useEffect(()=>{

    async function fetchHistory(){

      let regex = /NIFTY(.*)(\d{5})([C|P]E)/
    
      let map = {
        "21909":"09SEP21"
      }
      let out = tradingsymbol.match(regex);
      let srcDate = out[1];
      let strike = out[2]
      let type = out[3];


      let targetTradingsymbol = `NIFTY${map[srcDate]}${strike}${type}`
      // NIFTY 21 9 09 17200 CE
      // NIFTY 09 SEP 21 17000 CE

      let res = await fetch(`/api/getDayHistory-v2?instruments=${targetTradingsymbol}&exchange=NFO`)
        .then(res=>res.json())
      setHistory(res.history);
      
    }

    setInterval(fetchHistory,10000);
    fetchHistory();
      
  },[])

  React.useEffect(async ()=>{
    console.log("-----------------");
    
    if(history.length == 0){
      console.log('Returning as history length is 0')
      return ;
    }

    let item = history[history.length-1];
    console.log('history updated, last quote at ',item.timestamp);

    let {tradeCount,profit} = state;
    let profitArr = [...state.profitArr];
    let orders = [...state.orders];

    let newTrend = item.signal=='GREEN'?"UP":"DOWN";
    
    let trendReverse = false;
    if(state.currTrend && (state.currTrend != newTrend)){
      console.log("Trend reversed ", state.currTrend,newTrend);
      trendReverse = true;
    }else{
      console.log("Trend continuing... ", newTrend);
    }

    if(trendReverse){
      if(newTrend == 'DOWN'){
      //sell signal
      //sell all whose price is less than buy price;

        console.log("New trend is DOWN, checking open orders ", item, orders);
      
        item.order=[];
        
      
        for(let order of orders){
          if(!order.isClosed && (item.close - order.average_price) > ((minTarget * order.average_price)/100)){
            console.log('Triggering Sell order for', order);
            
            order.isClosed = true;
            
            
            let currOrder = await createOrder();

            let currProfit = currOrder.average_price - order.average_price;
            order.profit = currProfit;
            profit += currProfit;

            profitArr.push(currProfit);

          }else{
            console.log(`Sell order blocked due to either order already closed ${order.isClosed} or sell diff(${item.close - order.average_price}) bw itemClose(${item.close}) and orderClose(${order.average_price}) is less than ${minTarget}% of orderClose(${order.average_price}) i.e (${(minTarget * order.average_price)/100})`)
          }
        }
      }

      if( newTrend == 'UP' ){
      //Buy signal
        
        console.log("New trend is UP, checking open orders and maxOrders ", JSON.stringify(orders),maxOrder);
        
        if(orders.filter(item=>!item.isClosed).length < maxOrder){
          console.log('Triggerring BUY order....')
          
          tradeCount++;
          item.order='BUY'

          let orderId = await createOrder2({
            transactionType:"BUY",
            tradingsymbol,
            quantity,
            price:'MARKET'
          })

          await sleep(1000);

          let allOrders = await fetch('/api/getOrders').then(res=>res.json())
          let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
          console.log(currOrder);

          orders.push(currOrder);

        }else{
          console.log("BUY order blocked as there are open orders",orders)
        }
            
      } 
    }
    

    setState({
      currTrend:newTrend,
      tradeCount,
      trendReverse,
      profit,
      orders,
      profitArr
    })

    

  },[history.length])


  async function createOrder(){
    debugger;
    let orderId = await createOrder2({  
      transactionType:"SELL",
      tradingsymbol,
      quantity,
      price:'MARKET'
    })

    await sleep(1000);

    let allOrders = await fetch('/api/getOrders').then(res=>res.json())
    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
    console.log(currOrder);
    return currOrder;
  }
  

  // const sellStock=(row)=>(e)=>{
  //   let newStocksTrades = stockTrades.slice()
  //   let  index= newStocksTrades.findIndex(item=>row.trade_id == item.trade_id);
  //   let selectedTrade = newStocksTrades[index];
    

  //   selectedTrade.status='SELL_ORDER_TRIGGERED';
  //   setStockTrades([
  //     ...newStocksTrades
  //   ])
  // }

  const columns = [{
    name:'tradingsymbol',
    selector:'tradingsymbol'
  },
  {
    name:'fill_timestamp',
    selector:'fill_timestamp'
  },
  {
    name:'transaction_type',
    selector:'transaction_type'
  },{
    name:'average_price',
    selector:'average_price'
  },{
    name:'currentPrice',
    selector:'status',
    cell:row=>(<>{tickerQuotes && tickerQuotes[row.instrument_token].depth.buy[0].price}</>)
  },{
    name:'quantity',
    selector:'quantity'
  },{
    name:'status',
    selector:'status'
  },{
    name:'pnl',
    selector:'pnl',
    // cell:row=>(<button onClick={sellStock(row)}>Sell</button>)
  }]

  function buy(){
    createOrder2({});
  }

  return (
    <div >
      {/* <button onClick={buy}>BUY</button> */}
      <Header userProfile={userProfile} tab="positions"></Header>

      <div className="container mt-4">

        <article className="message is-info">
          <div className="message-body">
           
          </div>
        </article>       
      
      </div>

      <div className="container mt-5">

        <div className="columns">
          <div className="column">
            <Table columns={columns} data={positions}></Table>
          </div>
        </div>
      </div> 
      
    </div>
  )
}

export async function getServerSideProps(ctx) {
  let {req} = ctx;
  let {tradingsymbol} = req.query;

  let kc,userProfile;
  kc = await getKiteClient(req.cookies);
  userProfile = await kc.getProfile();
  let positions = await kc.getPositions();

  positions = positions.net.filter(item=>{
    return item.tradingsymbol == tradingsymbol
  }).map(item=>{
    // item.fill_timestamp = JSON.stringify(item.fill_timestamp)
    // item.exchange_timestamp = JSON.stringify(item.exchange_timestamp)
    return item;
  });
  

  return {
    props:{
      positions,
      userProfile
    }
  }

}
