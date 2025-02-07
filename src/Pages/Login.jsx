
export default function LoginPage() {
  
  return (
    <div className="h-screen flex justify-center items-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900">
      <div className="p-8 bg-white shadow-xl rounded-lg border border-gray-300 text-center max-w-sm w-full animate-fadeIn relative">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 animate-slideDown tracking-wide">Welcome to Sensibull</h1>
        <p className="text-gray-600 mb-6 animate-fadeIn">Your gateway to smarter trading 🚀</p>
        <a href={`https://api.upstox.com/v2/login/authorization/dialog?client_id=a7561f9a-6929-4820-a8d6-fa024cf2dc17&redirect_uri=${location?.origin}&response=code`} className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-full text-lg font-semibold hover:opacity-90 transition-all shadow-md animate-pulse">
          Login
        </a>
        <div className="absolute -top-6 -right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md animate-spinSlow">
          📈
        </div>
      </div>

      <style jsx={"true"}>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes fadeInSlow {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-fadeIn { animation: fadeIn 0.8s ease-in-out; }
        .animate-slideDown { animation: slideDown 0.6s ease-in-out; }
        .animate-fadeInSlow { animation: fadeInSlow 1.2s ease-in-out; }
        .animate-pulse { animation: pulse 1.5s infinite; }
        .animate-spinSlow { animation: spinSlow 4s linear infinite; }
      `}</style>
    </div>
  );
}
