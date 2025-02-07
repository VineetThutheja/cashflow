import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import {
  getDiffFromStrike,
  mergeData,
  extractUniqueExpiry,
  filterUniqueUnderlying,
} from "../utils";
import Nifty50 from "../data/nifty_50.json";
import AllFNO from "../data/allfno.json";
import axios from "axios";
import Bottleneck from "bottleneck";

const INSTRUMENT_OPTIONS = [
  { label: "Nifty 50", value: "nifty_50" },
  { label: "All FNO", value: "all_fno" },
];
const baseUrl = "https://api.upstox.com/v2";

const limiter = new Bottleneck({ minTime: 25, maxConcurrent: 3 });

export default function OptionChain() {
  const [activeTab, setActiveTab] = useState("CE");
  const [openAccordions, setOpenAccordions] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingChain, setLoadingChain] = useState(true);
  const [instruments, setInstruments] = useState("all_fno");
  const [expiryDates, setExpiryDates] = useState([]);
  const [expiry, setExpiry] = useState();
  const [lotSize, setLotSize] = useState(15);
  const [callOptions, setCallOptions] = useState([]);
  const [putOptions, setPutOptions] = useState([]);
  const [optionContract, setOptionContract] = useState({});
  const [optionChainMargin, setOptionChainMargin] = useState([]);
  const [filteredOptionsMargin, setFilteredOptionsMargin] = useState([]);
  const [error, setError] = useState('');
  const [lastClickedTime, setLastClickedTime] = useState(
    localStorage.getItem("lastClickedTime") ? parseInt(localStorage.getItem("lastClickedTime"), 10) : null
  );
  const token = localStorage?.getItem("access_token");
  const headers = { Accept: "application/json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastClickedTime && Date.now() - lastClickedTime >= 300000) {
        setLastClickedTime(null);
        localStorage.removeItem("lastClickedTime");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastClickedTime]);

  useEffect(() => {
    async function fetchExpiryDates() {
      try {
        const response = await axios.get(`${baseUrl}/option/contract?instrument_key=NSE_EQ|INE002A01018`, { headers });
        const dates = extractUniqueExpiry(response?.data).reverse();
        setExpiryDates(dates);
        setExpiry(dates[0]?.value);
        setLoading(false);
      } catch (error) {
        if (error?.status === 401) {
          localStorage.removeItem("access_token");
          location.href = location.origin;
        }
      }
    }
    fetchExpiryDates();
  }, []);

  useEffect(() => {
    async function fetchOptionChain() {
      if (!expiry) return;
      setLoadingChain(true);
      setError('');
      try {
        const optionChainPromise = (instruments === "nifty_50" ? Nifty50 : AllFNO).map((n50) =>
          limiter.schedule(() =>
            axios.get(`${baseUrl}/option/chain?instrument_key=${n50.instrument_key}&expiry_date=${expiry}`, { headers })
          )
        );
        const responses = await Promise.all(optionChainPromise);
        const { callOptions, putOptions } = mergeData(
          responses.flatMap((c) => c?.data?.data),
          AllFNO,
          lotSize
        );
        setCallOptions(filterUniqueUnderlying(callOptions));
        setPutOptions(filterUniqueUnderlying(putOptions));
      } catch (error) {
        console.error("Error:", error);
        setError("Something went wrong");
      }
      setLoadingChain(false);
    }
    fetchOptionChain();
  }, [expiry, instruments, lotSize]);

  useEffect(() => {
    if (callOptions.length && putOptions.length && optionContract) {
      setFilteredOptionsMargin([...callOptions, ...putOptions].filter((ocm) => ocm?.instrument_type === activeTab));
    }
  }, [callOptions, putOptions, optionContract, activeTab]);

  return (
    <div className="max-w-lg mx-auto p-4 bg-white text-gray-900 shadow-md rounded-md mt-6 border border-gray-200">
      {loading ? (
        <div className="flex justify-center items-center py-6">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="sticky top-0 bg-white z-10 shadow-md p-2 rounded-md mb-4 flex">
            <button onClick={() => setActiveTab("CE")} className={`w-1/2 text-center py-2 rounded-md ${activeTab === "CE" ? "bg-blue-500 text-white" : "text-blue-500"}`}>Call</button>
            <button onClick={() => setActiveTab("PE")} className={`w-1/2 text-center py-2 rounded-md ${activeTab === "PE" ? "bg-red-500 text-white" : "text-red-500"}`}>Put</button>
          </div>

          {loadingChain ? (
            <div className="flex justify-center items-center py-6">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="border-b border-gray-200 py-2"><h3>{error}</h3></div>
          ) : (
            <div>
              {filteredOptionsMargin.map((option, index) => (
                <div key={index} className="border-b border-gray-200 py-2">
                  <button className="w-full flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all" onClick={() => setOpenAccordions((prev) => ({ ...prev, [index]: !prev[index] }))}>
                    <span className="font-medium text-gray-900">{`${option?.underlying_info?.name} ${option?.strike_price} ${activeTab}  ${option?.expiry}`}</span>
                    <ChevronDown size={20} className="text-blue-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
