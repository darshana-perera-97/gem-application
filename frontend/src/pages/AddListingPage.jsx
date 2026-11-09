import React, { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAddListing } from '../contexts/AddListingContext';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

/** Deep-link helper: opens the shared List Gem popup, then leaves this route. */
export const AddListingPage = () => {
  const { id: listingId } = useParams();
  const navigate = useNavigate();
  const { openAddListing } = useAddListing();
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    const opened = openAddListing(listingId || null);
    if (opened) {
      navigate('/marketplace', { replace: true });
    }
  }, [listingId, navigate, openAddListing]);

  return (
    <Seo
      title={PAGE_SEO.addListing.title}
      description={PAGE_SEO.addListing.description}
      noindex
    />
  );
};
