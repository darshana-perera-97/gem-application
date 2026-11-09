/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { FeedPage } from './pages/FeedPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { VendorsPage } from './pages/VendorsPage';
import { CommunityPage } from './pages/CommunityPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { SeedPage } from './pages/SeedPage';
import { VendorProfilePage } from './pages/VendorProfilePage';
import { ProductPage } from './pages/ProductPage';
import { VendorDashboard } from './pages/VendorDashboard';
import { AuthProvider } from './contexts/AuthContext';
import { ActivityProvider } from './contexts/ActivityContext';
import { AddListingProvider } from './contexts/AddListingContext';
import { AuthCallbackPage, LoginPage } from './pages/LoginPage';
import { AddListingPage } from './pages/AddListingPage';
import { ProfilePage } from './pages/ProfilePage';
import { MyGemsPage } from './pages/MyGemsPage';
import { ChatPage } from './pages/ChatPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { NewsPage } from './pages/NewsPage';
import { EventsPage } from './pages/EventsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ActivityProvider>
          <AddListingProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<FeedPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/my-gems" element={<MyGemsPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/vendor/dashboard" element={<VendorDashboard />} />
                <Route path="/seed" element={<SeedPage />} />
                <Route path="/vendors/:id" element={<VendorProfilePage />} />
                <Route path="/listings/:id/edit" element={<AddListingPage />} />
                <Route path="/listings/:id" element={<ProductPage />} />
                <Route path="/add-listing" element={<AddListingPage />} />
                <Route path="/messages" element={<ChatPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
              </Routes>
            </Layout>
          </AddListingProvider>
        </ActivityProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
