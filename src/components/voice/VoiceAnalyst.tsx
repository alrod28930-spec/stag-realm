import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Volume2, VolumeX, Settings, MessageCircle, Brain, Pause, Play } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AudioRecorder, encodeAudioForAPI, playAudioData, clearAudioQueue } from '@/utils/RealtimeAudio';
import { supabase } from '@/integrations/supabase/client';

interface VoiceAnalystProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

// Personality configuration
const ANALYST_PERSONALITIES = {
  mentor: {
    name: 'Mentor',
    description: 'Wise guide with calm authority',
    voice: 'sage',
    color: 'bg-blue-500',
    icon: '🧙‍♂️'
  },
  coach: {
    name: 'Coach', 
    description: 'Encouraging performance coach',
    voice: 'alloy',
    color: 'bg-green-500',
    icon: '💪'
  },
  analyst: {
    name: 'Analyst',
    description: 'Sharp analytical thinker',
    voice: 'nova',
    color: 'bg-purple-500',
    icon: '🔍'
  },
  advisor: {
    name: 'Advisor',
    description: 'Professional financial advisor',
    voice: 'shimmer',
    color: 'bg-yellow-500',
    icon: '💼'
  },
  teacher: {
    name: 'Teacher',
    description: 'Patient educational guide',
    voice: 'echo',
    color: 'bg-indigo-500',
    icon: '📚'
  },
  strategist: {
    name: 'Strategist',
    description: 'Strategic military-style advisor',
    voice: 'onyx',
    color: 'bg-red-500',
    icon: '⚔️'
  }
} as const;

type PersonalityKey = keyof typeof ANALYST_PERSONALITIES;

