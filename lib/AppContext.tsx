import { Toast } from "flowbite-react";
import React, { useEffect, useState } from "react";
import { useStorage } from "./useStorage";
import { HiFire } from 'react-icons/hi'
type AppContextProps = {
  selectedInstruments?: any,
  setSelectedInstruments?: (arg: any) => void,
  config?: any,
  setConfig?: (arg: any) => void,
  setToastText?:(str:string)=>void
}
export const AppContext = React.createContext<AppContextProps>({});

export function AppProvider({ children }) {
  const [selectedInstruments, setSelectedInstruments] = useState({});
  const [toastText, setToastText] = useState("");
  const [config, setConfig] = useState({
    minStrike: 10,
    liveMarket:true,
    minTimeValue: 10000
  });
  const { getItem, setItem } = useStorage();

  useEffect(() => {
    const localConfig = getItem('config');
    setConfig({
      ...config,
      ...localConfig
    });
  }, []);

  useEffect(() => {
    setItem('config', config);
  }, [config]);


  return <AppContext.Provider value={{
    selectedInstruments,
    setSelectedInstruments, 
    config, 
    setConfig,
    setToastText
  }}>
    <>
      {children} 
      <div className="fixed right-8 bottom-8">
        {toastText && 
      <Toast>
        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-500 dark:bg-blue-800 dark:text-blue-200">
          <HiFire className="h-5 w-5" />
        </div>
        <div className="ml-3 text-sm font-normal">
          {toastText}
        </div>
      </Toast>
        }
      </div>
    </>
  </AppContext.Provider>
}