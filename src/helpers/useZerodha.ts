import { useToasts } from 'react-toast-notifications'
const dev = false;//process.env.NODE_ENV !== 'production';

let mockhistory=[{
  actual:{},
  "timestamp":"2021-09-06T09:15:00+05:30",
  "close":210.07,
  "open":210.07,
  "high":210.07,
  "low":210.07,
  "signal":"RED"
},{
  "timestamp":"2021-09-06T09:15:00+05:30",
  "close":210.07,
  "open":210.07,
  "high":210.07,
  "low":210.07,
  "signal":"RED"
}];

export const getMockHistory = async ()=>{
  
  let lastQuote = mockhistory[mockhistory.length-1];


  let lastClose = mockhistory[0].close;
  let nextClose = lastClose + ((Math.random()*10) * (Math.round(Math.random()) ? 1 : -1));
  let nextOpen = lastClose + ((Math.random()*10) * (Math.round(Math.random()) ? 1 : -1));

  mockhistory.push({
    actual:lastQuote,
    "timestamp":new Date().toString(),
    "open":(lastQuote.high+lastQuote.close)/2,
    "close":(lastQuote.high+lastQuote.close+lastQuote.open+lastQuote.low)/4,
    low:Math.min(lastQuote.high,lastQuote.close,lastQuote.open,lastQuote.low),
    high:Math.max(lastQuote.high,lastQuote.close,lastQuote.open,lastQuote.low),
    "signal":nextClose-nextOpen>0?"GREEN":"RED"
  }
  )

  console.log('Returning from mock',mockhistory[mockhistory.length-1])

  return await Promise.resolve({
    history:[...mockhistory]
  });  
}

export default function useZerodha(){
  // const { addToast } = useToasts()
  const createOrder = ({
    transactionType,tradingsymbol,quantity,price
  }) => () => {
    window.open(`/api/createOrder?tradingsymbol=${tradingsymbol}&quantity=${quantity}&price=${price}&transactionType=${transactionType}`, "_blank");
  }

 

  
type CreateOrder2={
  transactionType:string,tradingsymbol:string,quantity:number,price:number|string,
    exchange?:string
}
  
const createOrder2 = async ({
  transactionType,tradingsymbol,quantity,price,
  exchange
}:CreateOrder2) => {
    
  let url = `/api/createOrder?tradingsymbol=${tradingsymbol}&quantity=${quantity}&price=${price}&transactionType=${transactionType}&exchange=${exchange}`;
  console.log('Creating order...',url);
  if(dev){
      
    url = url+"&variety=amo";
    let res = await fetch(url).then(res=>res.json());
    if(res.error?.message){
      alert(res.error?.message)
      // addToast(res.error?.message)
    }
    return res.data?.order_id;
  }else{
    let res = await fetch(url).then(res=>res.json());
    if(res.error){
      alert(res.error.message);
      return ;
    }
    return res.data.order_id;
  }

    
  // return 123;
}


function login(){

}

function logout(){
  return fetch('/api/logout')
}

async function getHistory(targetTradingsymbol,{interval,exchange}:{interval:string,exchange:string}){
  if(dev){
    return await getMockHistory();
  }else{
    return await fetch(`/api/getDayHistory-v2?exchange=${exchange}&instruments=${targetTradingsymbol}&interval=${interval||'ONE_MINUTE'}`)
      .then(res=>res.json())
  }
}

return {
  getHistory,
  createOrder,
  createOrder2,
  login,
  logout
}
}