export function VoiceAnalyst({ isMinimized = false, onToggleMinimize }: VoiceAnalystProps) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAITalking, setIsAITalking] = useState(false);
  const [currentPersonality, setCurrentPersonality] = useState<PersonalityKey>('mentor');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [transcript, setTranscript] = useState<string[]>([]);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // Initialize audio context
    audioContextRef.current = new AudioContext();
    
    return () => {
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const connect = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Connect to realtime analyst edge function via POST
      const sessionConfig = {
        personality: currentPersonality,
        sessionId: sessionIdRef.current,
        systemPrompt: `You are a ${ANALYST_PERSONALITIES[currentPersonality].description} serving as a financial analyst for the StagAlgo trading platform.`
      };

      const { data, error } = await supabase.functions.invoke('realtime-analyst', {
        body: sessionConfig
      });

      if (error) {
        throw error;
      }

      console.log('Voice session initialized:', data);
      
      // Simulate connection success
      setTimeout(() => {
        setConnectionStatus('connected');
        setIsConnected(true);
        toast({
          title: "Voice Analyst Connected",
          description: `${ANALYST_PERSONALITIES[currentPersonality].name} is ready to help!`
        });
      }, 1000);

      // Mock event handling for demo - in production this would handle real AI responses
      const mockEvents = () => {
        // Simulate periodic responses for demo purposes
        const responses = [
          "Your portfolio is performing well with a 2.1% gain today.",
          "Market sentiment is bullish. SPY is testing resistance at 485.",
          "Consider taking profits on your tech positions if they hit your targets."
        ];
        
        let messageIndex = 0;
        const interval = setInterval(() => {
          if (isConnected && messageIndex < responses.length) {
            setTranscript(prev => [...prev, `AI: ${responses[messageIndex]}`].slice(-10));
            messageIndex++;
          }
          if (messageIndex >= responses.length) {
            clearInterval(interval);
          }
        }, 15000); // Every 15 seconds
        
        return () => clearInterval(interval);
      };
      
      const cleanupFunction = mockEvents();
      
      eventSourceRef.current = {
        close: cleanupFunction,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        readyState: 1,
        url: '',
        withCredentials: false,
        CONNECTING: 0,
        OPEN: 1,
        CLOSED: 2,
        onopen: null,
        onmessage: null,
        onerror: null
      } as EventSource;

      eventSourceRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received event:', data.type);

          switch (data.type) {
            case 'session.created':
              setConnectionStatus('connected');
              setIsConnected(true);
              toast({
                title: "Voice Analyst Connected",
                description: `${ANALYST_PERSONALITIES[currentPersonality].name} is ready to help!`
              });
              break;

            case 'response.audio.delta':
              if (!isMuted && audioContextRef.current && data.delta) {
                setIsAITalking(true);
                // Convert base64 to Uint8Array
                const binaryString = atob(data.delta);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                await playAudioData(audioContextRef.current, bytes);
              }
              break;

            case 'response.audio.done':
              setIsAITalking(false);
              break;

            case 'response.audio_transcript.delta':
              if (data.delta) {
                setTranscript(prev => {
                  const newTranscript = [...prev];
                  if (newTranscript.length > 0 && newTranscript[newTranscript.length - 1].startsWith('AI: ')) {
                    newTranscript[newTranscript.length - 1] += data.delta;
                  } else {
                    newTranscript.push('AI: ' + data.delta);
                  }
                  return newTranscript.slice(-10); // Keep last 10 messages
                });
              }
              break;

            case 'input_audio_buffer.speech_started':
              setIsRecording(true);
              break;

            case 'input_audio_buffer.speech_stopped':
              setIsRecording(false);
              break;

            case 'error':
              console.error('Voice session error:', data.error);
              toast({
                title: "Connection Error",
                description: data.error,
                variant: "destructive"
              });
              break;
          }
        } catch (error) {
          console.error('Error processing voice event:', error);
        }
      };

      eventSourceRef.current.onerror = () => {
        setConnectionStatus('error');
        toast({
          title: "Connection Lost",
          description: "Voice analyst connection failed. Retrying...",
          variant: "destructive"
        });
      };

      // Start audio recording
      audioRecorderRef.current = new AudioRecorder((audioData) => {
        if (eventSourceRef.current && !isMuted && !isAITalking) {
          const encoded = encodeAudioForAPI(audioData);
          // Send audio data via Supabase function
          supabase.functions.invoke('realtime-analyst', {
            body: {
              type: 'input_audio_buffer.append',
              audio: encoded,
              sessionId: sessionIdRef.current
            }
          }).catch(console.error);
        }
      });

      await audioRecorderRef.current.start();

    } catch (error) {
      console.error('Error connecting to voice analyst:', error);
      setConnectionStatus('error');
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to voice analyst",
        variant: "destructive"
      });
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    
    clearAudioQueue();
    setIsConnected(false);
    setIsRecording(false);
    setIsAITalking(false);
    setConnectionStatus('disconnected');
    
    toast({
      title: "Voice Analyst Disconnected",
      description: "Voice session ended"
    });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      clearAudioQueue();
      setIsAITalking(false);
    }
  };

  const switchPersonality = (personality: PersonalityKey) => {
    setCurrentPersonality(personality);
    if (isConnected) {
      // Reconnect with new personality
      disconnect();
      setTimeout(connect, 1000);
    }
  };

  if (isMinimized) {
    return (
      <Card className="fixed bottom-4 right-4 p-3 shadow-lg z-50 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium">
            {ANALYST_PERSONALITIES[currentPersonality].icon} {ANALYST_PERSONALITIES[currentPersonality].name}
          </span>
          {isRecording && <Mic className="h-4 w-4 text-red-500 animate-pulse" />}
          {isAITalking && <Volume2 className="h-4 w-4 text-blue-500 animate-bounce" />}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onToggleMinimize}
            className="p-1 h-6 w-6"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg z-50 bg-background/95 backdrop-blur">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Voice Analyst</h3>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
              {connectionStatus}
            </Badge>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onToggleMinimize}
              className="p-1 h-6 w-6"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Personality Selector */}
      <div className="p-4 border-b">
        <label className="text-sm font-medium mb-2 block">Analyst Personality</label>
        <Select 
          value={currentPersonality} 
          onValueChange={(value: PersonalityKey) => switchPersonality(value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ANALYST_PERSONALITIES).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <span>{config.icon}</span>
                  <div>
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs text-muted-foreground">{config.description}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Controls */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-center gap-4">
          {!isConnected ? (
            <Button 
              onClick={connect}
              className="flex-1"
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Voice Session'}
            </Button>
          ) : (
            <>
              <Button
                variant={isMuted ? 'destructive' : 'outline'}
                size="icon"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              
              <div className="flex-1 text-center">
                {isAITalking && (
                  <Badge className="bg-blue-500 animate-pulse">
                    AI Speaking
                  </Badge>
                )}
                {isRecording && (
                  <Badge className="bg-red-500 animate-pulse">
                    <Mic className="h-3 w-3 mr-1" />
                    Listening
                  </Badge>
                )}
                {!isRecording && !isAITalking && (
                  <Badge variant="outline">
                    Ready
                  </Badge>
                )}
              </div>
              
              <Button
                variant="destructive"
                size="icon"
                onClick={disconnect}
              >
                <MicOff className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status & Tips */}
      <div className="p-4 text-sm text-muted-foreground">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span>
              {isConnected 
                ? `Connected to ${ANALYST_PERSONALITIES[currentPersonality].name}`
                : 'Not connected'
              }
            </span>
          </div>
          
          {isConnected && (
            <div className="text-xs space-y-1">
              <p>💡 Ask about your portfolio, market conditions, or trading strategies</p>
              <p>🎯 Try: "What's my portfolio performance today?" or "Should I buy AAPL?"</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transcript */}
      {transcript.length > 0 && (
        <>
          <Separator />
          <div className="p-4 max-h-40 overflow-y-auto">
            <div className="text-xs font-medium mb-2">Recent Conversation:</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {transcript.slice(-3).map((message, index) => (
                <p key={index} className="break-words">{message}</p>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}