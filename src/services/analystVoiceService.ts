import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { eventBus } from './eventBus';

export interface VoiceAnalystResult {
  success: boolean;
  transcription?: string;
  response?: string;
  audio_url?: string;
  personality?: string;
  error?: string;
}

class AnalystVoiceService {
  private isProcessing = false;

  async processVoiceInput(
    audioData: string, 
    personality: string = 'mentor_male',
    workspaceId?: string
  ): Promise<VoiceAnalystResult> {
    
    if (this.isProcessing) {
      throw new Error('Voice processing already in progress');
    }

    this.isProcessing = true;

    try {
      console.log('Processing voice input:', { personality, audioLength: audioData.length });
      
      // Call unified voice processing function
      const { data, error } = await supabase.functions.invoke('analyst-voice-unified', {
        body: {
          audio: audioData,
          personality,
          workspace_id: workspaceId
        }
      });

      if (error) {
        console.error('Voice processing error:', error);
        throw new Error(error.message || 'Voice processing failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Voice processing failed');
      }

      // Emit successful interaction event
      eventBus.emit('analyst.voice_interaction', {
        transcription: data.transcription,
        response: data.response,
        personality: data.personality,
        timestamp: data.timestamp
      });

      console.log('Voice processing completed successfully');
      return data;

    } catch (error) {
      console.error('Voice service error:', error);
      
      // Provide user-friendly error messages
      const friendlyErrors: Record<string, string> = {
        'invalid_api_key': 'Voice service configuration issue. Please contact support.',
        'No speech detected': 'No speech detected. Please speak clearly and try again.',
        'transcription': 'Could not understand your audio. Please try speaking again.',
        'Analysis failed': 'Analysis is temporarily unavailable. Please try again in a moment.',
        'Speech generation failed': 'Voice response generation failed. Please try again.'
      };

      let userMessage = 'Voice processing failed. Please try again.';
      for (const [key, message] of Object.entries(friendlyErrors)) {
        if (error.message?.includes(key)) {
          userMessage = message;
          break;
        }
      }

      return {
        success: false,
        error: userMessage
      };

    } finally {
      this.isProcessing = false;
    }
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  // Cancel any ongoing processing
  cancelProcessing(): void {
    this.isProcessing = false;
  }
}

export const analystVoiceService = new AnalystVoiceService();