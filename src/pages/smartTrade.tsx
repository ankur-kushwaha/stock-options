import { useRouter } from 'next/router';
import React from 'react'
import { postData } from '../helpers/fetch';
import useZerodha from '../helpers/useZerodha';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   

export default function SmartTrade({tradingsymbol}){
  const router = useRouter()
  let {query}  = router;
  let {createOrder2}  =useZerodha()

  const [state,setState] = React.useState({
    tradingsymbol: tradingsymbol,
    transactionType:"BUY",
    exchange:"NSE",
    quantity:0,
    shouldLoop:false,
    currOrder:null
  });

  // console.log(state,query.tradingsymbol);
  


  const handleChange = (key)=>(e)=>{
    if(key=='expiry'){
      router.push({
        pathname: '',
        query: { ...query,[key]:e.target.value },
      })
    }
    
    setState({
      ...state,
      [key]:e.target.value
    })
  }

  function log(...args){
    console.log('smartTrade',args)
  }

  async function trackOrder(orderId=null){
    let instruments = `${state.exchange}:${state.tradingsymbol}`
    let response = await fetch(`/api/getQuote?instruments=${instruments}`).then(res=>res.json())
    let currOrder;
    
    if(state.transactionType == 'BUY'){

      do{
        

        if(state.shouldLoop){
          log("Breaking loop")
          break;
        }

        let topBuyPrice = response.quotes[instruments].depth.buy[0].price;
        let buyPrice = topBuyPrice;

        if(orderId){
          currOrder = await getOrder(orderId)

          if(['COMPLETE','REJECTED','CANCELLED'].includes(currOrder.status)){
            break;
          }
        
          if(topBuyPrice > currOrder.price){
            buyPrice = topBuyPrice + 0.5
          }else{
            let secondTopBuyPrice = response.quotes[instruments].depth.buy[1].price;
            buyPrice = secondTopBuyPrice + 0.5
          }
        }
        console.log(`topBuyPrice: ${topBuyPrice},buyPrice: ${buyPrice}`)

        if(!orderId){
          log('OrderId is null, creating new order')
          
          orderId = await createOrder2({
            transactionType:state.transactionType,
            tradingsymbol:state.tradingsymbol,
            quantity:state.quantity,
            price:buyPrice,
            exchange:state.exchange
          })
          if(!orderId){
            break;
          }
        }else{
          log(`OrderId:${orderId}, updating order with price ${buyPrice}`)
          await postData('/api/modifyOrder',{
            variety:"regular",
            orderId:orderId,
            params:{
              price:buyPrice
            }
          });
        }
        sleep(1000);
      }while(true)
    }

    setState({
      ...state,
      currOrder
    })
    

  }

  async function getOrder(orderId){
    
    let allOrders = await fetch('/api/getOrders').then(res=>res.json())
    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
    if(!currOrder){
      console.log('Invalid OrderID');
      return;
    }
    return currOrder
  }

  async function handleButtonClick(){
    await trackOrder()
  }
  function breakLoop(){
    setState({
      ...state,
      shouldLoop:true
    })
  }

  return<div className="mt-6 container">
    <div className="columns">
    
      <div className="column is-3">

        <div className="box">
          <div className="is-size-7">
            Exchange
          </div>
          <div className="field">
            <div className="control is-small">
              <input onChange={handleChange('exchange')} value={state.exchange} className="input is-small" type={'text'} />
            </div>
          </div>
          <div className="is-size-7">
            Stock
          </div>
          <div className="field">
            <div className="control is-small">
              <input onChange={handleChange('tradingsymbol')} value={state.tradingsymbol} className="input is-small" type={'text'} />
            </div>
          </div>
          <div className="is-size-7">
            Quantity
          </div>
          <div className="field">
            <div className="control is-small">
              <input onChange={handleChange('quantity')} value={state.quantity} className="input is-small" type={'text'} />
            </div>
          </div>

          <div className="field">
            <div className="control is-small">
              <input checked={state.transactionType=='BUY'} onChange={handleChange('transactionType')} value="BUY" name="transactionType" type="checkbox"></input> BUY
              <input checked={state.transactionType=='SELL'} onChange={handleChange('transactionType')} value="SELL" name="transactionType" type="checkbox"></input>SELL
            </div>
          </div>
          <button className="is-success is-fullwidth button " onClick={handleButtonClick}>Start Trading</button>
          <button className="is-success is-fullwidth button " onClick={breakLoop}>Stop Trading</button>
        </div>
      </div>
      <div className="column">
        {JSON.stringify(state.currOrder,null,2)}
      </div>
    </div>

  </div>
};

export async function getServerSideProps(ctx){
  let {query} = ctx;
  return {
    props:{
      tradingsymbol:query.tradingsymbol
    }
  }
}