
import React, { ReactNode } from 'react'

type PriceProps={
  children:number,
  small?:boolean,
  threshold?:number,
  reverseColoring?:boolean
}

export default function Price({small=false,threshold=0,children,reverseColoring}:PriceProps) {

  let cond;

  if(reverseColoring){
    cond = Number(children)<threshold
  }else{
    cond = Number(children)>threshold
  }
  return (
    <span className={(small?"is-size-7":"")+" "+(cond?"has-text-success":"has-text-danger")}>
      {children && Number(children).toFixed(2)}
    </span>
  )
}
