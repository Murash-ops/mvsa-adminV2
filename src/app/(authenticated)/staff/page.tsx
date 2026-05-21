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
  Dumbbell,
} from 'lucide-react';

type Staff = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'instructor';
  created_at: string;
};

const roleConfig = {
  super_admin: {
    label: 'Super Admin',
    icon: Crown,
    style: 'bg-gold/10 text-gold border-gold/30',
    description: 'Full system access',
  },
  admin: {
    label: 'Administrator',
    icon: ShieldCheck,
    style: 'bg-green-100 text-green-800 border-green-200',
    description: 'Manage bookings, expenses & staff',
  },
  instructor: {
    label: 'Instructor',
    icon: Dumbbell,
    style: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Program portal access only',
  },
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'admin' as Staff['role'] });

  const fetchStaff = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setStaffList(data as Staff[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const openEdit = (member: Staff) => {
    setEditTarget(member);
    setNewRole(member.role);
    setIsEditOpen(true);
  };

  const handleRoleUpdate = async () => {
    if (!editTarget) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from('staff')
      .update({ role: newRole })
      .eq('id', editTarget.id);
    if (error) {
      alert('Error updating role: ' + error.message);
    } else {
      setIsEditOpen(false);
      fetchStaff();
    }
    setIsSubmitting(false);
  };

  const stats = {
    total: staffList.length,
    admins: staffList.filter(s => s.role === 'admin' || s.role === 'super_admin').length,
    instructors: staffList.filter(s => s.role === 'instructor').length,
  };

  return (
    <div className="flex flex-col flex-1 p-8 bg-surface/50 min-h-full">
      {/* Header */}
      <header className="mb-10 flex justify-between items-end animate-slide-up">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-forest/60">Human Resources</span>
          </div>
          <h1 className="text-5xl font-display font-extrabold text-forest tracking-tighter leading-none">
            STAFF
          </h1>
          <p className="text-charcoal-light mt-2 font-medium">Manage team members, roles, and access permissions.</p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="flex items-center gap-3 px-6 py-3 bg-forest text-white rounded-2xl text-sm font-bold hover:bg-forest-dark transition-all shadow-xl shadow-forest/20 hover:-translate-y-0.5 active:scale-95 group"
        >
          <Plus className="w-5 h-5 text-gold group-hover:rotate-90 transition-transform duration-500" />
          ADD STAFF
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Staff', value: stats.total, icon: Users, color: 'text-forest', bg: 'bg-forest/5', border: 'border-forest/10' },
          { label: 'Admins', value: stats.admins, icon: ShieldCheck, color: 'text-gold', bg: 'bg-gold/5', border: 'border-gold/10' },
          { label: 'Instructors', value: stats.instructors, icon: Dumbbell, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className="relative group overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-gold/10 to-transparent rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000" />
            <div className="relative bg-white/70 backdrop-blur-md border border-white/20 p-8 rounded-[2rem] shadow-xl flex items-center gap-6">
              <div className={`w-16 h-16 ${bg} rounded-2xl flex items-center justify-center border ${border}`}>
                <Icon className={`w-8 h-8 ${color}`} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-forest/40 mb-1">{label}</p>
                <h3 className="text-4xl font-display font-black text-forest tracking-tighter">
                  {isLoading ? '...' : value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Table */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-gold/20 to-forest/10 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000" />
        <div className="relative bg-white/70 backdrop-blur-md border border-white/20 rounded-[2rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-forest/5 border-b border-forest/10">
                <th className="px-8 py-5 text-[10px] uppercase font-black text-forest tracking-[0.2em]">Team Member</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-forest tracking-[0.2em]">Email</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-forest tracking-[0.2em]">Role</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-forest tracking-[0.2em]">Joined</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-forest tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest/5">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-8">
                      <div className="h-12 bg-forest/5 rounded-2xl w-full" />
                    </td>
                  </tr>
                ))
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <Users className="w-12 h-12 text-forest" />
                      <p className="font-display font-bold text-xl text-forest">No staff members found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                staffList.map((member) => {
                  const role = roleConfig[member.role];
                  const RoleIcon = role.icon;
                  const isSelf = currentStaff?.id === member.id;
                  return (
                    <tr key={member.id} className="hover:bg-white/50 transition-all duration-300 group/row">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-forest/5 flex items-center justify-center border border-forest/10">
                            <UserCircle className="w-7 h-7 text-forest/40" />
                          </div>
                          <div>
                            <p className="font-bold text-forest tracking-tight group-hover/row:text-gold transition-colors">
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
                          <Mail className="w-4 h-4 text-forest/30" />
                          {member.email}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${role.style}`}>
                          <RoleIcon className="w-3 h-3" />
                          {role.label}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-charcoal-light text-sm font-medium">
                          <Calendar className="w-4 h-4 text-forest/30" />
                          {format(new Date(member.created_at), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {!isSelf && member.role !== 'super_admin' && (
                          <button
                            onClick={() => openEdit(member)}
                            className="flex items-center gap-2 px-4 py-2 bg-forest/5 hover:bg-forest hover:text-white rounded-xl text-xs font-black uppercase tracking-widest text-forest transition-all group/btn border border-forest/10 hover:border-forest"
                          >
                            <Edit2 className="w-3.5 h-3.5 group-hover/btn:rotate-12 transition-transform" />
                            Edit Role
                          </button>
                        )}
                        {member.role === 'super_admin' && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-forest/30 italic">Protected</span>
                        )}
                        {isSelf && member.role !== 'super_admin' && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-forest/30 italic">Current session</span>
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

      {/* Edit Role Modal */}
      {isEditOpen && editTarget && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-border-color flex justify-between items-center bg-forest text-white">
              <div>
                <h2 className="text-2xl font-display font-bold italic tracking-tight">EDIT ROLE</h2>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">{editTarget.name}</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-charcoal-light font-medium">
                Select a new role for <span className="font-bold text-forest">{editTarget.name}</span>. This will immediately change their access level.
              </p>
              <div className="space-y-3">
                {(['admin', 'instructor'] as const).map((role) => {
                  const cfg = roleConfig[role];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={role}
                      onClick={() => setNewRole(role)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${newRole === role ? 'border-forest bg-forest/5' : 'border-border-color hover:border-forest/30'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${newRole === role ? 'bg-forest text-white' : 'bg-surface text-charcoal-light'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-forest">{cfg.label}</p>
                        <p className="text-xs text-charcoal-light">{cfg.description}</p>
                      </div>
                      {newRole === role && (
                        <div className="ml-auto w-5 h-5 bg-forest rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleRoleUpdate}
                disabled={isSubmitting || newRole === editTarget.role}
                className="w-full flex items-center justify-center gap-3 bg-gold text-forest px-8 py-4 rounded-2xl font-bold text-sm tracking-[0.2em] uppercase transition-all shadow-xl shadow-gold/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> SAVING...</>
                ) : (
                  <>SAVE CHANGES <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Staff Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-border-color flex justify-between items-center bg-forest text-white">
              <div>
                <h2 className="text-2xl font-display font-bold italic tracking-tight">ADD STAFF</h2>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">New Team Member</p>
              </div>
              <button onClick={() => setIsInviteOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-gold/5 border border-gold/20 rounded-2xl p-4">
                <p className="text-xs font-bold text-gold uppercase tracking-widest mb-1">How to add staff</p>
                <p className="text-sm text-charcoal-light font-medium">
                  To add a new staff member:
                </p>
                <ol className="text-sm text-charcoal-light font-medium list-decimal list-inside mt-2 space-y-1">
                  <li>Go to your <span className="font-bold text-forest">Supabase Dashboard</span></li>
                  <li>Navigate to <span className="font-bold">Authentication → Users</span></li>
                  <li>Click <span className="font-bold">Invite User</span> and enter their email</li>
                  <li>Then insert their profile into the <code className="text-xs bg-forest/5 px-1 py-0.5 rounded font-mono">staff</code> table with the correct role</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted">Full Name</label>
                  <input
                    type="text"
                    placeholder="Jane Wanjiku"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-medium text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted">Email Address</label>
                  <input
                    type="email"
                    placeholder="jane@mvsa.co.ke"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-medium text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted">Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as Staff['role'] })}
                    className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-bold text-sm appearance-none"
                  >
                    <option value="admin">Administrator</option>
                    <option value="instructor">Instructor</option>
                  </select>
                </div>
              </div>

              <div className="bg-surface rounded-2xl p-4 border border-border-color">
                <p className="text-xs font-black text-muted uppercase tracking-widest mb-2">SQL to run after inviting</p>
                <pre className="text-xs font-mono text-forest bg-forest/5 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap">
{`INSERT INTO public.staff (id, name, email, role)
VALUES (
  '<user-uuid-from-auth>',
  '${inviteForm.name || 'Full Name'}',
  '${inviteForm.email || 'email@example.com'}',
  '${inviteForm.role}'
);`}
                </pre>
              </div>

              <button
                onClick={() => setIsInviteOpen(false)}
                className="w-full flex items-center justify-center gap-3 bg-forest text-white px-8 py-4 rounded-2xl font-bold text-sm tracking-[0.2em] uppercase transition-all active:scale-95"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
