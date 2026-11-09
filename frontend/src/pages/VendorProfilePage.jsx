import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { SellerProfileView } from '../components/profile/SellerProfileView';
import { usePageReady } from '../contexts/PageLoadingContext';

export const VendorProfilePage = () => {
  const { id } = useParams();
  const [ready, setReady] = useState(false);
  usePageReady(ready);

  return (
    <SellerProfileView
      profileId={id}
      indexable
      onLoaded={() => setReady(true)}
    />
  );
};
