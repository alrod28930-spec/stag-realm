import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  TrendingUp, 
  Zap, 
  Brain, 
  BookOpen,
  DollarSign,
  Lock,
  BarChart3,
  Bot,
  Eye,
  Target,
  Lightbulb
} from 'lucide-react';

export default function About() {
  console.log('🏠 About page: Rendering started');
  const steps = [
    {
      icon: Lock,
      title: "Connect Broker",
      description: "Securely connect your brokerage account (e.g., Alpaca) via API keys. Your funds remain with your broker.",
      color: "text-blue-400"
    },
    {
      icon: Bot,
      title: "Activate Trade Bots",
      description: "Toggle Bots to Simulation or Live. They scan Oracle signals, propose trades, and execute only if risk checks pass.",
      color: "text-accent"
    },
    {
      icon: Brain,
      title: "Learn & Grow",
      description: "Analyst explains every trade, every win, and every loss. Recorder builds an auditable history so you can refine strategies and build long-term skill.",
      color: "text-primary-glow"
    }
  ];

  const benefits = [
    {
      icon: DollarSign,
      title: "Make Money with Safety",
      description: "Bots are designed to seek profits using proven strategies, while Monarch & Overseer enforce strict risk limits.",
      accent: "text-green-400"
    },
    {
      icon: BookOpen,
      title: "Learn the Market",
      description: "Every trade is also a lesson. Analyst explains the 'why,' helping you evolve as a trader.",
      accent: "text-blue-400"
    },
    {
      icon: Shield,
      title: "Stay in Control",
      description: "You control toggles, risk settings, and which strategies run. StagAlgo never takes control of your funds.",
      accent: "text-accent"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header with Crest */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img 
              src="/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png" 
              alt="StagAlgo Crest" 
              className="w-20 h-20 object-contain"
            />
            <div className="absolute inset-0 bg-gradient-primary opacity-20 rounded-full blur-xl"></div>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent font-serif">
          About StagAlgo
        </h1>
        <p className="text-xl text-accent font-medium">
          Your High-End Personal Trading Assistant
        </p>
        <div className="w-24 h-1 bg-gradient-primary mx-auto rounded-full opacity-60"></div>
      </div>

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-8 pr-4">
          {/* Purpose Section */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-accent">
                <Target className="w-6 h-6" />
                Our Purpose
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground leading-relaxed">
                StagAlgo is designed to help you trade smarter — by combining automation, market intelligence, and interactive explanations. It mirrors your portfolio through broker connections and helps you understand every decision made, without ever holding or managing your money.
              </p>
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <Eye className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  StagAlgo is not a broker or financial advisor, but an educational trading assistant and portfolio mirror.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* How It Works Section */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-accent">
                <BarChart3 className="w-6 h-6" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {steps.map((step, index) => (
                  <div key={index} className="relative">
                    {/* Connection Line */}
                    {index < steps.length - 1 && (
                      <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent opacity-30 z-0"></div>
                    )}
                    
                    <div className="relative z-10 text-center space-y-4">
                      <div className="mx-auto w-16 h-16 bg-gradient-card border border-primary/30 rounded-full flex items-center justify-center shadow-gold">
                        <step.icon className={`w-8 h-8 ${step.color}`} />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-accent">{step.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                      
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        Step {index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Why Use StagAlgo Section */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-accent">
                <TrendingUp className="w-6 h-6" />
                Why Use StagAlgo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-card border border-primary/30 rounded-lg flex items-center justify-center">
                        <benefit.icon className={`w-5 h-5 ${benefit.accent}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-accent">{benefit.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-13">
                      {benefit.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dual Purpose Section */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-accent">
                <Lightbulb className="w-6 h-6" />
                Trading + Education, Together
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-foreground leading-relaxed">
                StagAlgo's core attribute is scalable learning. It doesn't just automate trades — it adapts to your history, highlights your strengths, and trims your weaknesses. Over time, it becomes a personalized tutor that helps you understand the markets while working toward profitable outcomes.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span className="text-sm font-medium text-accent">Trading Focus</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                    <li>• Automated strategy execution</li>
                    <li>• Real-time risk management</li>
                    <li>• Portfolio optimization</li>
                    <li>• Performance tracking</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary-glow rounded-full"></div>
                    <span className="text-sm font-medium text-primary-glow">Educational Focus</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                    <li>• Trade rationale explanations</li>
                    <li>• Market pattern recognition</li>
                    <li>• Risk/reward education</li>
                    <li>• Strategy refinement</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator className="bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {/* Compliance & Disclaimer Section */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-primary">Legal Disclaimer</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    StagAlgo is an educational and portfolio-mirroring assistant. It does not provide financial advice, hold funds, or act as a broker. All trades occur through your connected brokerage account. You remain solely responsible for your investment decisions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}