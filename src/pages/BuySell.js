import React from 'react'
import Header from '../components/Header';
import Price from '../components/Price';
import Table from '../components/Table';
import useZerodha from '../helpers/useZerodha';
import { getKiteClient } from '../helpers/kiteConnect';
import { postData } from '../helpers';
import { useRouter } from 'next/router'
import User from '../models/user'
import BuySellConfig from '../components/BuySellConfig';
import Head from 'next/head'
import { useToasts } from 'react-toast-notifications'
import fetch from '../helpers/fetch';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   

export default function BuySell({
  userProfile
}) {
  const { addToast } = useToasts()

  let {query} = useRouter();
  let {tradingsymbol} = query;

  let {createOrder2,getHistory} = useZerodha();
  let [history,setHistory] = React.useState([]);

  let defaultConfig = {
    tradingsymbol,
    maxOrder: userProfile.configs?.maxOrder || 3,
    minTarget:  userProfile.configs?.minTarget || 10,
    quantity : userProfile.configs?.quantity || 100,
    isBullish: !!userProfile.configs?.isBullish,
    marketOrder: !!userProfile.configs?.marketOrder,
    interval:userProfile.configs?.interval||'ONE_MINUTE'
  }
  const [config,setConfig] = React.useState(defaultConfig);
  
  let [state,setState] = React.useState({
    hasOrdersUpdated:0,
    currTrend:"",
    profit:0,
    profitArr:[],
    tradeCount:0,
    orders: userProfile.orders?.filter(item=>item.tradingsymbol == tradingsymbol),
    closedOrders: userProfile.closedOrders?.filter(item=>item.tradingsymbol == tradingsymbol)||[],
    closePrice:0,
    pendingOrders:[]
  });

  React.useEffect(()=>{
    log(userProfile);

    fetch('/api/getQuote?instruments=NFO:'+tradingsymbol).then(res=>res.json()).then(res=>{
      let quote = res.quotes['NFO:'+tradingsymbol];
      if(!quote){
        console.log('Quote not available for ', tradingsymbol)
        return;
      }
      setState({
        ...state,
        closePrice:quote.depth.buy[0].price||quote.last_price
      })
    });
    
  },[])

  // Trigger trading
  React.useEffect(()=>{ 

    async function fetchHistory(){

      let res = await getHistory(tradingsymbol,{
        interval:config.interval
      });

      if(config.shouldRun){
        setHistory(res.history);
      }
    }

    let interval;
    if(config.shouldRun){
      interval = setInterval(fetchHistory,10000);
      fetchHistory();
    }
    return ()=>{
      clearInterval(interval);
    }
      
  },[config.shouldRun])

  async function triggerBuyOrder(item){
    let orderId = await createOrder2({
      transactionType:"BUY",
      tradingsymbol,
      quantity:config.quantity,
      price: config.marketOrder?'MARKET':item.actual.close
    });

    if(orderId == null){
      log("Create order failed");
      return ;
    }

    await sleep(1000);

    let allOrders = await fetch('/api/getOrders').then(res=>res.json())
    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
    if(!currOrder){
      log('Invalid OrderID');
      return;
    }
    return currOrder;
    
  }

  async function triggerSellOrder(order,item){
    log('Triggering Sell order for', order);

    let orderId = await createOrder2({  
      transactionType : "SELL",
      tradingsymbol,
      quantity : order.quantity,
      price : config.marketOrder ? 'MARKET' : item.actual.close
    });

    await sleep(1000);

    let allOrders = await fetch('/api/getOrders').then(res=>res.json())
    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];

    if(!currOrder ){
      log("Sell Order failed");
      return;
    }


    order.buyPrice = order.average_price;
    order.sellPrice = currOrder.average_price||currOrder.price;
    order.profit = ( order.sellPrice - order.buyPrice ) * order.quantity;
    order.closingOrder = currOrder;

    return order;

  }

  // Buy/Sell
  React.useEffect(async ()=>{
    
    
    if(history.length == 0){
      return ;
    }

    let item = history[history.length-1];
    log('history updated, last quote: ',item.actual.close ,item);

    let {tradeCount,profit} = state;
    let profitArr = [...state.profitArr];
    let orders = [...state.orders];
    
    let closedOrders = [...state.closedOrders];
    let pendingOrders = [...state.pendingOrders];

    let newTrend = item.signal=='GREEN'?"UP":"DOWN";
    
    let trendReverse = false;
    if(state.currTrend && (state.currTrend != newTrend)){
      log("Trend reversed ", state.currTrend,newTrend);
      trendReverse = true;
    }else{
      log("Trend continuing... ", newTrend);
    }

    let hasOrdersUpdated = state.hasOrdersUpdated;
    

    if(trendReverse){
      if(newTrend == 'DOWN'){
        log('Trend reversed and moving downwards',item);
        //sell signal
        //sell all whose price is less than buy price;

        if(config.isBullish){

          log("Bullish flag is enabled, checking open orders ", orders);
        
          let executedOrders = [];
          for(let order of orders){
            let buyPrice = order.average_price||order.price;
            if((item.actual.close - buyPrice) > ((config.minTarget * buyPrice)/100)){
              let closedOrder = await triggerSellOrder(order,item);
              if( closedOrder && closedOrder.status != 'COMPLETE'){
                pendingOrders.push(closedOrder);
              }else if(closedOrder){
                executedOrders.push(closedOrder.order_id);
                hasOrdersUpdated++;
              }
            }else{
              log(`Sell order blocked, Min Change: ${(config.minTarget * buyPrice)/100}, Current Chg: ${item.actual.close - buyPrice}, BuyPrice: ${buyPrice}, LTP: ${item.actual.close}, MinTarget: ${config.minTarget}`);
            }
          }
          //Remove executed orders
          closedOrders = closedOrders.concat(orders.filter(item=>executedOrders.includes(item.order_id)))
          orders = orders.filter(item=>!executedOrders.includes(item.order_id));
        }

      }

      if( newTrend == 'UP' ){
      //Buy signal
        log('Trend reversed and moving upwards',item);

        if(config.isBullish){
        
          log("Bullish flag is enabled, checking open orders and maxOrders ", orders);
        
          if(orders.length < config.maxOrder){
            log('Triggerring BUY order....');

            let newBuyOrder = await triggerBuyOrder(item);

            if(newBuyOrder && newBuyOrder.status != 'COMPLETE'){
              pendingOrders.push(newBuyOrder);
            }else if(newBuyOrder){
              orders.push(newBuyOrder);
              hasOrdersUpdated++;
            }

          }else{
            log("BUY orders limit reached",orders);
          }
        }
      } 
    }

    if(state.hasOrdersUpdated != hasOrdersUpdated){
      await save({
        orders,
        closedOrders
      })
    }
    

    setState({
      pendingOrders,
      hasOrdersUpdated,
      currTrend:newTrend,
      tradeCount,
      trendReverse,
      profit,
      closedOrders,
      orders,
      profitArr,
      closePrice: item.actual.close
    })

    if(pendingOrders.length>0){
      await refreshPendingOrders()
    }

  },[history.length])

  async function createOrder(item,{
    transactionType,
    quantity
  }={}){
    
    let orderId = await createOrder2({  
      transactionType : transactionType||"SELL",
      tradingsymbol,
      quantity : quantity || config.quantity,
      price : config.marketOrder ? 'MARKET' : item.actual.close
    });

    await sleep(1000);

    let allOrders = await fetch('/api/getOrders').then(res=>res.json())
    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
    
    return currOrder;
  }

  async function save({
    newConfig,
    orders,
    closedOrders
  }={}){
    addToast('Saving User');
    let data = {
      userId:userProfile.user_id,
      tradingsymbol,
      session:{
        configs:newConfig||config,
        orders:orders||state.orders,
        closedOrders:closedOrders||state.closedOrders
      }
    };
    log('Saving user',data);
    await postData('/api/updateUser',data);
    
  }

  async function handleUpdate(config){
    setConfig(config);
    await save({newConfig:config});
  }

  let closedOrderColumns = [{
    name:'tradingsymbol',
    selector:'tradingsymbol',
    grow:1
  },{
    name:'order_id',
    selector:'order_id',
    grow:1
  },{
    name:'quantity',
    selector:'quantity'
  },{
    name:'buyPrice',
    selector:'buyPrice'
  },{
    name:'sellPrice',
    selector:'sellPrice'
  },{
    name:'profit',
    selector:'profit',
    cell:row=><Price>{row.profit}</Price>
  },{
    name:"Delete",
    cell:row=><button className="button is-small" onClick={deletePosition(row,'closedOrders')}><span className="icon has-text-info">
      <i className="fas fa-times-circle"></i>
    </span></button>
  }]

  const BaseExpandedComponent = ({data})=><div className={"box"}>
    <span className="is-size-7">
      OrderID:{data.order_id}
    </span><br />
    <span className="is-size-7">
      Timestamp:{data.order_timestamp}
    </span>
  </div>;

  let pendingOrderColumns = [{
    name:'Timestamp',
    selector:'order_timestamp',
    grow:2,
    wrap:false
  },{
    name:'Quantity',
    selector:'quantity'
  },{
    name:'Status',
    selector:'status'
  },{
    name:'Buy Price',
    selector:'average_price',
    cell:row=><>{row.price}</>
  },{
    name:"Delete",
    cell:row=><button className="button is-small" onClick={deletePosition(row,'pendingOrders')}>
      <span className="icon has-text-info">
        <i className="fas fa-times-circle"></i>
      </span></button>
  }]

  let orderColumns=[{
    name:'TradingSymbol',
    selector:'tradingsymbol',
    grow:2,
    wrap:false
  },{
    name:'Quantity',
    selector:'quantity'
  },{
    name:'Status',
    selector:'status'
  },{
    name:'Buy Price',
    selector:'average_price',
    cell:row=><>{row.average_price||row.price}</>
  },{
    name:'LTP',
    selector:'price',
    cell:()=><>{state.closePrice}</>
  },{
    name:'PnL',
    selector:'pnl',
    cell:(row)=>
      <div>
        <Price>{row.profit}</Price><br/> (<Price>{row.profitPct}</Price>)
      </div>
  },{
    name:"Buy/Sell",
    cell:row=><button className="button is-small" onClick={closePosition(row)}>Sell</button>
  },{
    name:"Delete",
    cell:row=><button className="button is-small" onClick={deletePosition(row,'orders')}>
      <span className="icon has-text-info">
        <i className="fas fa-times-circle"></i>
      </span></button>
  }];

  const deletePosition = (order,type='orders')=>async ()=>{
    let orders = [...state[type]];
    orders = orders.filter(item=>item.order_id != order.order_id);
    await save({
      [type]:orders
    });
    setState({
      ...state,
      [type]:orders,
      hasOrdersUpdated:++state.hasOrdersUpdated
    })
  }

  const closePosition = (order)=>async ()=>{
    let orders = [...state.orders];
    let closedOrders = [...state.closedOrders];

    if(order.order_id){
      orders = orders.filter(item=>item.order_id != order.order_id);
    }else{
      orders = orders.filter(item=>item.order_id);
    }

    setState({
      ...state,
      orders
    })

    let currOrder = await createOrder({
      actual:{
        close:state.closePrice
      }
    },{
      transactionType:'SELL',
      quantity:order.quantity
    })

    let pendingOrders = [...state.pendingOrders];
    
    if(currOrder && currOrder.status != 'COMPLETE'){
      pendingOrders.push(currOrder);
    } else if(currOrder) {

      let sellPrice,buyPrice;
      
      buyPrice = order.average_price;
      sellPrice = currOrder.average_price || currOrder.price;
      
      order.sellPrice = sellPrice;
      order.buyPrice = order.average_price;
      order.profit = (sellPrice - buyPrice) * order.quantity;
      order.profitPct = (sellPrice - buyPrice)/buyPrice*100;
  
      closedOrders.push(order);

    } else {
      log('Sell order failed ',order);
    }

    setState({
      ...state,
      orders,
      pendingOrders,
      closedOrders
    })

    await save({
      orders,
      pendingOrders,
      closedOrders
    });
  }

  function log(...args){
    if(JSON.stringify(args).length<50){
      addToast(args);
    }
      
    console.log(args);
  }

  async function triggerNow(){
    let buyOrder = await triggerBuyOrder({
      actual:{
        close:state.closePrice
      }
    })

    if(buyOrder){
      let orders = [...state.orders];
      orders.push(buyOrder);
  
      setState({
        ...state,
        orders,
        hasOrdersUpdated:++state.hasOrdersUpdated
      })
    }

    
  }

  let totalProfit = 0;

  let orders = state.orders.map(order=>{
    let buyPrice = (order.average_price||order.price)
    order.profit = (state.closePrice - buyPrice) * order.quantity;
    totalProfit += order.profit;
    order.profitPct = (state.closePrice - buyPrice) * 100/buyPrice;
    return order;
  });


  async function refreshPendingOrders(){
    let response = await fetch('api/getOrders').then(res=>res.json())
    let pendingOrders = [...state.pendingOrders]
    let pendingOrdersId = pendingOrders.map(item=>item.order_id);

    let orders = [...state.orders];
    let closedOrders = [...state.closedOrders];

    for(let order of response){
      if(order.status =='COMPLETE' && pendingOrdersId.includes(order.order_id)){
        if(order.transaction_type == 'BUY'){
          orders.push(order);
        }else{
          closedOrders.push(order);
        }
        pendingOrders = pendingOrders.filter(item=>item.order_id != order.order_id);
      }
    }

    setState({
      ...state,
      pendingOrders,
      closedOrders,
      orders
    })

  }


  async function importOrders(){
    let orders = await fetch('/api/positions').then(res=>res.json());
    orders = orders.positions.net.filter(order=>{
      return order.tradingsymbol==tradingsymbol && order.quantity>0
    });

    setState({
      ...state,
      orders
    })
    
    await save({
      orders
    })
  }

  return (
    <div >
      <Head>
        <title>
          {`${totalProfit.toFixed(2)} | ${tradingsymbol} | ${(config.shouldRun?'Running... ':'Stopped')}`}
        </title>
      </Head>
      {/* <button onClick={save}>Save</button> */}
      <Header userProfile={userProfile} tab="BuySell"></Header>

      <div className="container mt-5">

        <div className="columns is-gapless">

          <div className="column is-3">
            
            <BuySellConfig importStock = {importOrders}config={config} triggerNow={triggerNow} onUpdate={handleUpdate}></BuySellConfig>
             
          </div>



          <div className="column">
            {state.pendingOrders.length>0 && <>
              <button className="button is-small" onClick={refreshPendingOrders}>
                Refersh Pending Orders
              </button>
              <Table 
                title={"Pending Orders"} 
                columns={pendingOrderColumns} 
                data={state.pendingOrders}
                expandableRows={true}
                ExpandedComponent={<BaseExpandedComponent/>}
              ></Table>
            </>}
            <Table 
              title={"Open Orders"} 
              columns={orderColumns} 
              data={orders}
              expandableRows={true}
              ExpandedComponent={<BaseExpandedComponent/>}
            ></Table>
            {state.closedOrders.length>0 &&
            <Table title={"Closed Orders"} columns={closedOrderColumns} data={state.closedOrders}></Table>
            }
          </div>
        </div>
      </div>

    
    </div>
  )
}

export async function getServerSideProps(ctx) {
  
  let {req,res} = ctx;
  let {tradingsymbol} = req.query;

  let kc,userProfile;
  try{
    kc = await getKiteClient(req.cookies);
    userProfile = await kc.getProfile();
  }catch(e){
    console.log(e)
    res.writeHead(307, { Location: `/`})
    res.end()
  }
  
  

  let dbUser = (await User.findOne({user_id:userProfile.user_id})).toObject();

  let session = dbUser.sessions.filter(item=>item.tradingsymbol == tradingsymbol)[0];

  userProfile.configs = session?.data.configs||dbUser.configs||{};
  userProfile.orders = session?.data.orders||[]
  userProfile.closedOrders = session?.data.closedOrders||[];
  

  return {
    props:{
      userProfile
    }
  }

}
