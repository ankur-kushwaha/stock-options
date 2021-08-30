import React from 'react'

export default function Price({small=false,threshold=0,children,reverseColoring}) {
  let cond;

  if(reverseColoring){
    cond = Number(children)<threshold
  }else{
    cond = Number(children)>threshold
  }
  return (
    <span className={(small?"is-size-7":"")+" "+(cond?"has-text-success":"has-text-danger")}>
      {children.toFixed(2)}
    </span>
  )
}
