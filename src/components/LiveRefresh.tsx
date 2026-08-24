import { useEffect, useState } from "preact/hooks";

interface Props {
  intervalMs?: number;
}

export default function LiveRefresh({ intervalMs = 90000 }: Props) {
  const [countdown, setCountdown] = useState(intervalMs / 1000);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.location.reload();
          return intervalMs / 1000;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [intervalMs]);

  return (
    <p class="live-refresh-note">
      Live readings refresh automatically in {countdown}s.
    </p>
  );
}
