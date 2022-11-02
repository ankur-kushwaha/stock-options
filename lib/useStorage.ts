export function useStorage(){
    return {
        setItem(key:string,value:string){
            localStorage.setItem(key,JSON.stringify(value))
        },
        getItem(key:string,defaultValue={}){
            const value = localStorage.getItem(key);
            if(value){
                //@ts-ignore
                return JSON.parse(localStorage.getItem(key))
            }else{
                return defaultValue
            }
        }
    }
}