export default function useZerodha(){
  const createOrder = ({
    transactionType,tradingsymbol,quantity,price
  }) => () => {
    window.open(`/api/createOrder?tradingsymbol=${tradingsymbol}&quantity=${quantity}&price=${price}&transactionType=${transactionType}`, "_blank");
  }

  const createOrder2 = async ({
    transactionType,tradingsymbol,quantity,price
  }) => {
    const dev = process.env.NODE_ENV !== 'production';
    
    if(dev){
      
      if(transactionType == 'SELL'){
        price = 10000
      }else{
        price = 1;
      }
    
      let url = `/api/createOrder?tradingsymbol=${tradingsymbol}&quantity=${quantity}&price=${price}&transactionType=${transactionType}`;
      
      console.log("Creating order", url)
      let res = await fetch(url).then(res=>res.json());
      return res.data.order_id;
      
    }else{
      
      let url = `/api/createOrder?tradingsymbol=${tradingsymbol}&quantity=${quantity}&price=${price}&transactionType=${transactionType}`;
      
      console.log("Creating order", url)
      let res = await fetch(url).then(res=>res.json());
      return res.data.order_id;
    }
  }


  function login(){

  }

  function logout(){
    return fetch('/api/logout')
  }

  return {
    createOrder,
    createOrder2,
    login,
    logout
  }
}