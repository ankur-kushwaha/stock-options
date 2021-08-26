import React from 'react'

export default function Cell({value}) {
    let [cellValue,setCellValue] = React.useState(value);
    let [dir,setDir] = React.useState();
    React.useEffect(()=>{
        if(Number(value)<Number(cellValue)){
            setDir("DOWN")
        }else{
            setDir("UP")
        }
        setCellValue(value);
    },[value])
    return (
        <div >
            {value}
        </div>
    )
}
