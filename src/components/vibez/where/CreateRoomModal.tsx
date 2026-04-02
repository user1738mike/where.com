import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/vibez/ui/dialog";
import { Button } from "@/components/vibez/ui/button";
import { Input } from "@/components/vibez/ui/input";
import { Label } from "@/components/vibez/ui/label";
import { Textarea } from "@/components/vibez/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/vibez/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/vibez/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TOPICS = [
  { value: "fitness", label: "🏋️ Fitness", emoji: "🏋️" },
  { value: "cooking", label: "🍳 Cooking", emoji: "🍳" },
  { value: "technology", label: "💻 Technology", emoji: "💻" },
  { value: "gaming", label: "🎮 Gaming", emoji: "🎮" },
  { value: "music", label: "🎵 Music", emoji: "🎵" },
  { value: "movies", label: "🎬 Movies", emoji: "🎬" },
  { value: "reading", label: "📚 Reading", emoji: "📚" },
  { value: "gardening", label: "🌱 Gardening", emoji: "🌱" },
  { value: "pets", label: "🐾 Pets", emoji: "🐾" },
  { value: "parenting", label: "👶 Parenting", emoji: "👶" },
  { value: "business", label: "💼 Business", emoji: "💼" },
  { value: "art", label: "🎨 Art", emoji: "🎨" },
  { value: "sports", label: "⚽ Sports", emoji: "⚽" },
  { value: "general", label: "💬 General Chat", emoji: "💬" },
];

interface CreateRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomCreated: (roomId: string) => void;
}

const CreateRoomModal = ({
  open,
  onOpenChange,
  onRoomCreated,
}: CreateRoomModalProps) => {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("8");
  const [roomType, setRoomType] = useState<"public" | "private">("public");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !topic) {
      toast.error("Please enter a room name and select a topic");
      return;
    }

    setIsCreating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to create a room");
        return;
      }

      const { data, error } = await supabase.functions.invoke("manage-room", {
        body: {
          action: "create",
          name: name.trim(),
          topic,
          description: description.trim() || null,
          max_participants: parseInt(maxParticipants),
          room_type: roomType,
        },
      });

      if (error) throw error;
      if (!data?.room?.id) {
        toast.error(
          "Room was created but no room ID returned. Please try again.",
        );
        return;
      }

      toast.success(
        `${roomType === "private" ? "Private" : "Public"} room created!`,
      );
      onRoomCreated(data.room.id);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Failed to create room:", error, JSON.stringify(error));
      const msg =
        error?.message ||
        error?.context?.message ||
        "Failed to create room. Please try again.";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName("");
    setTopic("");
    setDescription("");
    setMaxParticipants("8");
    setRoomType("public");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Create Group Room
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                placeholder="e.g., Morning Fitness Chat"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="h-9 px-2 py-1.5 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="topic">Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className="h-9 px-2 py-1.5 text-sm">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="max-participants">Max Participants</Label>
              <Select
                value={maxParticipants}
                onValueChange={setMaxParticipants}
              >
                <SelectTrigger className="h-9 px-2 py-1.5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} people
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room Type</Label>
              <RadioGroup
                className="grid gap-2"
                value={roomType}
                onValueChange={(value) =>
                  setRoomType(value as "public" | "private")
                }
              >
                <div className="flex items-start gap-2 rounded-lg border border-border p-2 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="cursor-pointer flex-1 m-0">
                    <div className="font-medium">🌐 Public Room</div>
                    <div className="text-sm text-muted-foreground">
                      Anyone can join instantly
                    </div>
                  </Label>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-border p-2 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="private" id="private" />
                  <Label
                    htmlFor="private"
                    className="cursor-pointer flex-1 m-0"
                  >
                    <div className="font-medium">🔒 Private Room</div>
                    <div className="text-sm text-muted-foreground">
                      You approve who joins
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What's this room about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={2}
                className="min-h-[54px] px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-gradient-to-r from-where-coral to-where-teal text-white"
          >
            {isCreating ? "Creating..." : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomModal;
