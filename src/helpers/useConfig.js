import React from 'react'

function useConfig(defaultConfig){

  const [config,setConfig ] = React.useState(defaultConfig);


  return {
    config,
    setConfig
  }
    
}

export default useConfig;