import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/auth';
import { useAuth } from '../../context/AuthProvider';

interface Dealership { id: string; name: string; created_at: string }
interface Profile { id: string; email: string | null; role: 'admin'|'user'; dealership_id: string | null }

export const AdminPanel: React.FC<{ onClose: () => void }>= ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dealerships'|'users'>('dealerships');
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newDealerName, setNewDealerName] = useState('');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const handler = () => setActiveTab('dealerships');
    window.addEventListener('open-admin', handler);
    return () => window.removeEventListener('open-admin', handler);
  }, []);

  const loadData = async () => {
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from('dealerships').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, email, role, dealership_id').order('created_at', { ascending: false }),
    ]);
    setDealerships(d || []);
    setProfiles(p || []);
  };

  useEffect(() => { loadData(); }, []);

  const onCreateDealer = async () => {
    if (!newDealerName.trim()) return;
    const { error } = await supabase.from('dealerships').insert({ name: newDealerName.trim() });
    if (error) alert(error.message);
    setNewDealerName('');
    await loadData();
  };

  const onAssign = async (profileId: string, changes: Partial<Profile>) => {
    const { error } = await supabase.from('profiles').update(changes).eq('id', profileId);
    if (error) alert(error.message);
    await loadData();
  };

  if (!isAdmin) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-[90vw] max-w-5xl bg-gray-900 border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Admin</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">Close</button>
        </div>
        <div className="flex gap-2 mb-6">
          <button className={`px-3 py-1.5 rounded ${activeTab==='dealerships'?'bg-blue-600 text-white':'bg-gray-800 text-gray-300'}`} onClick={()=>setActiveTab('dealerships')}>Dealerships</button>
          <button className={`px-3 py-1.5 rounded ${activeTab==='users'?'bg-blue-600 text-white':'bg-gray-800 text-gray-300'}`} onClick={()=>setActiveTab('users')}>Users</button>
        </div>

        {activeTab==='dealerships' && (
          <div>
            <div className="flex gap-2 mb-4">
              <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2" placeholder="New dealership name" value={newDealerName} onChange={e=>setNewDealerName(e.target.value)} />
              <button onClick={onCreateDealer} className="px-3 py-2 bg-green-600 rounded">Create</button>
            </div>
            <ul className="divide-y divide-gray-800 max-h-[50vh] overflow-auto">
              {dealerships.map(d => (
                <li key={d.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-gray-400">{d.id}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab==='users' && (
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {profiles.map(p => (
              <div key={p.id} className="p-3 bg-gray-800/60 border border-gray-700 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.email ?? p.id}</div>
                    <div className="text-xs text-gray-400">{p.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={p.role}
                      onChange={e=>onAssign(p.id, { role: e.target.value as Profile['role'] })}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                    <select
                      value={p.dealership_id ?? ''}
                      onChange={e=>onAssign(p.id, { dealership_id: e.target.value || null })}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                    >
                      <option value="">No dealership</option>
                      {dealerships.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
