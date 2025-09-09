import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { eventBus } from '@/services/eventBus';
import { useToast } from '@/hooks/use-toast';

interface VoicePlaybackData {
  url: string;
  transcript: string;
  messageId: string;
}

export function GlobalVoicePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<VoicePlaybackData | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Listen for voice play events
    const handleVoicePlay = (data: VoicePlaybackData) => {
      console.log('GlobalVoicePlayer: Received play event', data);
      
      if (!data.url) {
        console.error('GlobalVoicePlayer: No audio URL provided');
        return;
      }

      setCurrentAudio(data);
      setIsVisible(true);
      playAudio(data.url);
    };

    const handleVoiceStop = () => {
      stopAudio();
    };

    const handleVoiceSettingsChanged = (settings: { enabled: boolean }) => {
      if (!settings.enabled) {
        stopAudio();
        setIsVisible(false);
      }
    };

    eventBus.on('voice.play', handleVoicePlay);
    eventBus.on('voice.stop', handleVoiceStop);
    eventBus.on('voice.settings.changed', handleVoiceSettingsChanged);

    return () => {
      eventBus.off('voice.play', handleVoicePlay);
      eventBus.off('voice.stop', handleVoiceStop);
      eventBus.off('voice.settings.changed', handleVoiceSettingsChanged);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAudio = async (url: string) => {
    try {
      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Create new audio element
      const audio = new Audio(url);
      audioRef.current = audio;

      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
        // Auto-minimize after playback
        setIsMinimized(true);
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        toast({
          title: "Playback Error",
          description: "Failed to play audio. Please try again.",
          variant: "destructive"
        });
        setIsPlaying(false);
      });

      // Start playback
      await audio.play();
      setIsPlaying(true);
      setIsMinimized(false);

    } catch (error) {
      console.error('Failed to play audio:', error);
      toast({
        title: "Playback Failed",
        description: "Unable to start audio playback.",
        variant: "destructive"
      });
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setProgress(percentage * 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const dismiss = () => {
    stopAudio();
    setIsVisible(false);
    setCurrentAudio(null);
  };

  if (!isVisible || !currentAudio) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <Card className="bg-background/95 backdrop-blur-sm border shadow-lg">
        {!isMinimized ? (
          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Analyst Voice</span>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismiss}
                >
                  ×
                </Button>
              </div>
            </div>

            {/* Transcript */}
            <div className="bg-muted/50 rounded-md p-2 max-h-20 overflow-y-auto">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {currentAudio.transcript}
              </p>
            </div>

            {/* Progress Bar */}
            <div 
              className="cursor-pointer"
              onClick={handleProgressClick}
            >
              <Progress value={progress} className="h-2" />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePlayPause}
                  disabled={!audioRef.current}
                >
                  {isPlaying ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopAudio}
                  disabled={!audioRef.current}
                >
                  <Square className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                </Button>
              </div>

              {/* Time Display */}
              <div className="text-xs text-muted-foreground">
                {audioRef.current ? (
                  <>
                    {formatTime(audioRef.current.currentTime)} / {formatTime(duration)}
                  </>
                ) : (
                  '0:00 / 0:00'
                )}
              </div>
            </div>
          </div>
        ) : (
          // Minimized view
          <div className="p-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-3 h-3 text-primary" />
              <span className="text-xs">Playing...</span>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}