import supabase from './supabaseClient';
import { safeQuery } from './supabaseUtils';
import { badgesService } from './badgesService';

export const viewsService = {
  async trackView(articleId: string, userId: string | null): Promise<boolean> {
    //console.log('🔍 [VIEWS DEBUG] Starting view tracking:', { articleId, userId });

    try {
      // Get client IP (in production, this would come from server)
      const ipAddress = await this.getClientIP();
      //console.log('🌐 [VIEWS DEBUG] Got IP address:', ipAddress);

      const { data, error } = await safeQuery('views/track', async () => {
        //console.log('📡 [VIEWS DEBUG] Calling track_article_view RPC');
        const res = await supabase.rpc('track_article_view', {
          p_article_id: articleId,
          p_user_id: userId,
          p_ip_address: ipAddress
        });

        //console.log('📡 [VIEWS DEBUG] RPC response:', res);

        if (res.error) {
          console.error('❌ [VIEWS DEBUG] RPC error:', res.error);
          throw res.error;
        }

        //console.log('✅ [VIEWS DEBUG] RPC success, data:', res.data);

        // If view was tracked, let's also check the current view count
        if (res.data === true) {
          // View tracking succeeded
        }

        if (res.data) {
          // Check for viral badge (for author) - async
          supabase
            .from('articles')
            .select('author_id, views')
            .eq('id', articleId)
            .single()
            .then(({ data }) => {
              if (data) {
                badgesService.checkViralBadge(data.author_id, data.views);
              }
            });

          // Check for reader badges (for viewer)
          if (userId) {
            badgesService.checkReaderBadges(userId);
          }
        }

        return res.data;
      });

      if (error) {
        console.error('❌ [VIEWS DEBUG] safeQuery error:', error);
        throw error;
      }

      //console.log('🎯 [VIEWS DEBUG] Final result:', { data, success: data as boolean });
      return data as boolean;
    } catch (error) {
      console.error('💥 [VIEWS DEBUG] Failed to track view:', error);
      return false;
    }
  },

  async getClientIP(): Promise<string> {
    //console.log('🌐 [IP DEBUG] Getting client IP...');
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      //console.log('🌐 [IP DEBUG] IP response:', data);
      return data.ip;
    } catch (error) {
      console.error('🌐 [IP DEBUG] Failed to get IP:', error);
      return '0.0.0.0';
    }
  }
};
