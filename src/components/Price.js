import React from 'react'

export default function Price({children,reverseColoring}) {
  let cond;
  if(reverseColoring){
    cond = children<0
  }else{
    cond = children>-0
  }
  return (
    <span className={(cond)?"has-text-success":"has-text-danger"}>
      {children.toFixed(2)}
    </span>
  )
}
