import React, { Reducer, useEffect } from 'react'
import Header from '../components/Header';
import Table, { Column } from '../components/Table';
import useZerodha from '../helpers/useZerodha';
import { getKiteClient, kiteConnect } from '../helpers/kiteConnect';
import currencyFormatter from 'currency-formatter';
import getTicks from '../helpers/getTicks';
import Price from '../components/Price';
import Head from 'next/head'
import PositionLoader,{PositionsTable} from './components/PositionsLoader';
import Navbar from './components/Navbar';
import useQuote from './components/useQuote';
import usePosition from './components/usePositions';
import {getStorage,setStorage} from '../helpers/storage';


export enum Actions  {
  SET_TARGET="SET_TARGET",
  START_TRADING="START_TRADING",
  STOP_TRADING= 'STOP_TRADING'
}

type DispatchArgs =  {
  type:Actions,
  payload:any
}

type PositionsContextType = {
  dispatch?:(args:DispatchArgs)=>void,
  isOrderEnabled:boolean
}

export const PositionsContext = React.createContext<PositionsContextType>({})


const initialState={
  targets:{
    "VEDL22MAY368.5PE":{
      targetPct:"1"
    }
  }
}

function reducer(state,action:DispatchArgs){
  switch(action.type){
  case "START_TRADING":{
    return {
      ...state,
      shouldRun:true
    }
  }
  case "STOP_TRADING":{
    return {
      ...state,
      shouldRun:false
    }
  }
  case Actions.SET_TARGET:{
    return {
      ...state
    }
  }
  
  }
  console.log(state);
  
  return state;
}

export const Provider = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  let value = {
    ...state,
    dispatch
  }
  return (
    <PositionsContext.Provider value={value}>
      {children}
    </PositionsContext.Provider>
  )
}



const storageKey = 'positions2Target'

type PositionTargets = {
  targetPct:number,
  stoplossPct:number,
  trailingStep:number
}

function App({}) {

  const [state, setState] = React.useState<Record<string,PositionTargets>>({});

  let {positions } = usePosition({
    interval:10000
  });

  useEffect(()=>{
    let targets = getStorage(storageKey);
    setState({
      ...targets
    });
  },[])

  async function clearPosition({position}){
    
    let orderParams = {
      transaction_type: "BUY",
      tradingsymbol: position.tradingsymbol,
      product: "NRML",
      order_type: "LIMIT",
      price: position.last_price,
      quantity:Math.abs(position.quantity),
      exchange: position.exchange
    }
    console.log('Buyting options...', orderParams ); 

  }

  useEffect(()=>{
    if(positions){
      for(let position of positions){
        let currentPct = (((position.average_price-position.last_price)/position.average_price)*100)
        let targetPct = state[position.tradingsymbol]?.targetPct;
        let stoplossPct = state[position.tradingsymbol]?.stoplossPct;
        let trailingStep = state[position.tradingsymbol]?.trailingStep;

        if(targetPct != undefined && currentPct>targetPct){
          console.log('Target hit');
          clearPosition({position});
        }else if(stoplossPct!=undefined && currentPct < stoplossPct){
          console.log('Stoploss hit',stoplossPct);
          clearPosition({position});
        }

        if(trailingStep>0){
          let stoplossDiff = currentPct - stoplossPct;
          let newStopLoss;
          if(stoplossDiff > trailingStep){
            newStopLoss = currentPct - trailingStep;
            let targets = {
              ...state,
              [position.tradingsymbol]:{
                ...state[position.tradingsymbol],
                stoplossPct:newStopLoss
              }
            }
            setState({
              ...targets
            })
            setStorage(storageKey,targets)
          }
        }
      }
    }
  },[positions])

  function handleChangeTarget(targets){
    if(Object.keys(targets).length>0){
      setState({
        ...targets
      })
      setStorage(storageKey,targets)
    }
  }  

  return <>
    <Navbar></Navbar>
    <div className="container">
      <PositionsTable positions={positions} targets={state} onTargetChange={handleChangeTarget}/>
    </div>
  </>
}

export default function Position2(){
  return <>
    <Provider>
      <App/>
    </Provider>
  </>
}