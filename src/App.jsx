import { useEffect, useState } from "react";
import Login from "./Pages/Login";
import OptionChain from "./Pages/OptionChain";
import axios from "axios";

export default function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const [isloggedIn, setIsLoggedIn] = useState(false)
  
  useEffect(() => {
    if(searchParams?.get("code")){
    const url = "https://api.upstox.com/v2/login/authorization/token";
    const headers = {
      accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    };
    
    const data = {
      code: searchParams?.get("code"),
      client_id: `${import.meta.env.VITE_CLIENT_ID}`,
      client_secret: `${import.meta.env.VITE_CLIENT_SECRET}`,
      redirect_uri: `${import.meta.env.VITE_REDIRECT}/`,
      grant_type: "authorization_code",
    };

    axios
      .post(url, new URLSearchParams(data), { headers })
      .then((response) => {
       localStorage.setItem("access_token", response?.data?.access_token);
       setIsLoggedIn(true)
       location.href = location.origin
       
      })
      .catch((error) => {
        
      });
    }
  }, [searchParams]);
  useEffect(()=>{
    if(localStorage?.getItem('access_token')){
      setIsLoggedIn(true)
    }
  },[])
  return isloggedIn ? <OptionChain /> : <Login />;
}
