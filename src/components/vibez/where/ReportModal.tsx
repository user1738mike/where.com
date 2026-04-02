import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/vibez/ui/dialog';
import { Button } from '@/components/vibez/ui/button';
import { Label } from '@/components/vibez/ui/label';
import { Textarea } from '@/components/vibez/ui/textarea';
import { AlertTriangle } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const reasons = [
    'Inappropriate behavior',
    'Harassment',
    'Spam or advertising',
    'Underage user',
    'Suspicious activity',
    'Other'
  ];

  const handleSubmit = () => {
    if (reason) {
      onSubmit(reason, details);
      setReason('');
      setDetails('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <DialogTitle>Report This User</DialogTitle>
              <DialogDescription>
                Help us keep the community safe
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-base font-semibold mb-3 block">
              What's the issue? *
            </Label>
            <div className="space-y-2">
              {reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    reason === r
                      ? 'border-where-coral bg-where-coral/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-4 h-4 text-where-coral"
                  />
                  <span className="text-sm font-medium">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="details" className="text-base font-semibold">
              Additional Details (Optional)
            </Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please provide more information about what happened..."
              className="mt-2 resize-none"
              rows={4}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <strong>What happens next:</strong>
              <br />
              • Chat will end immediately
              <br />
              • User will be temporarily blocked from matching with you
              <br />
              • Our team will review the report within 24 hours
              <br />
              • Serious violations result in account suspension
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason}
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
