import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Wifi, WifiOff, Activity, Clock, Package } from 'lucide-react';
import { useMarketData } from '../contexts/MarketDataContext';
import { motion, AnimatePresence } from 'framer-motion';

interface WebSocketIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

/**
 * WebSocket Connection Status Indicator
 * Shows real-time connection status with heartbeat and queue info
 */
export const WebSocketIndicator: React.FC<WebSocketIndicatorProps> = ({
  compact = false,
  showDetails = false,
  className = ''
}) => {
  const {
    wsConnected,
    wsLastUpdate,
    wsQueuedMessages,
    wsLastHeartbeat
  } = useMarketData();

  const [expanded, setExpanded] = useState(false);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<number>(0);

  // Update time since last update
  useEffect(() => {
    if (!wsLastUpdate) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const lastUpdate = new Date(wsLastUpdate).getTime();
      setTimeSinceUpdate(Math.floor((now - lastUpdate) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [wsLastUpdate]);

  // Calculate heartbeat age
  const heartbeatAge = wsLastHeartbeat
    ? Math.floor((Date.now() - wsLastHeartbeat) / 1000)
    : null;

  // Determine connection health
  const getHealthStatus = () => {
    if (!wsConnected) return 'disconnected';
    if (heartbeatAge && heartbeatAge > 60) return 'stale';
    if (wsQueuedMessages > 0) return 'degraded';
    return 'healthy';
  };

  const healthStatus = getHealthStatus();

  const statusConfig = {
    healthy: {
      color: 'bg-green-500',
      textColor: 'text-green-400',
      borderColor: 'border-green-400/50',
      icon: <Wifi className="w-3 h-3" />,
      label: 'Live',
      pulse: true
    },
    degraded: {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-400/50',
      icon: <Activity className="w-3 h-3" />,
      label: 'Syncing',
      pulse: true
    },
    stale: {
      color: 'bg-orange-500',
      textColor: 'text-orange-400',
      borderColor: 'border-orange-400/50',
      icon: <Clock className="w-3 h-3" />,
      label: 'Stale',
      pulse: false
    },
    disconnected: {
      color: 'bg-red-500',
      textColor: 'text-red-400',
      borderColor: 'border-red-400/50',
      icon: <WifiOff className="w-3 h-3" />,
      label: 'Offline',
      pulse: false
    }
  };

  const config = statusConfig[healthStatus];

  // Compact view (just icon)
  if (compact) {
    return (
      <div
        className={`relative inline-flex ${className}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
        {wsQueuedMessages > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${config.color}`}></span>
          </span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2.5 ${className}`}
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
    >
      <Badge
        variant="outline"
        className={`flex items-center gap-2.5 ${config.borderColor} ${config.textColor} cursor-pointer`}
      >
        {config.icon}
        <span className="text-xs font-medium">{config.label}</span>

        {wsQueuedMessages > 0 && (
          <div className="flex items-center gap-1.5">
            <Package className="w-3 h-3" />
            <span className="text-xs">{wsQueuedMessages}</span>
          </div>
        )}
      </Badge>

      {/* Expanded details */}
      <AnimatePresence>
        {(expanded || showDetails) && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 p-3 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl z-50 min-w-[250px]"
          >
            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#5C5C5C]">Status:</span>
                <span className={`font-semibold ${config.textColor}`}>
                  {wsConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {wsLastUpdate && (
                <div className="flex justify-between">
                  <span className="text-[#5C5C5C]">Last Update:</span>
                  <span className="text-white">
                    {timeSinceUpdate < 60
                      ? `${timeSinceUpdate}s ago`
                      : `${Math.floor(timeSinceUpdate / 60)}m ago`}
                  </span>
                </div>
              )}

              {wsLastHeartbeat && (
                <div className="flex justify-between">
                  <span className="text-[#5C5C5C]">Heartbeat:</span>
                  <span className="text-white">
                    {heartbeatAge}s ago
                  </span>
                </div>
              )}

              {wsQueuedMessages > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#5C5C5C]">Queued:</span>
                  <span className="text-yellow-400 font-semibold">
                    {wsQueuedMessages} messages
                  </span>
                </div>
              )}

              {healthStatus === 'healthy' && (
                <div className="pt-2 border-t border-gray-700">
                  <span className="text-green-400 text-xs">
                    ✓ Real-time updates active
                  </span>
                </div>
              )}

              {healthStatus === 'disconnected' && (
                <div className="pt-2 border-t border-gray-700">
                  <span className="text-red-400 text-xs">
                    ⚠ Attempting to reconnect...
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WebSocketIndicator;