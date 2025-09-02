import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Check, Building2 } from 'lucide-react';
import { WORKSPACE_TYPE_OPTIONS, WorkspaceType } from '@/types/workspace';
import { ConfirmWorkspaceModal } from './ConfirmWorkspaceModal';

interface WorkspaceTypeSelectProps {
  onComplete: () => void;
}

export function WorkspaceTypeSelect({ onComplete }: WorkspaceTypeSelectProps) {
  const [selectedType, setSelectedType] = useState<WorkspaceType | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [isValidName, setIsValidName] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { toast } = useToast();

  // Validation rules
  const validateName = (name: string): boolean => {
    if (!name.trim()) return false;
    
    // Check length and format
    const formatValid = /^[A-Za-z0-9][A-Za-z0-9 _\-]{1,63}$/.test(name);
    if (!formatValid) return false;
    
    // Check for reserved words
    const reservedWords = ['owner', 'admin', 'root', 'personal', 'business', 'team'];
    const isReserved = reservedWords.some(word => 
      word.toLowerCase() === name.toLowerCase()
    );
    
    return !isReserved;
  };

  const handleTypeSelect = (type: WorkspaceType) => {
    setSelectedType(type);
    
    // Auto-fill name based on selection
    const option = WORKSPACE_TYPE_OPTIONS.find(opt => opt.type === type);
    if (option) {
      setWorkspaceName(option.defaultName);
      setIsValidName(validateName(option.defaultName));
    }
  };

  const handleNameChange = (value: string) => {
    setWorkspaceName(value);
    setIsValidName(validateName(value));
  };

  const handleVerify = () => {
    if (!selectedType || !isValidName || !workspaceName.trim()) {
      toast({
        title: "Incomplete Selection",
        description: "Please select a workspace type and provide a valid name.",
        variant: "destructive",
      });
      return;
    }
    
    setShowConfirmModal(true);
  };

  const selectedOption = WORKSPACE_TYPE_OPTIONS.find(opt => opt.type === selectedType);
  const canVerify = selectedType && isValidName && workspaceName.trim();

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Choose Your Workspace Type</h1>
            <p className="text-muted-foreground">
              Select the workspace type that best fits your trading needs
            </p>
          </div>

          {/* Workspace Type Bubbles */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Workspace Type</Label>
            <div className="grid gap-4">
              {WORKSPACE_TYPE_OPTIONS.map((option) => {
                const isSelected = selectedType === option.type;
                
                return (
                  <Card
                    key={option.type}
                    className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-lg' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleTypeSelect(option.type)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-foreground">
                            {option.label}
                          </h3>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {option.caption}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Workspace Name Input */}
          <div className="space-y-3">
            <Label htmlFor="workspace-name" className="text-base font-medium">
              Workspace Name
            </Label>
            <Input
              id="workspace-name"
              type="text"
              placeholder="Enter workspace name"
              value={workspaceName}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`bg-background/50 ${
                !isValidName && workspaceName 
                  ? 'border-destructive focus:border-destructive' 
                  : ''
              }`}
              maxLength={64}
            />
            {!isValidName && workspaceName && (
              <p className="text-sm text-destructive">
                Please choose a descriptive name (2–64 letters/numbers). Reserved words aren't allowed.
              </p>
            )}
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={!canVerify}
            className="w-full bg-gradient-primary hover:opacity-90 disabled:opacity-50"
            size="lg"
          >
            Verify
          </Button>
        </Card>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedOption && (
        <ConfirmWorkspaceModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          workspaceType={selectedOption}
          workspaceName={workspaceName}
          onConfirm={onComplete}
        />
      )}
    </>
  );
}