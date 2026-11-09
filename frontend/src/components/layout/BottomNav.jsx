import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, PlusCircle, MessageSquare, LayoutDashboard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAddListing } from '../../contexts/AddListingContext';

export const BottomNav = () => {
  const { openAddListing } = useAddListing();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-50 px-4 flex items-center justify-between pb-safe">
      <NavItem to="/" icon={Home} label="Feed" />
      <NavItem to="/marketplace" icon={ShoppingBag} label="Shop" />

      <div className="relative -top-4 flex flex-col items-center">
        <button
          type="button"
          onClick={() => openAddListing()}
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 transition-transform active:scale-95"
          aria-label="List gem"
        >
          <PlusCircle size={28} />
        </button>
        <span className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">List</span>
      </div>

      <NavItem to="/messages" icon={MessageSquare} label="Chats" />
      <NavItem to="/vendor/dashboard" icon={LayoutDashboard} label="Info" />
    </div>
  );
};

const NavItem = ({ to, icon: Icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        'flex flex-col items-center justify-center gap-1 transition-all',
        isActive ? 'text-primary' : 'text-gray-400'
      )}
    >
      {({ isActive }) => (
        <>
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          <span className={cn(
            'text-[10px] font-bold uppercase tracking-tighter',
            isActive ? 'text-primary' : 'text-gray-500'
          )}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
};
