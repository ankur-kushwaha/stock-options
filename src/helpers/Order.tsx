import useZerodha from './useZerodha';

let {createOrder2,getHistory} = useZerodha();



function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  



class Order{
  
    sellOrder: { orderId: any; timestamp: any; tradingsymbol: any; averagePrice: any; quantity: any; status: any; transactionType: any; price: any; };
    buyOrder: { orderId: any; timestamp: any; tradingsymbol: any; averagePrice: any; quantity: any; status: any; transactionType: any; price: any; };
    tradingsymbol: String
  status: string;
    
  constructor({
    tradingsymbol
  }){
    this.tradingsymbol = tradingsymbol
  }


  async createOrder({
    transactionType,
    quantity,
    price
  }){
  
    if(transactionType == 'BUY'){
      console.log('buying stock...')
    }else{
      console.log('selling stock...')
    }
  
  
    let orderId = await createOrder2({
      transactionType,
      tradingsymbol:this.tradingsymbol,
      quantity,
      price: price
    });
  
    if(!orderId){
      console.log('order failed....');
      return ;
    }
  
    let currKiteOrder = await this.getOrder(orderId);
    if(!currKiteOrder){
      console.log('No kite order recieved for orderid',orderId);
      return;
    }
  
    return this.getMappedOrder(currKiteOrder);
  }

  getMappedOrder(currOrder){
    return {
      orderId:currOrder.order_id,
      timestamp:currOrder.order_timestamp,
      tradingsymbol:currOrder.tradingsymbol,
      averagePrice : currOrder.average_price,
      quantity : currOrder.quantity,
      status:currOrder.status,
      transactionType:currOrder.transaction_type,
      price:currOrder.average_price||currOrder.price,
    }
  }

  async getOrder(orderId){
    await sleep(200);
    let allOrders = await fetch('/api/getOrders').then(res=>res.json())

    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
    if(!currOrder){
      console.log('Order not created');
      return;
    }

    return currOrder;
  }

  async trySell({
    price,
    quantity
  }){
    let sellOrder = await this.createOrder({
      transactionType:"SELL",
      quantity,
      price
    })
    if(sellOrder){
      this.sellOrder = sellOrder;
    }
    return sellOrder;
  }

  async tryBuy({
    price,
    quantity
  }){
     
    let buyOrder = await this.createOrder({
      transactionType:"BUY",
      quantity,
      price
    })
    if(buyOrder){
      this.buyOrder = buyOrder;
    }
    return buyOrder;
  }
     
    
  async openPosition({transactionType,price,quantity}: { transactionType: string; price: number;quantity:number }): Promise<void> {
    let position;
    if(transactionType == 'SELL'){
      position = await this.trySell({
        price,
        quantity
      })
      
    }else{
      position = await this.tryBuy({
        price,
        quantity
      })
    }

    if(position.status == 'COMPLETE'){
      this.status = 'POSITION_OPEN'
    }else{
      this.status = 'POSITION_OPEN_PENDING'
    }
  }

  async tryClosePosition({price}){
    let closePositionOrder;
    if(this.buyOrder){
      if(price>this.buyOrder.price){
        closePositionOrder = await this.trySell({
          price,
          quantity:this.buyOrder.quantity
        })
        
      }else{
        console.log('Sell order blocked',this)
      }
    }else if(this.sellOrder){
      if(price<=this.sellOrder.price){
        closePositionOrder = await this.tryBuy({
          price,
          quantity:this.sellOrder.quantity
        })
        
      }else{
        console.log('Buy order blocked',this)
      }
    }

    if(closePositionOrder && closePositionOrder.status == 'COMPLETE'){
      this.status = 'CLOSED'
    }else{
      this.status = 'POSITION_CLOSE_PENDING'
    }


  }

}

export default Order;