import React from 'react';

interface Props {
  loading: boolean;
  status: { success?: boolean; message?: string; lastPushTime?: string } | null;
  onPush: () => void;
}

export default function Top3PushButton({ loading, status, onPush }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPush}
        disabled={loading}
        className={`px-4 py-2 rounded font-medium transition-all duration-200 ${
          loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70'
            : 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none'
        }`}
      >
        {loading ? '推送中...' : 'TOP3推送'}
      </button>
      
      {status && (
        <div 
          className={`text-sm px-3 py-1 rounded ${
            status.success === false
              ? 'bg-red-100 text-red-600 border border-red-200'
              : status.success === true
              ? 'bg-green-100 text-green-600 border border-green-200'
              : 'bg-blue-100 text-blue-600 border border-blue-200'
          }`}
        >
          {status.message}
        </div>
      )}
      
      {status?.lastPushTime && (
        <div className="text-xs text-gray-500">
          最后推送：{new Date(status.lastPushTime).toLocaleString()}
        </div>
      )}
    </div>
  );
}
