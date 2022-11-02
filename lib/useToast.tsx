import { useContext } from "react"
import { AppContext } from "./AppContext"

export function useToast() {

    const { setToastText } = useContext(AppContext)
    let timeout:NodeJS.Timeout;

    function showToast(text:string) {
        setToastText?.(text)
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            setToastText?.("")
        }, 5000)
    }

    return {
        showToast
    }

}