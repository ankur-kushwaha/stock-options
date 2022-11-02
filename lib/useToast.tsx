import { useContext } from "react"
import { AppContext } from "./AppContext"

export function useToast() {

    const { setToastText } = useContext(AppContext)
    let timeout;

    function showToast(text) {
        setToastText(text)
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            setToastText("")
        }, 5000)
    }

    return {
        showToast
    }

}