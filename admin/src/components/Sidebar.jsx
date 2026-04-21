import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Gamepad2, Activity, DollarSign, Settings, LogOut, Shield } from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Utilisateurs', path: '/users', icon: Users },
    { name: 'Jeux & Contenu', path: '/content', icon: Gamepad2 },
    { name: 'Monitoring Live', path: '/live', icon: Activity },
    { name: 'Économie', path: '/economy', icon: DollarSign },
    { name: 'Configuration Système', path: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/login');
  };

  return (
    <div className="w-72 bg-slate-900 border-r border-white/5 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/50 flex flex-shrink-0 items-center justify-center">
          <Shield className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Dueloo</h1>
          <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest">Administration</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 relative">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-full gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-bold"
        >
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
