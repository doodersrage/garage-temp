import { useEffect } from "preact/hooks";
import { trackProductEvent, type ProductEvent } from "../lib/productAnalytics";

interface Props {
  events?: Array<{ name: ProductEvent; props?: Record<string, string | number | boolean> }>;
}

/** Fires product analytics events once on mount (dashboard milestones). */
export default function ProductAnalyticsTracker({ events = [] }: Props) {
  useEffect(() => {
    for (const event of events) {
      trackProductEvent(event.name, event.props);
    }
  }, [events]);

  return null;
}
