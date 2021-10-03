import React,{ createContext, useContext } from 'react';

const AppContext = createContext();

export function UserProvider({ children }) {
  let sharedState = {/* whatever you want */}

  return (
    <AppContext.Provider value={sharedState}>
      {children}
    </AppContext.Provider>
  );
}

export function useUserContext() {
  return useContext(AppContext);
}