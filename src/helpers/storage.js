export function setStorage(key,value){
  localStorage.setItem(key,JSON.stringify(value));
}
  
export function getStorage(key){
  
  let value = localStorage.getItem(key);
  if(value){
    return JSON.parse(value);
  }
}