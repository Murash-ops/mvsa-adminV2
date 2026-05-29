'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/components/AuthContext';
import {
  Users,
  Plus,
  Edit2,
  Loader2,
  X,
  ChevronRight,
  ShieldCheck,
  UserCircle,
  Mail,
  Calendar,
  Crown,
  Trophy,
  Activity,
  ArrowRight
} from 'lucide-react';

type Staff = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'coach';
  stream_scope: 'all' | 'stream_1' | 'stream_2';
  created_at: string;
};

const roleConfig = {
  super_admin: {
    label: 'Super Admin',
    icon: Crown,
    style: 'bg-gold/10 text-gold border border-gold/20',
    description: 'Complete global system access and revenue oversight',
  },
  admin: {
    label: 'Administrator',
    icon: ShieldCheck,
    style: 'bg-green-500/10 text-green-400 border border-green-500/20',
    description: 'General administrative operations or specific stream oversight',
  },
  coach: {
    label: 'Academy Coach',
    icon: Trophy,
    style: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    description: 'Assigned timetables, attendance tracking, and player assessments',
  },
};

const scopeConfig = {
  all: {
    label: 'All Streams (Full)',
    style: 'bg-white/5 text-white/70 border border-white/10',
    description: 'Has complete access to both Venues and Academy'
  },
  stream_1: {
    label: 'Stream 1 (Venues Only)',
    style: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    description: 'Restricted strictly to Turf & Meeting Room bookings'
  },
  stream_2: {
    label: 'Stream 2 (Academy Only)',
    style: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    description: 'Restricted strictly to Academy enrollments & programs'
  }
};

