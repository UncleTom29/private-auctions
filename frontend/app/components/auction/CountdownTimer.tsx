'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  endsAt: string;
  compact?: boolean;
  onExpire?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeRemaining(endDate: Date): TimeRemaining {
  const total = endDate.getTime() - Date.now();
  
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total };
}

export function CountdownTimer({ endsAt, compact = false, onExpire }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(new Date(endsAt))
  );

  useEffect(() => {
    const endDate = new Date(endsAt);
    
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(endDate);
      setTimeRemaining(remaining);

      if (remaining.total <= 0 && onExpire) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  if (timeRemaining.total <= 0) {
    return (
      <div className="text-status-error font-semibold">
        Auction Ended
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 font-mono text-sm font-semibold">
        {timeRemaining.days > 0 && <span>{timeRemaining.days}d</span>}
        <span>{String(timeRemaining.hours).padStart(2, '0')}:</span>
        <span>{String(timeRemaining.minutes).padStart(2, '0')}:</span>
        <span>{String(timeRemaining.seconds).padStart(2, '0')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {timeRemaining.days > 0 && (
        <>
          <div className="countdown-digit">
            <div className="text-sm text-text-muted mb-1">Days</div>
            <div>{timeRemaining.days}</div>
          </div>
          <div className="countdown-separator">:</div>
        </>
      )}

      <div className="countdown-digit">
        <div className="text-sm text-text-muted mb-1">Hours</div>
        <div>{String(timeRemaining.hours).padStart(2, '0')}</div>
      </div>

      <div className="countdown-separator">:</div>

      <div className="countdown-digit">
        <div className="text-sm text-text-muted mb-1">Minutes</div>
        <div>{String(timeRemaining.minutes).padStart(2, '0')}</div>
      </div>

      <div className="countdown-separator">:</div>

      <div className="countdown-digit">
        <div className="text-sm text-text-muted mb-1">Seconds</div>
        <div>{String(timeRemaining.seconds).padStart(2, '0')}</div>
      </div>
    </div>
  );
}
