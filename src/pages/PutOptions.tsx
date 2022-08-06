import React, { useContext, useEffect } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import Table from '../components/Table';
import { fetchOptions } from '../helpers/dbHelper';
// import getTicks from '../helpers/getTicks';
import { getKiteClient } from '../helpers/kiteConnect';
import Price from '../components/Price'
import useZerodha from '../helpers/useZerodha';
import useNotifications from '../helpers/useNotificaiton';
import date from 'date-and-time';
import { useRouter } from 'next/router'
import { postData } from '../helpers/fetch';


type Quote = {
  last_price: number,
  depth:{
    sell:[{
      price:number
    }]
  }
}

async function kiteConnect(method, args = []) {
  let url = `http://localhost:3000/api/kiteConnect?method=${method}&args=${JSON.stringify(args || [])}`
  console.debug('kiteConnect', url);
  return await fetch(url).then(res => res.json());
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getQuote({instrument}) {
    
  
  console.log('getting quote..',instrument)
  try {
    const response = await kiteConnect('getQuote', [instrument]);
    return response[instrument]
  } catch (e) {
    console.error(e)
  }
}

function useQuote({
  optionExchange,
  interval,
  optionCode,
  
}) {
  const [quote, setQuote] = React.useState<Quote>(undefined);
  let instrument = optionExchange + ":" + optionCode;

  useEffect(() => {

    (async ()=>{
      
      let quote = await getQuote({instrument});
      setQuote(quote)
      
    })()
    
  }, [])

  React.useEffect(() => {
    let timer = setTimeout(async () => {
      let quote = await getQuote({instrument});
      setQuote(quote)
    }, interval)
    return () => {
      clearTimeout(timer)
    }

  }, [quote])

  return {
    quote
  }
}

type Tick = {
  signal: string
}

function useTicker({
  stockExchange,
  stockCode,
  interval
}) {

  const [tick, setTick] = React.useState<Tick>();


  async function getSingal() {
    console.log('getting tick...',stockCode);
    
    try {
      const response = await fetch(`http://localhost:3000/api/getDayHistory-v2?exchange=${stockExchange}&instruments=${stockCode}&interval=ONE_MINUTE`);
      const json = await response.json();
      setTick(json.history[json.history.length - 1])
    } catch (e) {
      console.error(e);
      return setTick(undefined)
    }
  }

  useEffect(() => {
    getSingal();
  }, [])

  useEffect(() => {
    let timer = setTimeout(async () => {
      getSingal()
    }, interval)

    return () => {
      clearTimeout(timer);
    }
  }, [tick])

  return {
    tick
  }
}

type PositionStatus='OPEN'|'COMPLETE'

type Position = {
  status:PositionStatus,
  order?: any,
  sellPrice:number
}

function usePosition({ tick, quote, mode }: { tick: Tick, quote: Quote, mode: string }) {
  const [position, setPosition] = React.useState<Position>();
  const {config,dispatch} = useContext(OptionsContext)
  const {optionCode,quantity,optionExchange} = config

  // const {getQuote} = useQuote();

  React.useEffect(()=>{
  
    dispatch({
      type:actions.SET_POSITION,
      payload:position
    })
  },[position])

  React.useEffect(() => {
    if (!tick) {
      return;
    }
    console.log('Signal Changed', tick?.signal);
    if (tick?.signal == 'GREEN') {
      if (position) {
        console.log('Position already created');
      } else {
        if (mode == 'RUNNING') {
          console.log('Creating new position');
          createPosition()
        }else{
          console.log('Aborted due to mode',mode);
        }
      }
    } else {
      if (position && position.status == 'COMPLETE') {
        if (mode == 'RUNNING') {
          console.log('Clearing position');
          clearPosition()
        }else{
          console.log('Aborted due to mode',mode);
        }
      } else {
        console.log('No existing position');
      }
    }

  }, [tick?.signal])

  async function getOrder(orderId) {
    let orders = await kiteConnect('getOrders');
    if (!orders) {
      return {
        status: "OPEN"
      }

    }
    let order = orders.find(order => order.order_id == orderId)
    if (!order) {
      throw new Error('Invalid orderId: ' + orderId);
    }
    return order;
  }

  async function createPosition() {

    let { order_id: orderId } = await kiteConnect('placeOrder', ['regular', {
      transaction_type: "SELL",
      tradingsymbol: optionCode,
      product: "NRML",
      order_type: "LIMIT",
      price: quote.last_price,
      quantity: quantity,
      exchange: optionExchange
    }]);

    if (orderId) {
      let order = await getOrder(orderId);

      switch(order.status){
      case 'COMPLETE':{
        setPosition({
          status:"COMPLETE",
          sellPrice:order.average_price,
          order
        })
        break;
      }
      case 'OPEN':{
        setPosition({
          sellPrice:quote.last_price,
          status:"OPEN",
          order
        })
        break;
      }
      }
      
    }
  }

  React.useEffect(() => {

    async function refreshOrder() {
      let order = position.order;

      while (order.status == 'OPEN') {
        console.log('order open', order);
        await timeout(2000);
        order = await getOrder(order.order_id);
      }
      console.log('Order closed', order);

      switch (order.status) {
      case 'REJECTED': {
        setPosition(undefined)
        break;
      }
      case 'COMPLETE': {
        setPosition({
          status:"COMPLETE",
          sellPrice:order.average_price,
          order
        })
        break;
      }
      default: {
        throw new Error('order not open nor complete');
      }
      }
    }

    if (position?.order?.status == 'OPEN') {
      refreshOrder();
    }

  }, [position?.order?.status])



  async function clearPosition() {
    console.log('Selling Option');

    let sellPrice = position.sellPrice;
    let buyPrice = quote.depth.sell[0].price;

    if(((sellPrice-buyPrice)/buyPrice*100)<config.minProfitPct){
      console.log('Aborted',{
        sellPrice,
        buyPrice,
        minProfitPct:config.minProfitPct,
        currentPct:((sellPrice-buyPrice)/buyPrice*100)
      });
      return;
    }

    let orderId = await kiteConnect('placeOrder', ['regular', {
      transaction_type: "BUY",
      tradingsymbol: optionCode,
      product: "NRML",
      order_type: "LIMIT",
      price: quote.last_price,
      quantity,
      exchange: optionExchange
    }]);

    console.log('Orderid', orderId);

    let order = await getOrder(orderId)

    while (order.status == 'OPEN') {
      console.log('order open', order);
      await timeout(2000);
      order = await getOrder(orderId);
    }

    console.log('Order closed', order);

    if (order.status != 'COMPLETE') {
      throw new Error('order not open nor complete');
    }

    if (order.status == 'COMPLETE') {
      setPosition(undefined);
    }
  }

  return {
    position
  }
}


type InitialState = Pick<OptionsContenxtType,"config"|"mode">;

const initialState: InitialState= {
  config:{
    stockCode: 'VEDL22MAY300PE',
    stockExchange: 'NFO',
    optionCode: 'VEDL22MAY300PE',
    optionExchange: 'NFO',
    minProfitPct: 20,
    quantity: 50,
    interval: 10000
  },
  mode:"STOPPED"
}

const actions = {
  SET_CONFIG: "SET_CONFIG",
  SET_MODE: "SET_MODE",
  SET_TICK:"SET_TICK",
  "SET_POSITION":"SET_POSITION"
}

const reducer = (state, action) => {

  switch (action.type) {
  case actions.SET_CONFIG: {
    return {
      ...state
    }
  }
  case actions.SET_MODE: {
    return {
      ...state,
      mode: action.payload
    }
  }
  case actions.SET_TICK: {
    return {
      ...state,
      tick: action.payload
    }
  }
  case actions.SET_POSITION: {
    return {
      ...state,
      position: action.payload
    }
  }
  default: {
    return state;
  }
  }
}

type Config = {
  optionExchange:string,
  interval:number,
  quantity:number,
  stockExchange:string,
  stockCode:string,
  minProfitPct:number,
  optionCode:string
}

type OptionsContenxtType = {
  config?:Config,
  mode?:string,
  position?:any,
  dispatch?:({})=>{}
}


const OptionsContext = React.createContext<OptionsContenxtType>({})


const Provider = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  let value = {
    ...state,
    dispatch
  }
  return (
    <OptionsContext.Provider value={value}>
      {children}
    </OptionsContext.Provider>
  )
}

