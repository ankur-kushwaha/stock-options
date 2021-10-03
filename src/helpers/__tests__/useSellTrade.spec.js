
import useSellTrade from '../useSellTrade';
import { renderHook, act } from '@testing-library/react-hooks'
import useZerodha from '../useZerodha';
var fetchMock = require('fetch-mock');



describe('useSellTrade', () => {

  beforeEach(() => {
    // fetch.resetMocks() 
    // fetch.doMock()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    fetchMock.reset();
  })

  it('should workd properly',async ()=>{
    fetchMock.get('/api/createOrder?tradingsymbol=INFY&quantity=100&price=0&transactionType=SELL', { data: {
      'order_id' :1}});
    


    const { result,waitForNextUpdate } = renderHook(() => useSellTrade({
      tradingsymbol:"INFY",
      quantity:100,
    },{

    }))

    
    
    jest.runAllTimers();
    await result.current.triggerOrderNow({
      transactionType:"SELL"
    })
    jest.runAllTimers();
    
    // jest.runAllTimers();
    await waitForNextUpdate()

    // expect(result.current.orders).toBe([{

    // }])
    
  })
})
