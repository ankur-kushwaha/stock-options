export default function useZerodha(){
  const createOrder = ({
    transactionType,tradingsymbol,quantity,price
  }) => () => {
        
    window.open(`/api/createOrder?tradingsymbol=${tradingsymbol}&quantity=${quantity}&price=${price}&transactionType=${transactionType}`, "_blank");
  }

  return {
    createOrder
  }
}