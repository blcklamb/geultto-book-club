'use client';

import { useEffect } from 'react';

type ViewCountPingerProps = {
  reviewId: string;
};

export const ViewCountPinger: React.FC<ViewCountPingerProps> = ({ reviewId }) => {
  useEffect(() => {
    fetch(`/api/reviews/${reviewId}/view`, { method: 'POST' });
  }, [reviewId]);

  return null;
};