export default function StaffPage() {
  const supabase = createClient();
  const { staff: currentStaff } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [newRole, setNewRole] = useState<Staff['role']>('admin');
  const [newScope, setNewScope] = useState<Staff['stream_scope']>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', role: 'admin' as Staff['role'], scope: 'all' as Staff['stream_scope'] });
  const [inviteResult, setInviteResult] = useState<{ tempPassword?: string; email?: string } | null>(null);

  const fetchStaff = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setStaffList(data as Staff[]);
    setIsLoading(false);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email) {
      alert('Please fill out Name and Email.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteForm.name,
          email: inviteForm.email,
          password: inviteForm.password,
          role: inviteForm.role,
          scope: inviteForm.scope
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create staff.');
      }

      setInviteResult({
        email: inviteForm.email,
        tempPassword: data.tempPassword
      });
      setInviteForm({ name: '', email: '', password: '', role: 'admin', scope: 'all' });
      fetchStaff();
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const openEdit = (member: Staff) => {
    setEditTarget(member);
    setNewRole(member.role);
    setNewScope(member.stream_scope || 'all');
    setIsEditOpen(true);
  };

  const handleRoleUpdate = async () => {
    if (!editTarget) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from('staff')
      .update({ 
        role: newRole,
        stream_scope: newScope 
      })
      .eq('id', editTarget.id);
    
    if (error) {
      alert('Error updating staff configuration: ' + error.message);
    } else {
      setIsEditOpen(false);
      fetchStaff();
    }
    setIsSubmitting(false);
  };

  const stats = {
    total: staffList.length,
    superAdmins: staffList.filter(s => s.role === 'super_admin').length,
    admins: staffList.filter(s => s.role === 'admin').length,
    coaches: staffList.filter(s => s.role === 'coach').length,
  };

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      {/* Header */}
      <header className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Human Resources</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            Staff Ledger
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">Manage team members, role assignments, and stream scopes.</p>
        </div>

        {currentStaff?.role === 'super_admin' && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider group whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-forest stroke-[2.5px] group-hover:rotate-90 transition-transform duration-500" />
            ADD STAFF
          </button>
        )}
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total staff', value: stats.total, icon: Users, color: 'text-gold', bg: 'bg-white/5', border: 'border-white/10' },
          { label: 'Super Admins', value: stats.superAdmins, icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
          { label: 'Administrators', value: stats.admins, icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
          { label: 'Academy Coaches', value: stats.coaches, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className="glass p-6 rounded-3xl shadow-pitch hover:border-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center border ${border}`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-0.5">{label}</p>
                <h3 className="text-2xl lg:text-3xl font-display font-extrabold text-white italic">
                  {isLoading ? '...' : value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Table */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-gold/10 to-gold-muted/5 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        
        <div className="relative glass rounded-[2rem] overflow-hidden shadow-pitch">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Team Member</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Email</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Role</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Stream Scope</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Joined</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-8 py-8 h-12 bg-white/5"></td>
                    </tr>
                  ))
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-40">
                        <Users className="w-12 h-12 text-gold animate-pulse" />
                        <p className="font-display font-bold text-xl text-white">No staff members found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  staffList.map((member) => {
                    const role = roleConfig[member.role] || { label: member.role, icon: UserCircle, style: 'bg-white/5 text-white/50 border border-white/10' };
                    const RoleIcon = role.icon;
                    const scope = scopeConfig[member.stream_scope || 'all'];
                    const isSelf = currentStaff?.id === member.id;
                    return (
                      <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group/row">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                              <UserCircle className="w-6 h-6 text-white/40" />
                            </div>
                            <div>
                              <p className="font-bold text-white text-lg tracking-tight group-hover/row:text-gold transition-colors">
                                {member.name}
                                {isSelf && (
                                  <span className="ml-2 text-[9px] px-2 py-0.5 bg-gold/10 text-gold border border-gold/20 rounded-full font-black uppercase tracking-widest">You</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-charcoal-light text-sm font-medium">
                            <Mail className="w-4 h-4 text-gold/50" />
                            {member.email}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${role.style}`}>
                            <RoleIcon className="w-3 h-3" />
                            {role.label}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${scope.style}`}>
                            {scope.label}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-charcoal-light text-sm font-medium">
                            <Calendar className="w-4 h-4 text-gold/50" />
                            {format(new Date(member.created_at), 'MMM d, yyyy')}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {currentStaff?.role === 'super_admin' && !isSelf && member.role !== 'super_admin' && (
                            <button
                              onClick={() => openEdit(member)}
                              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all group/btn border border-white/10 hover:border-white/20"
                            >
                              <Edit2 className="w-3.5 h-3.5 group-hover/btn:rotate-12 transition-transform" />
                              Configure Scope
                            </button>
                          )}
                          {member.role === 'super_admin' && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 italic">Protected</span>
                          )}
                          {isSelf && member.role !== 'super_admin' && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 italic">Current session</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Role/Scope Modal */}
      {isEditOpen && editTarget && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] text-white">
              <div>
                <h2 className="text-2xl font-display font-extrabold italic tracking-tight text-white uppercase">CONFIGURE SCOPE & ROLE</h2>
                <p className="text-gold text-[10px] font-black uppercase tracking-widest mt-1">{editTarget.name}</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-hide">
              {/* Section 1: Choose Role */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-gold mb-2">1. Select Staff Role</h3>
                {(['admin', 'coach'] as const).map((role) => {
                  const cfg = roleConfig[role];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={role}
                      onClick={() => setNewRole(role)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${newRole === role ? 'border-gold bg-white/5' : 'border-white/10 hover:border-gold/30'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${newRole === role ? 'bg-gold text-forest' : 'bg-white/5 text-charcoal-light'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{cfg.label}</p>
                        <p className="text-xs text-charcoal-light">{cfg.description}</p>
                      </div>
                      {newRole === role && (
                        <div className="ml-auto w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-forest rounded-full" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Section 2: Choose Scope */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] mb-2">2. Designate Stream Scope</h3>
                {(['all', 'stream_1', 'stream_2'] as const).map((scope) => {
                  const cfg = scopeConfig[scope];
                  return (
                    <button
                      key={scope}
                      onClick={() => setNewScope(scope)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${newScope === scope ? 'border-[#00F0FF] bg-white/5' : 'border-white/10 hover:border-[#00F0FF]/30'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${newScope === scope ? 'bg-[#00F0FF] text-forest' : 'bg-white/5 text-charcoal-light'}`}>
                        <Activity className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-white">{cfg.label}</p>
                        <p className="text-xs text-charcoal-light">{cfg.description}</p>
                      </div>
                      {newScope === scope && (
                        <div className="ml-auto w-5 h-5 bg-[#00F0FF] rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-forest rounded-full" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleRoleUpdate}
                disabled={isSubmitting || (newRole === editTarget.role && newScope === editTarget.stream_scope)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.01] active:scale-[0.99] uppercase text-sm tracking-[0.15em] disabled:opacity-50 disabled:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-forest" />
                    SAVING...
                  </>
                ) : (
                  <>
                    SAVE CHANGES
                    <ArrowRight className="w-5 h-5 text-forest font-bold" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Staff Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10 text-left">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] text-white">
              <div>
                <h2 className="text-2xl font-display font-extrabold italic tracking-tight text-white uppercase">ADD STAFF MEMBER</h2>
                <p className="text-gold text-[10px] font-black uppercase tracking-widest mt-1">Real-time Auth Creation</p>
              </div>
              <button 
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteResult(null);
                }} 
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-hide">
              {inviteResult ? (
                <div className="space-y-6 animate-in fade-in duration-300 text-center">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-white uppercase">Staff Registered Successfully!</h3>
                    <p className="text-xs text-charcoal-light mt-1">Their credentials are now active on Supabase Auth.</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-left space-y-3 font-medium">
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase">Email Address</p>
                      <p className="text-sm font-bold text-white mt-0.5">{inviteResult.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase">Temporary Password</p>
                      <p className="text-sm font-mono font-bold text-gold mt-0.5 bg-white/5 px-3 py-2 border border-white/10 rounded-lg select-all">
                        {inviteResult.tempPassword}
                      </p>
                      <p className="text-[9px] text-white/30 mt-1 italic">Click on the password to select all and copy it.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsInviteOpen(false);
                      setInviteResult(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 uppercase text-sm tracking-[0.15em]"
                  >
                    FINISH & REFRESH
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gold">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Wanjiku"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gold">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@mvsa.co.ke"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gold">Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Auto-generated if left blank"
                      value={inviteForm.password}
                      onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gold">Role</label>
                    <div className="relative">
                      <select
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as Staff['role'] })}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm appearance-none bg-forest-dark"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Administrator</option>
                        <option value="coach">Coach</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gold">Stream Scope</label>
                    <div className="relative">
                      <select
                        value={inviteForm.scope}
                        onChange={(e) => setInviteForm({ ...inviteForm, scope: e.target.value as Staff['stream_scope'] })}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm appearance-none bg-forest-dark"
                      >
                        <option value="all">All Streams (Full Scope)</option>
                        <option value="stream_1">Stream 1 Only (Venues)</option>
                        <option value="stream_2">Stream 2 Only (Academy Admin)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 mt-4 px-6 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 uppercase text-sm tracking-[0.15em] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-forest" />
                        CREATING AUTH USER...
                      </>
                    ) : (
                      <>
                        REGISTER STAFF MEMBER <ChevronRight className="w-4 h-4 text-forest font-bold" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
