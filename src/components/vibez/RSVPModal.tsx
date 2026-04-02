import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/vibez/ui/dialog';
import { Button } from '@/components/vibez/ui/button';
import { Input } from '@/components/vibez/ui/input';
import { Label } from '@/components/vibez/ui/label';
import { Textarea } from '@/components/vibez/ui/textarea';
import { Switch } from '@/components/vibez/ui/switch';

interface RSVPModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeName: string;
  onSubmit: (data: RSVPFormData) => void;
}

export interface RSVPFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  preferredTheme: string;
  howDidYouHear: string;
  allergiesPreferences: string;
  wantMatching: boolean;
  okayWithPhotos: boolean;
  instagramHandle: string;
}

const RSVPModal: React.FC<RSVPModalProps> = ({ isOpen, onClose, themeName, onSubmit }) => {
  const [formData, setFormData] = useState<RSVPFormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    preferredTheme: themeName,
    howDidYouHear: '',
    allergiesPreferences: '',
    wantMatching: false,
    okayWithPhotos: true,
    instagramHandle: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
    // Reset form
    setFormData({
      fullName: '',
      email: '',
      phoneNumber: '',
      preferredTheme: themeName,
      howDidYouHear: '',
      allergiesPreferences: '',
      wantMatching: false,
      okayWithPhotos: true,
      instagramHandle: ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-600">
            RSVP for {themeName}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              required
              value={formData.fullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phoneNumber: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="howDidYouHear">How did you hear about us?</Label>
            <Input
              id="howDidYouHear"
              value={formData.howDidYouHear}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, howDidYouHear: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="allergiesPreferences">Any allergies/preferences?</Label>
            <Textarea
              id="allergiesPreferences"
              value={formData.allergiesPreferences}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, allergiesPreferences: e.target.value})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="wantMatching">Would you like to be matched with someone?</Label>
            <Switch
              id="wantMatching"
              checked={formData.wantMatching}
              onCheckedChange={(checked: boolean) => setFormData({...formData, wantMatching: checked})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="okayWithPhotos">Are you okay with being photographed?</Label>
            <Switch
              id="okayWithPhotos"
              checked={formData.okayWithPhotos}
              onCheckedChange={(checked: boolean) => setFormData({...formData, okayWithPhotos: checked})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="instagramHandle">Drop your IG @ (Optional)</Label>
            <Input
              id="instagramHandle"
              placeholder="@yourhandle"
              value={formData.instagramHandle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, instagramHandle: e.target.value})}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600">
              Submit RSVP
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RSVPModal;
