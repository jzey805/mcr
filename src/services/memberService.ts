import { supabase } from '../lib/supabase';

export interface Member {
  id: string;
  church_id: string;
  name: string;
  initials: string;
  role: string[];
  joined: string;
  family: string;
  phone?: string;
  email?: string;
  address?: string;
  age?: number;
  dob?: string;
  occupation?: string;
  status: 'Pastor' | 'Leader' | 'Member' | 'New Friend';
  referral_source?: string;
  friends_with?: string[];
  skills?: string[];
}

export interface MemberLink {
  id: string;
  church_id: string;
  source_id: string;
  target_id: string;
  type: 'Mentor' | 'Family' | 'Team Member' | 'Invited' | 'Friend';
}

export const memberService = {
  async getMembers(churchId: string) {
    const { data, error } = await supabase
      .from('church_members')
      .select('*')
      .eq('church_id', churchId);
    
    if (error) throw error;
    return data as Member[];
  },

  async getMemberLinks(churchId: string) {
    const { data, error } = await supabase
      .from('member_links')
      .select('*')
      .eq('church_id', churchId);
    
    if (error) throw error;
    return data as MemberLink[];
  },

  async addMember(member: Omit<Member, 'id'>) {
    const { data, error } = await supabase
      .from('church_members')
      .insert(member)
      .select()
      .single();
    
    if (error) throw error;
    return data as Member;
  },

  async updateMember(id: string, updates: Partial<Member>) {
    const { data, error } = await supabase
      .from('church_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Member;
  },

  async deleteMember(id: string) {
    const { error } = await supabase
      .from('church_members')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async upsertMemberLink(link: Omit<MemberLink, 'id'>) {
     const { data, error } = await supabase
      .from('member_links')
      .upsert(link)
      .select()
      .single();
    
    if (error) throw error;
    return data as MemberLink;
  }
};
