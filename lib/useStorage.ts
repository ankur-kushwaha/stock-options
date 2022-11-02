export function useStorage(){
    return {
        setItem(key,value){
            localStorage.setItem(key,JSON.stringify(value))
        },
        getItem(key,defaultValue={}){
            const value = localStorage.getItem(key);
            if(value){
                return JSON.parse(localStorage.getItem(key))
            }else{
                return defaultValue
            }
        }
    }
}