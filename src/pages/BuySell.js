import React from 'react'
import Header from '../components/Header';
import Table from '../components/Table';
import useZerodha from '../helpers/useZerodha';
import { getKiteClient } from '../helpers/kiteConnect';
import { postData } from '../helpers';
import getTicks from '../helpers/getTicks';
import Price from '../components/Price';
import { useRouter } from 'next/router'
import User from '../models/user'
import BuySellConfig from '../components/BuySellConfig';

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

  let {createOrder2,getHistory} = useZerodha();
  // let [stockTrades,setStockTrades] = React.useState(trades);
  let [history,setHistory] = React.useState([]);
  let defaultConfig = {
    maxOrder: userProfile.configs.maxOrder||3,
    minTarget:  userProfile.configs.minTarget||10,
    quantity : userProfile.configs.quantity||100
  }
  const [config,setConfig] = React.useState(defaultConfig);

  let orders = [];
  if(userProfile.orders){
    orders = userProfile.orders.filter(item=>item.tradingsymbol == tradingsymbol)
  }
  
  let [state,setState] = React.useState({
    positions:[],
    currTrend:"",
    profit:0,
    profitArr:[],
    tradeCount:0,
    orders: orders,
    
  });

  React.useEffect(()=>{

    

    async function fetchHistory(){

      let regex = /NIFTY(.*)(\d{5})([C|P]E)/
    
      let map = {
        "21909":"09SEP21",
        "219016":"16SEP21",
        "219023":"23SEP21",
        "219030":"30SEP21"
      }

      let out = tradingsymbol.match(regex);
      let srcDate = out[1];
      let strike = out[2]
      let type = out[3];


      let targetTradingsymbol = `NIFTY${map[srcDate]}${strike}${type}`
      let res = await getHistory(targetTradingsymbol);

      if(config.shouldRun){
        setHistory(res.history);
      }
    }

    let interval = setInterval(fetchHistory,10000);
    if(config.shouldRun){
      fetchHistory();
    }
    return ()=>{
      clearInterval(interval);
    }
      
  },[config.shouldRun])

  React.useEffect(async ()=>{
    console.log("-----------------");
    
    if(history.length == 0){
      console.log('Returning as history length is 0')
      return ;
    }

    let item = history[history.length-1];
    console.log('history updated, last quote: ',item);

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

    let hasOrdersUpdated = false;

    if(trendReverse){
      if(newTrend == 'DOWN'){
      //sell signal
      //sell all whose price is less than buy price;

        console.log("New trend is DOWN, checking open orders ", item, orders);
      
        item.order=[];
        
        let executedOrders = [];
        for(let order of orders){
          if((item.close - order.average_price) > ((config.minTarget * order.average_price)/100)){
            console.log('Triggering Sell order for', order);
            
            
            hasOrdersUpdated = true;
            executedOrders.push(order.order_id);
            
            let currOrder = await createOrder(item);

            let currProfit = currOrder.average_price - order.average_price;
            order.profit = currProfit;
            profit += currProfit;

            profitArr.push(currProfit);

          }else{
            console.log(`Sell order blocked due to either order already closed ${order.isClosed} or sell diff(${item.close - order.average_price}) bw itemClose(${item.close}) and orderClose(${order.average_price}) is less than ${config.minTarget}% of orderClose(${order.average_price}) i.e (${(config.minTarget * order.average_price)/100})`)
          }
        }
        //Remove executed orders
        orders = orders.filter(item=>!executedOrders.includes(item.order_id));

      }

      if( newTrend == 'UP' ){
      //Buy signal
        
        console.log("New trend is UP, checking open orders and maxOrders ", JSON.stringify(orders),config.maxOrder);
        
        if(orders.length < config.maxOrder){
          console.log('Triggerring BUY order....')
          
          

          let orderId = await createOrder2({
            transactionType:"BUY",
            tradingsymbol,
            quantity:config.quantity,
            price: config.marketOrder?'MARKET':item.actual.close
          });

          if(orderId == null){
            console.log("Create order failed");
            return ;
          }

          await sleep(1000);

          let allOrders = await fetch('/api/getOrders').then(res=>res.json())
          let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
          if(!currOrder){
            console.log('Invalid OrderID');
            return;
          }
          console.log(currOrder);
          tradeCount++;
          orders.push(currOrder);
          hasOrdersUpdated = true;

        }else{
          console.log("BUY order blocked as there are open orders",orders)
        }
            
      } 
    }
    

    setState({
      hasOrdersUpdated,
      currTrend:newTrend,
      tradeCount,
      trendReverse,
      profit,
      orders,
      profitArr
    })

  },[history.length])
  
  React.useEffect(async ()=>{
    if(state.orders.length ==0){
      return;
    }
    let response = await fetch('/api/getPositions').then(res=>res.json());
    let positions  = response.net.filter(item=>item.tradingsymbol == tradingsymbol);
    setState({
      ...state,
      positions
    })

    await save()

  },[state.hasOrdersUpdated])

  async function createOrder(item){
    
    let orderId = await createOrder2({  
      transactionType : "SELL",
      tradingsymbol,
      quantity : config.quantity,
      price : config.marketOrder ? 'MARKET' : item.actual.close
    });

    await sleep(1000);

    let allOrders = await fetch('/api/getOrders').then(res=>res.json())
    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
    
    return currOrder;
  }


  const columns = [{
    name:'tradingsymbol',
    selector:'tradingsymbol'
  },
  
  {
    name:'buy_price',
    selector:'buy_price'
  },{
    name:'sell_price',
    selector:'sell_price'
  },{
    name:'average_price',
    selector:'average_price'
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

  const save = React.useCallback(async function save({
    newConfig,
    newOrders
  }={}){
    let data = {
      userId:userProfile.user_id,
      configs:newConfig||config,
      orders:newOrders||state.orders
    };
    console.log('Saving user',data)
    await postData('/api/updateUser',data);
    
  },[config,state.orders])

  async function handleUpdate(config){
    setConfig(config);
    await save({newConfig:config});
  }

  let orderColumns=[{
    name:'tradingsymbol',
    selector:'tradingsymbol'
  },{
    name:'order_id',
    selector:'order_id'
  },{
    name:'status',
    selector:'status'
  },{
    name:'order_timestamp',
    selector:'order_timestamp'
  },{
    name:'order_type',
    selector:'order_type'
  },{
    name:'quantity',
    selector:'quantity'
  },{
    name:'price',
    selector:'price'
  },{
    name:'average_price',
    selector:'average_price'
  }];

  async function cleanOrders(type){
    
    let orders = [];
    await save({
      newOrders:orders
    })

    setState({
      ...state,
      orders
    })
  }

  return (
    <div >
      {/* <button onClick={save}>Save</button> */}
      <Header userProfile={userProfile} tab="positions"></Header>

      <div className="container mt-4">

        <article className={"message "+(config.shouldRun?'is-success':"is-danger")}>
          <div className="message-body">
            <BuySellConfig config={config} cleanOrders={cleanOrders} onUpdate={handleUpdate}></BuySellConfig>
          </div>
        </article>       
      
      </div>

      <div className="container mt-5">

        <div className="columns">
          <div className="column">
            <Table title={"Orders(Zerodha)"} columns={columns} data={state.positions}></Table>
          </div>
        </div>
      </div> 

      <div className="container mt-5">

        <div className="columns">
          <div className="column">
            <Table title={"Orders(SmartOptions)"} columns={orderColumns} data={state.orders}></Table>
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
  let dbUser = (await User.findOne({user_id:userProfile.user_id})).toObject();
  userProfile.configs = dbUser.configs;
  userProfile.orders = dbUser.orders;

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
