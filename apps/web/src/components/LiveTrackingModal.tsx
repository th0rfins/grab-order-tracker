import { useEffect, useState } from "react";
import { X, Clock, MapPin, User, Navigation } from "lucide-react";
import LiveMap from "./LiveMap";

export default function LiveTrackingModal({ orderId, onClose }: { orderId: number, onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const api = import.meta.env.VITE_API_URL ?? "";

  useEffect(() => {
    let interval: any;
    
    const fetchLive = async () => {
      try {
        const r = await fetch(`${api}/api/orders/${orderId}/live`);
        if (!r.ok) throw new Error("Failed to fetch live data");
        const json = await r.json();
        if (json.error) throw new Error(json.error);
        setData(json);
        if (!json.isLive || json.status === "EXPIRED" || json.sessionStatus !== "ACTIVE") {
          clearInterval(interval);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchLive();
    interval = setInterval(fetchLive, 5000);
    return () => clearInterval(interval);
  }, [orderId, api]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        
        {/* Left Side: Map */}
        <div className="w-full md:w-2/3 h-64 md:h-auto min-h-[300px] relative bg-slate-100">
          {data?.isLive ? (
            <LiveMap data={data} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-medium">
              {error ? (
                <span className="text-red-500">{error}</span>
              ) : data ? (
                <span>Order is no longer active.</span>
              ) : (
                <span>Loading map...</span>
              )}
            </div>
          )}
          <button 
            onClick={onClose}
            className="md:hidden absolute top-4 right-4 bg-white p-2 rounded-full shadow-md text-slate-700 z-10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Right Side: Details */}
        <div className="w-full md:w-1/3 flex flex-col border-l border-slate-100 relative">
          <button 
            onClick={onClose}
            className="hidden md:flex absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={24} />
          </button>

          <div className="p-6 md:p-8 flex flex-col flex-1 overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Navigation className="text-orange-600" /> Live Tracking
            </h2>

            {error ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            ) : !data ? (
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-slate-100 rounded-xl"></div>
                <div className="h-20 bg-slate-100 rounded-xl"></div>
                <div className="h-20 bg-slate-100 rounded-xl"></div>
              </div>
            ) : !data.isLive ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                  <Clock size={32} />
                </div>
                <p className="text-slate-800 font-medium">No live data available.</p>
                <p className="text-slate-500 text-sm">This order might be completed or expired.</p>
                <p className="text-sm font-semibold text-orange-600 mt-2 px-3 py-1 bg-orange-50 rounded-full border border-orange-100">
                  Status: {data.status}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Card */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Current Status</p>
                  <p className="text-slate-900 font-medium">{data.messageStatus?.title || data.sessionStatus || "Unknown"}</p>
                  <p className="text-slate-600 text-sm mt-1">{data.messageStatus?.processMsg?.message || ""}</p>
                  
                  {data.route?.ETAs?.[0] && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-800 bg-white p-2 rounded-lg shadow-sm">
                      <Clock size={16} className="text-blue-600" />
                      ETA: {data.route.ETAs[0].duration} min ({data.route.ETAs[0].distance} km)
                    </div>
                  )}
                </div>

                {/* Driver Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <User size={14} /> Driver Details
                  </p>
                  <div className="flex items-center gap-4">
                    {data.driver?.pictureURL ? (
                      <img src={data.driver.pictureURL} alt="Driver" className="w-12 h-12 rounded-full border border-slate-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <User size={24} />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-900">{data.driver?.name || "Unknown Driver"}</p>
                      <p className="text-sm text-slate-600">{data.driver?.vehiclePlateNumber || "-"} • {data.driver?.vehicleModel || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Route Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <MapPin size={14} /> Route
                  </p>
                  <div className="relative pl-5 border-l-2 border-slate-100 ml-2 space-y-4">
                    <div className="relative">
                      <div className="absolute -left-[27px] top-1 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white"></div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Pickup</p>
                      <p className="text-sm font-medium text-slate-800 line-clamp-2">{data.booking?.pickup?.keywords || "Unknown"}</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[27px] top-1 w-3 h-3 bg-orange-500 rounded-full ring-4 ring-white"></div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Dropoff</p>
                      <p className="text-sm font-medium text-slate-800 line-clamp-2">{data.booking?.dropOff?.keywords || "Unknown"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