const Trigger = React.memo(()=> {
  const {  dispatch } = React.useContext(OptionsContext);
  
  
  function start() {
    dispatch({
      type: actions.SET_MODE,
      payload: 'RUNNING'
    })
  }

  function stop() {
    dispatch({
      type: actions.SET_MODE,
      payload: 'STOPPED'
    })
  }


  return (<>

    <button className='button' onClick={start}>Start</button>
    <button className='button' onClick={stop}>Stop</button> </>
  )
})

function PositionLoader({
  onSelection
}){

  const [isModalOpen,setModalOpen] = React.useState(false);
  const [positions,setPositions] = React.useState([]);
  React.useEffect(()=>{
    fetch('http://localhost:3000/api/kiteConnect?method=getPositions')
      .then(res=>res.json())
      .then(res=>{
        setPositions(res.net)
      }).catch(()=>{
        setPositions([])
      })
  },[]);

  function handleSelect(selectedPosition){
    onSelection(selectedPosition);
    setModalOpen(false);
  }


  return <>
    <div className={"modal "+(isModalOpen?'is-active':'')}>
      <div className="modal-background"></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Select Position</p>
          <button className="delete" onClick={()=>setModalOpen(false)} aria-label="close"></button>
        </header>
        <section className="modal-card-body">
     
          <div className="table-container">
            <table className="table is-fullwidth">
              <thead>
                <tr>
                  <th><abbr title="Position">Tradingsymbol</abbr></th>
                  <th><abbr title="Position">Quantity</abbr></th>
                  <th><abbr title="Position">Select</abbr></th>
                </tr>
              </thead>
              <tbody>
                {positions
                  .filter(item=>item.exchange=='NFO' && item.quantity < 0)
                  .map(position=> <tr key={position.tradingsymbol}>
                    <td>{position.tradingsymbol}</td>
                    <td>{position.quantity}</td>
                    <td><button onClick={()=>handleSelect(position)}>
                    Select
                    </button></td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </section>
        <footer className="modal-card-foot">
          <button className="button is-success" onClick={()=>setModalOpen(false)}>Save changes</button>
          <button className="button" onClick={()=>setModalOpen(false)}>Cancel</button>
        </footer>
      </div>
    </div>

    <button onClick={()=>setModalOpen(true)}>Load</button>
  </>
}

function ConfigModule({
  onChange,
  config:initialConfig
}){
  const [config,setConfig] = React.useState<Config>(initialConfig);

  function handleInputChange(event){
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name 


    let newConfig = {
      ...config,
      [name]: value
    }

    // @ts-ignore
    setConfig(newConfig);
    onChange(newConfig)
  }
  return <>
    <div className="sidebar">
      <div className="input-item">
        <div className="columns">
          <div className="column is-one-quarter">
            <div className="name is-size-7">
          Target Stock
            </div></div>
          <div className="column">
          
            <input className="input is-small" type="text" name={'stockCode'} value={config.stockCode} onChange={handleInputChange}/>
            
          
          </div>
          <div className="column">
            <input className="input is-small" type="text" name={'stockExchange'} value={config.stockExchange} onChange={handleInputChange}/>
          </div>
        </div>
        
        
      </div>

      <div className="input-item">
        <div className="columns">
          <div className="column is-one-quarter">
            <div className="name is-size-7" >
          Option Stock
            </div>
          </div>
          <div className="column"><input className="input is-small" type="text" name={'optionCode'} value={config.optionCode} onChange={handleInputChange}/></div>
          <div className="column"><input className="input is-small" type="text" name={'optionExchange'} value={config.optionExchange} onChange={handleInputChange}/></div>
        </div>
        
        <div className="input-box">
          
          
        </div>
      </div>

      <div className="input-item">
        <div className="columns">
          <div className="column is-one-quarter"><div className="name is-size-7">
          Quantity
          </div></div>
          <div className="column">  <input className="input is-small" type="text" name={'quantity'} value={config.quantity} onChange={handleInputChange}/></div>
        </div>
        
        
      </div>

      <div className="input-item">
        <div className="columns">
          <div className="column is-one-quarter">
            <div className="name is-size-7">
          Min Profit
            </div></div>
          <div className="column"><input className="input is-small" type="text" name={'minProfitPct'} value={config.minProfitPct} onChange={handleInputChange}/></div>
        </div>
        
        <div className="input-box">
          
        </div>
      </div>


    </div>
  </>
}



function Navbar(){
  return (
    <nav className="navbar mb-5" role="navigation" aria-label="main navigation">
      <div className="navbar-brand">
        <a className="navbar-item" href="https://bulma.io">
          <img src="https://bulma.io/images/bulma-logo.png" alt="Bulma: Free, open source, and modern CSS framework based on Flexbox" width="112" height="28"/>
        </a>

        <a role="button" className="navbar-burger" aria-label="menu" aria-expanded="false">
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>
    </nav>
  )
}

function App(){
  const { 
    config,
    mode,
    dispatch,
    position
  } = React.useContext(OptionsContext);

  let {
    optionExchange,
    interval, 
    stockExchange,
    stockCode,
    optionCode,
  } = config

  let { quote } = useQuote({

    optionExchange,
    interval,
    optionCode
  });

  let { tick } = useTicker({
    stockExchange,
    stockCode,
    interval
  })

  useEffect(()=>{
    dispatch({
      type:"SET_TICK",
      payload:tick
    })
  },[tick])

  const {  } = usePosition({ tick, quote, mode })

  function handleSelection(selectedPosition){
    console.log(selectedPosition);
    
  }

  function handleConfigChange(config){
    console.log(config);
    dispatch({
      type:actions.SET_CONFIG,
      payload:config
    })

  }
  
  return (
    <div className=''>
      <Navbar></Navbar>
      <div className='container'>
        <div className="columns">
          <div className="column is-4">
            <ConfigModule config={config} onChange={handleConfigChange}></ConfigModule>
          </div>
          <div className="column">
            <Trigger></Trigger>
            <PositionLoader onSelection={handleSelection}></PositionLoader>
            {mode}
            <br />
            {JSON.stringify(tick?.signal)}
            <br />
            {JSON.stringify(quote?.last_price)}
            <br />
            {JSON.stringify(position)}
          </div>
        </div>
      </div>
    
    </div>
  )
}


export default function PutOptions({ }) {

  return <>
    <Provider>
      <App/>
    </Provider>
  </>

}

export async function getServerSideProps() {


  return {
    props: {

    }
  }
}
