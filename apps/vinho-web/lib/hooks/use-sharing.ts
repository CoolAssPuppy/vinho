import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import type { SharingConnection, UserSharingPreferences, SendInvitationResult } from '@/lib/types/sharing';

type DbSharingConnection = Database['public']['Functions']['get_sharing_connections_with_profiles']['Returns'][number];
type DbUserSharingPreferences = Database['public']['Tables']['user_sharing_preferences']['Row'];

export function useSharing() {
  const [connections, setConnections] = useState<SharingConnection[]>([]);
  const [preferences, setPreferences] = useState<UserSharingPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchConnections = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_sharing_connections_with_profiles');

      if (error) throw error;
      setConnections((data as unknown as SharingConnection[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch connections');
    }
  }, [supabase]);

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_sharing_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data as UserSharingPreferences);
      } else {
        // Create default preferences
        await createDefaultPreferences(user.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    }
  }, [supabase]);

  const createDefaultPreferences = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_sharing_preferences')
      .insert({
        user_id: userId,
        visible_sharers: []
      })
      .select()
      .single();

    if (!error && data) {
      setPreferences(data as UserSharingPreferences);
    }
  };

  const sendInvitation = async (
    viewerEmail: string
  ): Promise<SendInvitationResult> => {
    try {
      // Call edge function to handle invitation creation and email sending
      const { data, error } = await supabase.functions.invoke('send-sharing-invitation', {
        body: { viewer_email: viewerEmail }
      });

      if (error) throw error;

      const result = data as SendInvitationResult;

      if (result.success) {
        await fetchConnections();
      }

      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send invitation'
      };
    }
  };

  const acceptInvitation = async (connectionId: string): Promise<{success: boolean, error?: string}> => {
    try {
      const { error } = await supabase
        .from('sharing_connections')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) throw error;

      // Find the connection and add sharer to visible list
      const connection = connections.find(c => c.id === connectionId);
      if (connection) {
        await toggleSharerVisibility(connection.sharer_id, true);
      }

      await fetchConnections();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to accept invitation'
      };
    }
  };

  const rejectInvitation = async (connectionId: string): Promise<{success: boolean, error?: string}> => {
    try {
      const { error } = await supabase
        .from('sharing_connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId);

      if (error) throw error;
      await fetchConnections();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to reject invitation'
      };
    }
  };

  const revokeSharing = async (connectionId: string): Promise<{success: boolean, error?: string}> => {
    try {
      // Update status to 'revoked' instead of deleting to preserve history
      // This allows re-sharing with the same user later
      const { error } = await supabase
        .from('sharing_connections')
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) throw error;
      await fetchConnections();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to revoke sharing'
      };
    }
  };

  const toggleSharerVisibility = async (sharerId: string, visible: boolean): Promise<{success: boolean, error?: string}> => {
    if (!preferences) return { success: false, error: 'No preferences loaded' };

    const visibleSharers = visible
      ? [...preferences.visible_sharers, sharerId].filter((v, i, a) => a.indexOf(v) === i)
      : preferences.visible_sharers.filter(id => id !== sharerId);

    try {
      const { error } = await supabase
        .from('user_sharing_preferences')
        .update({
          visible_sharers: visibleSharers,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', preferences.user_id);

      if (error) throw error;

      setPreferences({
        ...preferences,
        visible_sharers: visibleSharers
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update preferences'
      };
    }
  };

  const isSharerVisible = (sharerId: string): boolean => {
    return preferences?.visible_sharers.includes(sharerId) ?? false;
  };

  const getPendingInvitationsReceived = useCallback(() => {
    // This will be populated once user is loaded
    return connections.filter(c => c.status === 'pending');
  }, [connections]);

  const getActiveSharesSent = useCallback(() => {
    return connections.filter(c => c.status === 'accepted');
  }, [connections]);

  const getActiveSharesReceived = useCallback(() => {
    return connections.filter(c => c.status === 'accepted');
  }, [connections]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchConnections(), fetchPreferences()]);
      setLoading(false);
    };
    load();
  }, [fetchConnections, fetchPreferences]);

  return {
    connections,
    preferences,
    loading,
    error,
    sendInvitation,
    acceptInvitation,
    rejectInvitation,
    revokeSharing,
    toggleSharerVisibility,
    isSharerVisible,
    getPendingInvitationsReceived,
    getActiveSharesSent,
    getActiveSharesReceived,
    refresh: () => Promise.all([fetchConnections(), fetchPreferences()])
  };
}
