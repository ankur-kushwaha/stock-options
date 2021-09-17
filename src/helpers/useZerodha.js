import { useToasts } from 'react-toast-notifications'
const dev = false;//process.env.NODE_ENV !== 'production';

export default function useZerodha(){
  const { addToast } = useToasts()
  const createOrder = ({
    transactionType,tradingsymbol,quantity,price
  }) => () => {
    window.open(`/api/createOrder?tradingsymbol=${tradingsymbol}&quantity=${quantity}&price=${price}&transactionType=${transactionType}`, "_blank");
  }

  let mockhistory=[{
    "timestamp":"2021-09-06T09:15:00+05:30",
    "close":210.07,
    "open":210.07,
    "signal":"RED"
  }];

  const getMockHistory = async ()=>{
    let lastClose = mockhistory[0].close;
    let nextClose = lastClose + ((Math.random()*10) * (Math.round(Math.random()) ? 1 : -1));
    let nextOpen = lastClose + ((Math.random()*10) * (Math.round(Math.random()) ? 1 : -1));

    mockhistory.push({
      actual:{
        close:nextClose
      },
      "timestamp":new Date().toString(),
      "close":nextClose,
      "open":nextOpen,
      "signal":nextClose-nextOpen>0?"GREEN":"RED"
    }
    )

    return await Promise.resolve({
      history:[...mockhistory]
    });

    
  }

  const createOrder2 = async ({
    transactionType,tradingsymbol,quantity,price
  }) => {
    
    let url = `/api/createOrder?tradingsymbol=${tradingsymbol}&quantity=${quantity}&price=${price}&transactionType=${transactionType}`;
    console.log('Creating order...',url);
    if(dev){
      
      url = url+"&variety=amo"
      let res = await fetch(url).then(res=>res.json());
      if(res.error?.message){
        console.log(res);
        addToast(res.error?.message)
      }
      return res.data?.order_id;
    }else{
      let res = await fetch(url).then(res=>res.json());
      return res.data.order_id;
    }

    
    // return 123;
  }


  function login(){

  }

  function logout(){
    return fetch('/api/logout')
  }

  async function getHistory(targetTradingsymbol,{interval}={}){
    if(dev){
      return await getMockHistory();
    }else{
      return await fetch(`/api/getDayHistory-v2?instruments=${targetTradingsymbol}&interval=${interval||'ONE_MINUTE'}`)
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