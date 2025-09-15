import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Mic, MicOff, Volume2, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AudioRecorder, encodeAudioForAPI, playAudioData } from '@/utils/RealtimeAudio';
import { supabase } from '@/integrations/supabase/client';

interface QuickAnalystButtonProps {
  onAnalystOpen?: () => void;
}

export function QuickAnalystButton({ onAnalystOpen }: QuickAnalystButtonProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [defaultPersonality] = useState('mentor_female'); // User's preferred analyst
  
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordedAudioRef = useRef<Float32Array[]>([]);
  
  const RECORDING_TIME_LIMIT = 15; // 15 seconds max

  useEffect(() => {
    // Initialize audio context
    audioContextRef.current = new AudioContext();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setIsRecording(true);
      setRecordingTime(0);
      recordedAudioRef.current = [];
      
      // Start recording
      audioRecorderRef.current = new AudioRecorder((audioData) => {
        recordedAudioRef.current.push(new Float32Array(audioData));
      });
      
      await audioRecorderRef.current.start();
      
      // Start timer
      let time = 0;
      recordingTimerRef.current = setInterval(() => {
        time += 1;
        setRecordingTime(time);
        
        if (time >= RECORDING_TIME_LIMIT) {
          stopRecording();
        }
      }, 1000);
      
      toast({
        title: "🎙️ Listening...",
        description: `Ask your question now (${RECORDING_TIME_LIMIT}s max)`
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    setRecordingTime(0);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    
    // Process the recorded audio
    if (recordedAudioRef.current.length > 0) {
      await processRecording();
    }
  };

  const processRecording = async () => {
    setIsProcessing(true);
    
    try {
      // Combine all audio chunks
      const totalLength = recordedAudioRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
      const combinedAudio = new Float32Array(totalLength);
      let offset = 0;
      
      for (const chunk of recordedAudioRef.current) {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Encode audio for API
      const encodedAudio = encodeAudioForAPI(combinedAudio);
      
      // Send to analyst for processing
      const { data, error } = await supabase.functions.invoke('quick-analyst-voice', {
        body: {
          audio: encodedAudio,
          personality: defaultPersonality,
          format: 'voice_response'
        }
      });
      
      if (error) throw error;
      
      // Play the response
      if (data.audio_response && audioContextRef.current) {
        setIsPlaying(true);
        
        // Convert base64 to audio and play
        const binaryString = atob(data.audio_response);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        await playAudioData(audioContextRef.current, bytes);
        
        // Enhanced toast with tool usage info
        const toolInfo = data.tool_calls && data.tool_calls.length > 0 
          ? ` (Used ${data.tool_calls.map(tc => tc.function).join(', ')})`
          : '';
        
        toast({
          title: `🎯 ${data.personality_name || 'Analyst'} Response`,
          description: `${data.text_response?.substring(0, 100) || "Response received"}${toolInfo}`
        });
        
        setTimeout(() => setIsPlaying(false), 3000);
      }
      
    } catch (error) {
      console.error('Error processing recording:', error);
      
      // Enhanced error handling based on server response
      let errorTitle = "Processing Error";
      let errorDescription = "Failed to process your question. Please try again.";
      
      if (error.message?.includes('verification failed')) {
        errorTitle = "Audio Verification Failed";
        errorDescription = "Please speak clearly and try again.";
      } else if (error.message?.includes('transcribe')) {
        errorTitle = "Speech Recognition Error";
        errorDescription = "I had trouble understanding your audio. Please try speaking again.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isProcessing && !isPlaying) {
      startRecording();
    }
  };

  // Determine button appearance
  const getButtonState = () => {
    if (isRecording) {
      return {
        variant: 'destructive' as const,
        className: 'animate-pulse bg-red-500 hover:bg-red-600',
        icon: <Mic className="h-4 w-4" />,
        text: 'Recording...'
      };
    }
    
    if (isProcessing) {
      return {
        variant: 'secondary' as const,
        className: 'animate-pulse bg-blue-500 hover:bg-blue-600',
        icon: <Brain className="h-4 w-4" />,
        text: 'Processing...'
      };
    }
    
    if (isPlaying) {
      return {
        variant: 'default' as const,
        className: 'animate-bounce bg-green-500 hover:bg-green-600',
        icon: <Volume2 className="h-4 w-4" />,
        text: 'Playing...'
      };
    }
    
    return {
      variant: 'ghost' as const,
      className: 'hover:bg-primary/10',
      icon: <Brain className="h-4 w-4 mr-1" />,
      text: 'Ask Analyst'
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="relative">
      <Button 
        variant={buttonState.variant}
        size="sm" 
        className={`h-8 px-3 ${buttonState.className}`}
        onClick={handleClick}
        disabled={isProcessing}
      >
        {buttonState.icon}
        <span className="hidden sm:inline font-medium ml-1">{buttonState.text}</span>
        
        {/* Recording timer */}
        {isRecording && (
          <Badge className="absolute -top-1 -right-1 h-5 px-1 bg-red-600 text-white text-xs">
            {recordingTime}s
          </Badge>
        )}
      </Button>
      
      {/* Visual recording indicator */}
      {isRecording && (
        <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}